import React, { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  Bot, 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign, 
  Users, 
  TrendingUp,
  AlertTriangle,
  Loader2,
  Eye,
  CalendarPlus,
  Sparkles
} from 'lucide-react';
import { useBusiness } from '@/hooks/useBusiness';
import { useToast } from '@/hooks/use-toast';
import { openaiSchedulingService, SchedulingResponse, OptimizedShift } from '@/services/openaiSchedulingService';
import { googleCalendarService } from '@/services/googleCalendarService';
import { schedulingDataService } from '@/services/schedulingDataService';

export default function AISchedulingDashboard() {
  const { business } = useBusiness();
  const { toast } = useToast();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);
  const [isSyncingToCalendar, setIsSyncingToCalendar] = useState(false);
  const [schedulingResponse, setSchedulingResponse] = useState<SchedulingResponse | null>(null);
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
    const today = new Date();
    const monday = new Date(today.setDate(today.getDate() - today.getDay() + 1));
    return monday.toISOString().split('T')[0];
  });
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [scheduleAccepted, setScheduleAccepted] = useState(false);

  // Generate AI-optimized schedule
  const handleGenerateAISchedule = async () => {
    if (!business) {
      toast({
        title: 'Business required',
        description: 'Please set up your business first.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      // 1. Export scheduling data from database
      const weekStart = new Date(selectedWeekStart);
      const schedulingData = await schedulingDataService.exportSchedulingData(business.id, weekStart);
      
      if (!schedulingData) {
        throw new Error('Failed to export scheduling data from database');
      }

      // 2. Test OpenAI connection
      const connectionOk = await openaiSchedulingService.testConnection();
      if (!connectionOk) {
        throw new Error('OpenAI API connection failed. Please check your API key.');
      }

      toast({
        title: 'AI Processing Started',
        description: 'Analyzing your staff data and generating optimal schedule...',
      });

      // 3. Generate schedule using OpenAI
      const response = await openaiSchedulingService.generateOptimizedSchedule(schedulingData);
      
      if (!response.success) {
        throw new Error('AI failed to generate a valid schedule');
      }

      setSchedulingResponse(response);
      setScheduleAccepted(false);

      toast({
        title: 'AI Schedule Generated!',
        description: `Created ${response.shifts.length} shifts with ${response.optimization_score}% optimization score.`,
      });

    } catch (error: any) {
      console.error('AI Scheduling Error:', error);
      toast({
        title: 'AI Scheduling Failed',
        description: error.message || 'Failed to generate AI schedule. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Connect to Google Calendar
  const handleConnectCalendar = async () => {
    setIsConnectingCalendar(true);
    try {
      const success = await googleCalendarService.signIn();
      if (success) {
        setCalendarConnected(true);
        toast({
          title: 'Calendar Connected',
          description: 'Successfully connected to Google Calendar.',
        });
      } else {
        throw new Error('Failed to connect to Google Calendar');
      }
    } catch (error: any) {
      toast({
        title: 'Calendar Connection Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsConnectingCalendar(false);
    }
  };

  // Accept schedule and save to database + sync to calendar
  const handleAcceptSchedule = async () => {
    if (!schedulingResponse || !business) return;

    try {
      // 1. Save to database
      const { scheduleId, error } = await schedulingDataService.saveAISchedule(
        business.id,
        new Date(selectedWeekStart),
        schedulingResponse.shifts,
        schedulingResponse.optimization_score,
        schedulingResponse.total_cost,
        schedulingResponse.ai_insights
      );

      if (error) {
        throw new Error(`Database save failed: ${error}`);
      }

      setScheduleAccepted(true);
      
      toast({
        title: 'Schedule Accepted',
        description: 'Schedule has been saved to your database.',
      });

      // 2. Optionally sync to Google Calendar
      if (calendarConnected) {
        await handleSyncToCalendar();
      }

    } catch (error: any) {
      toast({
        title: 'Failed to Accept Schedule',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Sync accepted schedule to Google Calendar
  const handleSyncToCalendar = async () => {
    if (!schedulingResponse || !business || !calendarConnected) return;

    setIsSyncingToCalendar(true);
    try {
      const staffEmailMap = await schedulingDataService.getStaffEmailMap(business.id);
      
      const result = await googleCalendarService.createScheduleEvents(
        schedulingResponse.shifts,
        business.name,
        staffEmailMap
      );

      if (result.success) {
        toast({
          title: 'Calendar Sync Complete',
          description: `Created ${result.createdEvents} calendar events. Staff will receive email invitations.`,
        });
      } else {
        toast({
          title: 'Partial Calendar Sync',
          description: `Created ${result.createdEvents} events with ${result.errors.length} errors.`,
          variant: 'destructive',
        });
      }

    } catch (error: any) {
      toast({
        title: 'Calendar Sync Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSyncingToCalendar(false);
    }
  };

  // Reject schedule
  const handleRejectSchedule = () => {
    setSchedulingResponse(null);
    setScheduleAccepted(false);
    toast({
      title: 'Schedule Rejected',
      description: 'You can generate a new schedule or create one manually.',
    });
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">AI-Powered Scheduling</h1>
              <p className="text-muted-foreground">Generate optimized schedules with artificial intelligence</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <input
              type="date"
              value={selectedWeekStart}
              onChange={(e) => setSelectedWeekStart(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            />
            <Button 
              onClick={handleGenerateAISchedule} 
              disabled={isGenerating || !business}
              variant="gradient"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Bot className="mr-2 h-4 w-4" />
                  Generate AI Schedule
                </>
              )}
            </Button>
          </div>
        </div>

        {/* API Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                OpenAI Integration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span>AI Scheduling Engine</span>
                <Badge variant={import.meta.env.VITE_OPENAI_API_KEY ? 'default' : 'destructive'}>
                  {import.meta.env.VITE_OPENAI_API_KEY ? 'Connected' : 'Not Configured'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Google Calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span>Calendar Sync</span>
                <div className="flex gap-2">
                  <Badge variant={calendarConnected ? 'default' : 'secondary'}>
                    {calendarConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                  {!calendarConnected && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={handleConnectCalendar}
                      disabled={isConnectingCalendar}
                    >
                      {isConnectingCalendar ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Connect'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Generated Schedule Display */}
        {schedulingResponse && (
          <div className="space-y-6">
            {/* Schedule Overview */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      AI Schedule Analysis
                    </CardTitle>
                    <CardDescription>
                      Week of {new Date(selectedWeekStart).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  
                  {!scheduleAccepted && (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={handleRejectSchedule}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                      <Button 
                        onClick={handleAcceptSchedule}
                        variant="gradient"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Accept & Save
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {schedulingResponse.optimization_score}%
                    </div>
                    <div className="text-sm text-muted-foreground">Optimization Score</div>
                    <Progress value={schedulingResponse.optimization_score} className="mt-2" />
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{schedulingResponse.shifts.length}</div>
                    <div className="text-sm text-muted-foreground">Total Shifts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">${schedulingResponse.total_cost.toFixed(0)}</div>
                    <div className="text-sm text-muted-foreground">Weekly Cost</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {schedulingResponse.coverage_analysis.fully_covered_hours}h
                    </div>
                    <div className="text-sm text-muted-foreground">Coverage Hours</div>
                  </div>
                </div>

                <Separator />

                {/* AI Insights */}
                <Alert>
                  <Bot className="h-4 w-4" />
                  <AlertDescription>
                    <strong>AI Insights:</strong> {schedulingResponse.ai_insights}
                  </AlertDescription>
                </Alert>

                {/* Warnings */}
                {schedulingResponse.warnings.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Warnings:</strong>
                      <ul className="mt-2 list-disc list-inside">
                        {schedulingResponse.warnings.map((warning, idx) => (
                          <li key={idx}>{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Recommendations */}
                {schedulingResponse.recommendations.length > 0 && (
                  <Alert>
                    <TrendingUp className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Recommendations:</strong>
                      <ul className="mt-2 list-disc list-inside">
                        {schedulingResponse.recommendations.map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Schedule Acceptance Actions */}
            {scheduleAccepted && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Schedule Accepted
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p>Schedule has been saved to your database and is ready for use.</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Staff can now view their shifts in the staff portal.
                      </p>
                    </div>
                    
                    {calendarConnected && (
                      <Button 
                        onClick={handleSyncToCalendar}
                        disabled={isSyncingToCalendar}
                        variant="outline"
                      >
                        {isSyncingToCalendar ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <CalendarPlus className="mr-2 h-4 w-4" />
                            Sync to Calendar
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Detailed Schedule View */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Generated Schedule Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {schedulingResponse.shifts.map((shift, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-3 h-12 bg-blue-500 rounded" />
                        <div>
                          <div className="font-semibold">{shift.staff_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(shift.date).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </div>
                          <div className="text-sm">
                            {shift.start_time} - {shift.end_time} ({shift.duration}h)
                          </div>
                          <Badge variant="outline" className="mt-1">
                            {shift.role_name}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-semibold">
                          ${(shift.duration * shift.pay_rate).toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ${shift.pay_rate}/hr
                        </div>
                        <div className="text-xs text-green-600">
                          {(shift.confidence_score * 100).toFixed(0)}% confidence
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty State */}
        {!schedulingResponse && !isGenerating && (
          <Card>
            <CardContent className="text-center py-12">
              <Bot className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Ready for AI Scheduling</h3>
              <p className="text-muted-foreground mb-6">
                Generate an optimized schedule using artificial intelligence. 
                The AI will analyze your staff availability, business hours, and constraints 
                to create the most efficient schedule possible.
              </p>
              <Button onClick={handleGenerateAISchedule} variant="gradient" size="lg">
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Your First AI Schedule
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
