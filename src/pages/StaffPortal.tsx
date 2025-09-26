import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, DollarSign, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

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
}

export default function StaffPortal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStaffData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Find staff record by email (assuming staff email matches user email)
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('email', user.email)
        .single();

      if (staffError) {
        console.error('Staff not found:', staffError);
        return;
      }

      setStaff(staffData);

      // Fetch upcoming shifts for this staff member
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select(`
          *,
          role:role_id (
            name,
            color
          )
        `)
        .eq('staff_id', staffData.id)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(10);

      if (shiftsError) throw shiftsError;
      setShifts(shiftsData || []);
    } catch (error: any) {
      console.error('Error fetching staff data:', error);
      toast({
        title: 'Error loading data',
        description: 'Failed to load your schedule data',
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

  useEffect(() => {
    fetchStaffData();
  }, [user]);

  if (!staff) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Staff Access Required</h2>
            <p className="text-muted-foreground mt-2">
              You need to be added as staff by a business owner to access this portal.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Welcome, {staff.name}!</h1>
          <p className="text-muted-foreground">
            Here's your schedule overview and upcoming shifts
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
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
                        <Badge variant="outline" className="mt-1">
                          {shift.role.name}
                        </Badge>
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
      </div>
    </Layout>
  );
}