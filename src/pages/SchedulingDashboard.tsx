import React, { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Bot, CheckCircle, AlertTriangle } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { generateScheduleWithAI } from '@/lib/scheduling';
import { useToast } from '@/hooks/use-toast';

export default function SchedulingDashboard() {
  const { state, dispatch } = useApp();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateSchedule = async () => {
    if (!state.business || state.staff.length === 0) {
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
      const staffAvailability = state.staff.reduce((acc, s) => {
        acc[s.id] = s.availability;
        return acc;
      }, {} as Record<string, any>);

      const response = await generateScheduleWithAI({
        businessId: state.business.id,
        weekStartDate,
        staffAvailability,
        businessHours: state.business.businessHours,
        roles: state.business.roles,
        constraints: {
          maxHoursPerDay: 8,
          maxHoursPerWeek: 40,
          minStaffPerRole: state.business.roles.reduce((acc, r) => {
            acc[r.id] = r.minStaffRequired;
            return acc;
          }, {} as Record<string, number>),
          maxStaffPerRole: state.business.roles.reduce((acc, r) => {
            acc[r.id] = r.maxStaffAllowed;
            return acc;
          }, {} as Record<string, number>),
        },
        timeOffRequests: state.timeOffRequests
      });

      if (response.success) {
        const newSchedule = {
          id: `schedule-${Date.now()}`,
          businessId: state.business.id,
          weekStartDate,
          shifts: response.schedule,
          status: 'DRAFT' as const,
          generatedBy: 'AI' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        dispatch({ type: 'ADD_SCHEDULE', payload: newSchedule });
        
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
          
          <Button 
            onClick={handleGenerateSchedule} 
            variant="gradient" 
            disabled={isGenerating}
          >
            <Bot className="h-4 w-4 mr-2" />
            {isGenerating ? 'Generating...' : 'Generate Schedule'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <CheckCircle className="h-8 w-8 text-success" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{state.schedules.length}</p>
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
                    {state.schedules.reduce((total, s) => total + s.shifts.length, 0)}
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

        {state.schedules.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Recent Schedules</CardTitle>
              <CardDescription>View and manage your generated schedules</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {state.schedules.slice(0, 5).map((schedule) => (
                  <div key={schedule.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div>
                      <h4 className="font-medium">
                        Week of {schedule.weekStartDate.toLocaleDateString()}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {schedule.shifts.length} shifts • {schedule.status}
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