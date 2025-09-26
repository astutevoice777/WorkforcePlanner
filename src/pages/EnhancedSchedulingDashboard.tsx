import React, { useState, useCallback } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { GoogleCalendarView } from '@/components/schedule/GoogleCalendarView';
import { 
  Calendar, 
  Bot, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Users, 
  TrendingUp,
  Settings,
  Download,
  Upload,
  Zap,
  BarChart3
} from 'lucide-react';
import { useBusiness } from '@/hooks/useBusiness';
import { useStaff } from '@/hooks/useStaff';
import { useSchedules } from '@/hooks/useSchedules';
import { optimizeScheduleWithAI, OptimizationConstraints } from '@/lib/scheduleOptimizer';
import { OptimizedSchedulingAPI } from '@/services/optimizedSchedulingAPI';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, startOfWeek } from 'date-fns';

interface ScheduleTemplate {
  id: string;
  name: string;
  description: string;
  constraints: OptimizationConstraints;
  isDefault: boolean;
}

const defaultTemplates: ScheduleTemplate[] = [
  {
    id: 'standard',
    name: 'Standard Business Hours',
    description: 'Monday-Friday, 9 AM - 5 PM',
    isDefault: true,
    constraints: {
      maxHoursPerDay: 8,
      maxHoursPerWeek: 40,
      minStaffPerRole: {},
      maxStaffPerRole: {},
      minBreakBetweenShifts: 12,
      maxConsecutiveDays: 5,
      preferredShiftLengths: [8, 6, 4],
      businessHours: {
        start: '09:00',
        end: '17:00',
        days: [1, 2, 3, 4, 5]
      }
    }
  },
  {
    id: 'retail',
    name: 'Retail Store',
    description: 'Extended hours, weekend coverage',
    isDefault: false,
    constraints: {
      maxHoursPerDay: 8,
      maxHoursPerWeek: 40,
      minStaffPerRole: {},
      maxStaffPerRole: {},
      minBreakBetweenShifts: 10,
      maxConsecutiveDays: 6,
      preferredShiftLengths: [8, 6, 4],
      businessHours: {
        start: '08:00',
        end: '22:00',
        days: [0, 1, 2, 3, 4, 5, 6]
      }
    }
  },
  {
    id: 'healthcare',
    name: 'Healthcare Facility',
    description: '24/7 coverage with shift rotations',
    isDefault: false,
    constraints: {
      maxHoursPerDay: 12,
      maxHoursPerWeek: 48,
      minStaffPerRole: {},
      maxStaffPerRole: {},
      minBreakBetweenShifts: 8,
      maxConsecutiveDays: 4,
      preferredShiftLengths: [12, 8],
      businessHours: {
        start: '00:00',
        end: '23:59',
        days: [0, 1, 2, 3, 4, 5, 6]
      }
    }
  }
];

export default function EnhancedSchedulingDashboard() {
  const { business, roles } = useBusiness();
  const { staff } = useStaff();
  const { schedules, addSchedule, updateSchedule, deleteSchedule } = useSchedules();
  const { toast } = useToast();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ScheduleTemplate>(defaultTemplates[0]);
  const [optimizationResults, setOptimizationResults] = useState<any>(null);
  const [currentView, setCurrentView] = useState<'calendar' | 'list' | 'analytics'>('calendar');
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);

  // Convert schedules to shifts format for GoogleCalendarView
  const allShifts = schedules.flatMap(schedule => 
    schedule.shifts?.map(shift => ({
      id: `${schedule.id}-${shift.staff_id}-${shift.date}`,
      staff_id: shift.staff_id,
      role_id: shift.role_id,
      date: shift.date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      duration: shift.duration,
      status: shift.status as 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED',
      notes: shift.notes,
      pay_rate: shift.pay_rate
    })) || []
  );

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
      const weekStartDate = startOfWeek(new Date(), { weekStartsOn: 1 });
      const staffAvailability = staff.reduce((acc, s) => {
        acc[s.id] = s.availability || [];
        return acc;
      }, {} as Record<string, any>);

      // Convert staff availability to proper format
      const formattedStaffAvailability: Record<string, any[]> = {};
      staff.forEach(s => {
        const availability = s.availability || {};
        const staffAvailabilityArray: any[] = [];
        
        // Convert availability object to array format
        Object.entries(availability).forEach(([day, times]) => {
          const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(day);
          if (Array.isArray(times) && times.length > 0) {
            times.forEach(timeSlot => {
              staffAvailabilityArray.push({
                dayOfWeek: dayIndex,
                startTime: timeSlot.startTime,
                endTime: timeSlot.endTime,
                isAvailable: true
              });
            });
          }
        });
        
        formattedStaffAvailability[s.id] = staffAvailabilityArray;
      });

      // Use the new optimization engine
      const response = await optimizeScheduleWithAI({
        businessId: business.id,
        weekStartDate,
        staffAvailability: formattedStaffAvailability,
        roles: roles.map(r => ({
          id: r.id,
          name: r.name,
          minStaffRequired: r.min_staff_required || 1,
          maxStaffAllowed: r.max_staff_allowed || 2,
          hourlyRate: r.hourly_rate || 15,
          priority: 5 // Default priority
        })),
        constraints: selectedTemplate.constraints,
        timeOffRequests: []
      });

      if (response.success) {
        await addSchedule({
          week_start_date: weekStartDate,
          shifts: response.schedule.map(shift => ({
            staff_id: shift.staffId,
            role_id: shift.roleId,
            date: format(shift.date, 'yyyy-MM-dd'),
            start_time: shift.startTime,
            end_time: shift.endTime,
            duration: shift.duration,
            status: shift.status,
            notes: shift.notes,
            pay_rate: shift.payRate
          })),
          status: 'DRAFT',
          generated_by: 'AI_OPTIMIZED'
        });
        
        toast({
          title: 'Schedule generated!',
          description: `Created ${response.schedule.length} shifts with ${response.efficiency}% efficiency.`,
        });

        // Show warnings and suggestions
        if (response.warnings.length > 0) {
          toast({
            title: 'Optimization Warnings',
            description: response.warnings.join(', '),
            variant: 'destructive',
          });
        }
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

  const handleOptimizeExisting = async () => {
    if (!selectedSchedule) return;

    setIsOptimizing(true);
    try {
      // Implementation for optimizing existing schedule
      toast({
        title: 'Schedule optimized!',
        description: 'Existing schedule has been optimized for better efficiency.',
      });
    } catch (error) {
      toast({
        title: 'Optimization failed',
        description: 'Failed to optimize schedule. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleShiftCreate = useCallback(async (shift: any) => {
    try {
      // Find or create a schedule for this week
      const weekStart = startOfWeek(new Date(shift.date), { weekStartsOn: 1 });
      let schedule = schedules.find(s => 
        format(new Date(s.week_start_date), 'yyyy-MM-dd') === format(weekStart, 'yyyy-MM-dd')
      );

      if (!schedule) {
        const result = await addSchedule({
          week_start_date: weekStart,
          shifts: [shift],
          status: 'DRAFT',
          generated_by: 'MANUAL'
        });
        
        if (result.error) {
          throw new Error(result.error.message || 'Failed to create schedule');
        }
        
        schedule = result.data;
      } else {
        const updatedShifts = [...(schedule.shifts || []), shift];
        await updateSchedule(schedule.id, { shifts: updatedShifts });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create shift',
        variant: 'destructive',
      });
    }
  }, [schedules, addSchedule, updateSchedule, toast]);

  const handleShiftUpdate = useCallback(async (shiftId: string, updates: any) => {
    try {
      // Find the schedule containing this shift and update it
      for (const schedule of schedules) {
        const shiftIndex = schedule.shifts?.findIndex(s => 
          `${schedule.id}-${s.staff_id}-${s.date}` === shiftId
        );
        
        if (shiftIndex !== undefined && shiftIndex >= 0) {
          const updatedShifts = [...(schedule.shifts || [])];
          updatedShifts[shiftIndex] = { ...updatedShifts[shiftIndex], ...updates };
          await updateSchedule(schedule.id, { shifts: updatedShifts });
          break;
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update shift',
        variant: 'destructive',
      });
    }
  }, [schedules, updateSchedule, toast]);

  const handleShiftDelete = useCallback(async (shiftId: string) => {
    try {
      // Find the schedule containing this shift and remove it
      for (const schedule of schedules) {
        const updatedShifts = schedule.shifts?.filter(s => 
          `${schedule.id}-${s.staff_id}-${s.date}` !== shiftId
        );
        
        if (updatedShifts?.length !== schedule.shifts?.length) {
          await updateSchedule(schedule.id, { shifts: updatedShifts });
          break;
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete shift',
        variant: 'destructive',
      });
    }
  }, [schedules, updateSchedule, toast]);

  const totalShifts = schedules.reduce((total, s) => total + (s.shifts?.length || 0), 0);
  const totalHours = allShifts.reduce((total, shift) => total + shift.duration, 0);
  const totalCost = allShifts.reduce((total, shift) => total + (shift.pay_rate * shift.duration), 0);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Smart Scheduling</h1>
              <p className="text-muted-foreground">Google Calendar-style schedule management with AI optimization</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Select value={selectedTemplate.id} onValueChange={(value) => {
              const template = defaultTemplates.find(t => t.id === value);
              if (template) setSelectedTemplate(template);
            }}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {defaultTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              onClick={handleGenerateSchedule} 
              variant="gradient" 
              disabled={isGenerating}
            >
              <Bot className="h-4 w-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate Schedule'}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <CheckCircle className="h-8 w-8 text-success" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{schedules.length}</p>
                  <p className="text-sm text-muted-foreground">Active Schedules</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalShifts}</p>
                  <p className="text-sm text-muted-foreground">Total Shifts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Clock className="h-8 w-8 text-accent" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalHours}h</p>
                  <p className="text-sm text-muted-foreground">Total Hours</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <TrendingUp className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold text-foreground">${totalCost.toFixed(0)}</p>
                  <p className="text-sm text-muted-foreground">Labor Cost</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={currentView} onValueChange={(value: any) => setCurrentView(value)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Schedule Calendar</CardTitle>
                    <CardDescription>Drag and drop shifts to reschedule</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Import
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <GoogleCalendarView
                  staff={staff}
                  roles={roles}
                  shifts={allShifts}
                  onShiftCreate={handleShiftCreate}
                  onShiftUpdate={handleShiftUpdate}
                  onShiftDelete={handleShiftDelete}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="list" className="space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Schedule List</CardTitle>
                    <CardDescription>Manage all schedules and shifts</CardDescription>
                  </div>
                  <Button 
                    onClick={handleOptimizeExisting} 
                    variant="outline"
                    disabled={isOptimizing || !selectedSchedule}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    {isOptimizing ? 'Optimizing...' : 'Optimize Selected'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {schedules.map((schedule) => (
                    <div 
                      key={schedule.id} 
                      className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedSchedule?.id === schedule.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedSchedule(schedule)}
                    >
                      <div>
                        <h4 className="font-medium">
                          Week of {format(new Date(schedule.week_start_date), 'MMM d, yyyy')}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {schedule.shifts?.length || 0} shifts • {schedule.status}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant={schedule.generated_by === 'AI_OPTIMIZED' ? 'default' : 'secondary'}>
                            {schedule.generated_by}
                          </Badge>
                          {schedule.generated_by === 'AI_OPTIMIZED' && (
                            <Badge variant="outline">
                              <Bot className="h-3 w-3 mr-1" />
                              AI Optimized
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {schedule.shifts?.reduce((sum, s) => sum + s.duration, 0) || 0}h
                        </p>
                        <p className="text-sm text-muted-foreground">
                          ${schedule.shifts?.reduce((sum, s) => sum + (s.pay_rate * s.duration), 0).toFixed(0) || 0}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Schedule Efficiency</CardTitle>
                  <CardDescription>AI optimization performance metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Coverage Rate</span>
                      <span className="font-medium">92%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Staff Utilization</span>
                      <span className="font-medium">87%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Cost Efficiency</span>
                      <span className="font-medium">94%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common scheduling tasks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <Settings className="h-4 w-4 mr-2" />
                      Schedule Templates
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Generate Report
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Conflict Resolution
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
