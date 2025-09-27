import { useState, useEffect } from 'react';
import { StaffLayout } from '@/components/layout/StaffLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Plus, Clock, CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { staffDatabaseService } from '@/services/staffDatabaseService';

interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  is_partial_day: boolean;
  reason: string | null;
  status: string;
  requested_at: string;
  reviewed_at: string | null;
  reviewer_notes: string | null;
}

export default function StaffTimeOff() {
  const { staffUser } = useStaffAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    leave_type: 'vacation',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    is_partial_day: false,
    reason: '',
  });

  const fetchLeaveRequests = async () => {
    if (!staffUser) return;
    
    try {
      const result = await staffDatabaseService.getStaffLeaveRequests(staffUser.staff_id, 20);
      if (result.error) {
        throw new Error(result.error);
      }
      setRequests(result.data || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error loading data',
        description: error.message || 'Failed to load your leave requests',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffUser) return;

    setLoading(true);
    try {
      const requestData: any = {
        staff_id: staffUser.staff_id,
        leave_type: formData.leave_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_partial_day: formData.is_partial_day,
        reason: formData.reason || null,
      };

      if (formData.is_partial_day) {
        requestData.start_time = formData.start_time;
        requestData.end_time = formData.end_time;
      }

      // Try using the enhanced database function first
      const result = await staffDatabaseService.createLeaveRequestWithFunction(
        staffUser.email,
        requestData
      );
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create leave request');
      }

      toast({
        title: 'Request submitted',
        description: 'Your leave request has been submitted for review.',
      });

      setFormData({
        leave_type: 'vacation',
        start_date: '',
        end_date: '',
        start_time: '',
        end_time: '',
        is_partial_day: false,
        reason: '',
      });
      setIsDialogOpen(false);
      fetchLeaveRequests();
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast({
        title: 'Error submitting request',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'APPROVED' ? 'default' : status === 'REJECTED' ? 'destructive' : 'secondary';
    return <Badge variant={variant}>{status}</Badge>;
  };

  useEffect(() => {
    fetchLeaveRequests();
  }, [staffUser]);

  if (!staffUser) {
    return (
      <StaffLayout>
        <div className="p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Staff Access Required</h2>
            <p className="text-muted-foreground mt-2">
              You need to be added as staff by a business owner to access this page.
            </p>
          </div>
        </div>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/staff-portal">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Portal
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Time Off Requests</h1>
              <p className="text-muted-foreground">
                Submit and track your time off requests
              </p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Submit Time Off Request</DialogTitle>
                <DialogDescription>
                  Fill out the form below to request time off
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="leave_type">Leave Type</Label>
                  <Select
                    value={formData.leave_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, leave_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacation">Vacation</SelectItem>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                      <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_partial_day"
                    checked={formData.is_partial_day}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_partial_day: !!checked }))}
                  />
                  <Label htmlFor="is_partial_day">Partial day (specify times)</Label>
                </div>

                {formData.is_partial_day && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_time">Start Time</Label>
                      <Input
                        id="start_time"
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_time">End Time</Label>
                      <Input
                        id="end_time"
                        type="time"
                        value={formData.end_time}
                        onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason (Optional)</Label>
                  <Textarea
                    id="reason"
                    placeholder="Provide additional details about your request..."
                    value={formData.reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                    rows={3}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Leave Requests</CardTitle>
            <CardDescription>
              Track the status of your submitted time off requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No requests yet</h3>
                <p className="text-muted-foreground mb-4">
                  You haven't submitted any time off requests yet.
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Submit Your First Request
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(request.status)}
                      <div>
                        <div className="font-semibold">
                          {request.leave_type.charAt(0).toUpperCase() + request.leave_type.slice(1)} Leave
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                          {request.is_partial_day && request.start_time && request.end_time && (
                            <span className="ml-2">
                              ({request.start_time} - {request.end_time})
                            </span>
                          )}
                        </div>
                        {request.reason && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {request.reason}
                          </div>
                        )}
                        {request.reviewer_notes && (
                          <div className="text-xs text-blue-600 mt-1">
                            Manager note: {request.reviewer_notes}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(request.status)}
                      <div className="text-xs text-muted-foreground mt-1">
                        Requested: {new Date(request.requested_at).toLocaleDateString()}
                      </div>
                      {request.reviewed_at && (
                        <div className="text-xs text-muted-foreground">
                          Reviewed: {new Date(request.reviewed_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StaffLayout>
  );
}
