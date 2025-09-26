import React, { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Bot, CheckCircle, AlertTriangle } from 'lucide-react';
import { useBusiness } from '@/hooks/useBusiness';
import { useStaff } from '@/hooks/useStaff';
import { useSchedules } from '@/hooks/useSchedules';
import { generateScheduleWithAI } from '@/lib/scheduling';
import { useToast } from '@/hooks/use-toast';
import { ScheduleQuickActions } from '@/components/schedule/QuickActions';

export default function SchedulingDashboard() {
  const { business, roles } = useBusiness();
  const { staff } = useStaff();
  const { schedules, addSchedule } = useSchedules();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateSchedule = async () => {
    if (!business || staff.length === 0) {
      toast({
        title: 'Setup required',
        description: 'Please complete business setup and add staff first.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const weekStartDate = new Date();
      const staffAvailability = staff.reduce((acc, s) => {
        acc[s.id] = s.availability;
        return acc;
      }, {} as Record<string, any>);

      const response = await generateScheduleWithAI({
        businessId: business.id,
        weekStartDate,
        staffAvailability,
        businessHours: business.business_hours,
        roles: roles.map(r => ({
          id: r.id,
          name: r.name,
          description: r.description,
          hourlyRate: r.hourly_rate,
          minStaffRequired: r.min_staff_required,
          maxStaffAllowed: r.max_staff_allowed,
          color: r.color
        })),
        constraints: {
          maxHoursPerDay: 8,
          maxHoursPerWeek: 40,
          minStaffPerRole: roles.reduce((acc, r) => {
            acc[r.id] = r.min_staff_required;
            return acc;
          }, {} as Record<string, number>),
          maxStaffPerRole: roles.reduce((acc, r) => {
            acc[r.id] = r.max_staff_allowed;
            return acc;
          }, {} as Record<string, number>),
        },
        timeOffRequests: []
      });

      if (response.success) {
        await addSchedule({
          week_start_date: weekStartDate,
          shifts: response.schedule.map(shift => ({
            staff_id: shift.staffId,
            role_id: shift.roleId,
            date: shift.date.toISOString().split('T')[0],
            start_time: shift.startTime,
            end_time: shift.endTime,
            duration: shift.duration,
            status: shift.status,
            notes: shift.notes,
            pay_rate: shift.payRate
          })),
          status: 'DRAFT',
          generated_by: 'AI'
        });
        
        toast({
          title: 'Schedule generated!',
          description: `Created ${response.schedule.length} shifts with ${response.efficiency}% efficiency.`,
        });
      }
    } catch (error) {
      toast({
        title: 'Generation failed',
        description: 'Failed to generate schedule. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">AI Scheduling</h1>
              <p className="text-muted-foreground">Generate optimized schedules with AI</p>
            </div>
          </div>
          
          <ScheduleQuickActions 
            hasSchedules={schedules.length > 0}
            onGenerateSchedule={handleGenerateSchedule}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <CheckCircle className="h-8 w-8 text-success" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{schedules.length}</p>
                  <p className="text-sm text-muted-foreground">Generated Schedules</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Calendar className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {schedules.reduce((total, s) => total + (s.shifts?.length || 0), 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Shifts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Bot className="h-8 w-8 text-accent" />
                <div>
                  <p className="text-2xl font-bold text-foreground">AI</p>
                  <p className="text-sm text-muted-foreground">Powered Optimization</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {schedules.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Recent Schedules</CardTitle>
              <CardDescription>View and manage your generated schedules</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {schedules.slice(0, 5).map((schedule) => (
                  <div key={schedule.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div>
                      <h4 className="font-medium">
                        Week of {new Date(schedule.week_start_date).toLocaleDateString()}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {schedule.shifts?.length || 0} shifts • {schedule.status}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}