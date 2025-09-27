import { useState, useEffect } from 'react';
import { StaffLayout } from '@/components/layout/StaffLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, DollarSign, User, Plus, FileText, CalendarDays, LogOut, AlertCircle } from 'lucide-react';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { createTestShifts } from '@/utils/createTestData';
import { staffDatabaseService } from '@/services/staffDatabaseService';

interface Staff {
  id: string;
  name: string;
  email: string;
  business_id: string;
}

interface Shift {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  duration: number;
  pay_rate: number | null;
  status: string;
  notes: string | null;
  role: {
    name: string;
    color: string;
  };
  schedule: {
    generated_by: string;
    status: string;
  };
}

export default function StaffPortal() {
  const { staffUser, signOut } = useStaffAuth();
  const { toast } = useToast();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStaffData = async () => {
    if (!staffUser) return;
    
    setLoading(true);
    try {
      // Test database connection first
      const connectionTest = await staffDatabaseService.testConnection();
      if (!connectionTest.success) {
        throw new Error(connectionTest.error || 'Database connection failed');
      }

      // Try to get comprehensive dashboard data using the database function
      const dashboardResult = await staffDatabaseService.getStaffDashboardData(staffUser.email);
      
      if (dashboardResult.data && !dashboardResult.error) {
        // Use comprehensive data from database function
        const { staff: staffData, shifts: shiftsData, leave_requests: leaveData } = dashboardResult.data;
        
        if (staffData) {
          setStaff({
            id: staffData.id,
            name: staffData.name,
            email: staffData.email,
            business_id: staffData.business_id
          });
        }
        
        console.log('Fetched comprehensive dashboard data:', dashboardResult.data);
        setShifts(shiftsData || []);
        setLeaveRequests(leaveData || []);
      } else {
        // Fallback to individual queries
        console.warn('Dashboard function failed, using fallback:', dashboardResult.error);
        
        // Get staff record
        const staffResult = await staffDatabaseService.getStaffById(staffUser.staff_id);
        if (staffResult.error) {
          throw new Error(staffResult.error);
        }
        
        if (staffResult.data) {
          setStaff({
            id: staffResult.data.id,
            name: staffResult.data.name,
            email: staffResult.data.email,
            business_id: staffResult.data.business_id
          });
        }

        // Fetch upcoming shifts with enhanced query
        const shiftsResult = await staffDatabaseService.getStaffShifts(staffUser.staff_id, 20);
        if (shiftsResult.error) {
          console.warn('Error fetching shifts:', shiftsResult.error);
        } else {
          console.log('Fetched shifts with schedule info:', shiftsResult.data);
          setShifts(shiftsResult.data || []);
        }

        // Fetch recent leave requests
        const leaveResult = await staffDatabaseService.getStaffLeaveRequests(staffUser.staff_id, 10);
        if (leaveResult.error) {
          console.warn('Error fetching leave requests:', leaveResult.error);
        } else {
          setLeaveRequests(leaveResult.data || []);
        }
      }
    } catch (error: any) {
      console.error('Error fetching staff data:', error);
      toast({
        title: 'Error loading data',
        description: error.message || 'Failed to load your schedule data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateWeeklyHours = () => {
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const endOfWeek = new Date(today.setDate(startOfWeek.getDate() + 6));

    return shifts
      .filter(shift => {
        const shiftDate = new Date(shift.date);
        return shiftDate >= startOfWeek && shiftDate <= endOfWeek;
      })
      .reduce((total, shift) => total + shift.duration, 0);
  };

  const upcomingShifts = shifts.slice(0, 5);
  const weeklyHours = calculateWeeklyHours();

  const handleCreateTestData = async () => {
    if (!staff || !staffUser) return;
    
    try {
      // Get staff roles first
      const rolesResult = await staffDatabaseService.getStaffRoles(staffUser.staff_id);
      
      if (rolesResult.error || rolesResult.data.length === 0) {
        toast({
          title: 'No roles found',
          description: 'You need to be assigned a role before test data can be created',
          variant: 'destructive',
        });
        return;
      }
      
      await createTestShifts(staff.business_id, staffUser.staff_id, rolesResult.data[0].id);
      toast({
        title: 'Test data created',
        description: 'Test shifts have been created for debugging',
      });
      fetchStaffData(); // Refresh data
    } catch (error: any) {
      console.error('Error creating test data:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create test data',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, [staffUser]);

  if (!staffUser) {
    return (
      <StaffLayout>
        <div className="p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Staff Access Required</h2>
            <p className="text-muted-foreground mt-2">
              You need to be added as staff by a business owner to access this portal.
            </p>
          </div>
        </div>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Welcome, {staffUser.name}!</h1>
            <p className="text-muted-foreground">
              Here's your schedule overview and upcoming shifts
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/staff-portal/time-off">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Request Leave
              </Button>
            </Link>
            {/* Temporary test button - remove in production */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCreateTestData}
            >
              Create Test Data
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                signOut();
                window.location.href = '/staff-auth';
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Shifts</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingShifts.length}</div>
              <p className="text-xs text-muted-foreground">
                Next 5 scheduled shifts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{weeklyHours.toFixed(1)} hrs</div>
              <p className="text-xs text-muted-foreground">
                Total scheduled hours
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leave Requests</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{leaveRequests.length}</div>
              <p className="text-xs text-muted-foreground">
                Recent requests
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Weekly Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${shifts
                  .filter(shift => {
                    const shiftDate = new Date(shift.date);
                    const today = new Date();
                    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
                    const endOfWeek = new Date(today.setDate(startOfWeek.getDate() + 6));
                    return shiftDate >= startOfWeek && shiftDate <= endOfWeek;
                  })
                  .reduce((total, shift) => total + (shift.pay_rate ? shift.pay_rate * shift.duration : 0), 0)
                  .toFixed(2)
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Estimated earnings
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>My Schedule</CardTitle>
            <CardDescription>
              Your upcoming shifts and assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : upcomingShifts.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No upcoming shifts</h3>
                <p className="text-muted-foreground">
                  Your schedule will appear here when shifts are assigned.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingShifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className="w-3 h-8 rounded"
                        style={{ backgroundColor: shift.role.color }}
                      />
                      <div>
                        <div className="font-semibold">
                          {new Date(shift.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {shift.start_time} - {shift.end_time} ({shift.duration}h)
                        </div>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline">
                            {shift.role.name}
                          </Badge>
                          <Badge 
                            variant={
                              shift.schedule.generated_by === 'MANUAL' ? 'secondary' : 
                              shift.schedule.generated_by === 'N8N_AI' ? 'default' :
                              shift.schedule.generated_by === 'AI' ? 'default' : 'outline'
                            } 
                            className="text-xs"
                          >
                            {shift.schedule.generated_by === 'MANUAL' ? 'Manual' : 
                             shift.schedule.generated_by === 'N8N_AI' ? 'n8n + AI' :
                             shift.schedule.generated_by === 'AI' ? 'AI Generated' : 
                             shift.schedule.generated_by || 'System'}
                          </Badge>
                          {shift.schedule.status && (
                            <Badge variant="outline" className="text-xs">
                              {shift.schedule.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {shift.pay_rate ? `$${(shift.pay_rate * shift.duration).toFixed(2)}` : 'TBD'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Est. pay
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {leaveRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Leave Requests</CardTitle>
              <CardDescription>
                Your recent time-off requests and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaveRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <CalendarDays className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-semibold">
                          {request.leave_type.charAt(0).toUpperCase() + request.leave_type.slice(1)} Leave
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                        </div>
                        {request.reason && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {request.reason}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={
                          request.status === 'APPROVED' ? 'default' : 
                          request.status === 'REJECTED' ? 'destructive' : 
                          'secondary'
                        }
                      >
                        {request.status}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(request.requested_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </StaffLayout>
  );
}