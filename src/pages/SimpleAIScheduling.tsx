import React, { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Sparkles
} from 'lucide-react';
import { useBusiness } from '@/hooks/useBusiness';
import { useStaff } from '@/hooks/useStaff';
import { useToast } from '@/hooks/use-toast';
import { openaiSchedulingService } from '@/services/openaiSchedulingService';
import { mockAISchedulingService } from '@/services/mockAISchedulingService';
import { freeSchedulingAPIs } from '@/services/freeSchedulingAPIs';

export default function SimpleAIScheduling() {
  const { business, roles } = useBusiness();
  const { staff } = useStaff();
  const { toast } = useToast();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [schedulingResponse, setSchedulingResponse] = useState<any>(null);
  const [apiConnections, setApiConnections] = useState<{ [key: string]: boolean }>({});
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
    const today = new Date();
    const monday = new Date(today.setDate(today.getDate() - today.getDay() + 1));
    return monday.toISOString().split('T')[0];
  });

  // Test API connections on component mount
  React.useEffect(() => {
    const testAPIs = async () => {
      try {
        const connections = await freeSchedulingAPIs.testConnections();
        setApiConnections(connections);
      } catch (error) {
        console.error('Failed to test API connections:', error);
      }
    };
    testAPIs();
  }, []);

  // Generate AI-optimized schedule with simplified data
  const handleGenerateAISchedule = async () => {
    if (!business || !staff || staff.length === 0) {
      toast({
        title: 'Setup Required',
        description: 'Please complete business setup and add staff first.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Create simplified scheduling data
      const schedulingData = {
        business: {
          id: business.id,
          name: business.name,
          business_hours: business.business_hours || {
            monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
            tuesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
            wednesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
            thursday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
            friday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
            saturday: { isOpen: false, openTime: '09:00', closeTime: '17:00' },
            sunday: { isOpen: false, openTime: '09:00', closeTime: '17:00' }
          }
        },
        staff: staff.map(s => ({
          id: s.id,
          name: s.name,
          email: s.email,
          availability: s.availability || {
            monday: { available: true, startTime: '09:00', endTime: '17:00' },
            tuesday: { available: true, startTime: '09:00', endTime: '17:00' },
            wednesday: { available: true, startTime: '09:00', endTime: '17:00' },
            thursday: { available: true, startTime: '09:00', endTime: '17:00' },
            friday: { available: true, startTime: '09:00', endTime: '17:00' },
            saturday: { available: false, startTime: '09:00', endTime: '17:00' },
            sunday: { available: false, startTime: '09:00', endTime: '17:00' }
          },
          constraints: s.constraints || {
            maxHoursPerDay: 8,
            maxHoursPerWeek: 40,
            minHoursBetweenShifts: 12
          },
          hourly_rate: s.hourly_rate || 15.0,
          roles: roles.filter(r => s.roles?.includes(r.id)).map(r => r.id) || []
        })),
        roles: roles || [],
        leave_requests: [], // No leave requests for now
        week_start_date: selectedWeekStart,
        constraints: {
          maxHoursPerDay: 8,
          maxHoursPerWeek: 40,
          minBreakBetweenShifts: 12
        }
      };

      toast({
        title: 'AI Processing Started',
        description: 'Analyzing your staff data and generating optimal schedule...',
      });

      // Use intelligent API selection (free APIs if available, mock AI as fallback)
      const response = await freeSchedulingAPIs.generateOptimizedSchedule(schedulingData);
      
      if (!response.success) {
        throw new Error('AI failed to generate a valid schedule');
      }

      setSchedulingResponse(response);

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

  // Accept schedule
  const handleAcceptSchedule = () => {
    if (!schedulingResponse) return;
    
    toast({
      title: 'Schedule Accepted',
      description: 'Schedule has been accepted. You can now implement it manually or integrate with your scheduling system.',
    });
  };

  // Reject schedule
  const handleRejectSchedule = () => {
    setSchedulingResponse(null);
    toast({
      title: 'Schedule Rejected',
      description: 'You can generate a new schedule with different parameters.',
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
              <h1 className="text-3xl font-bold text-foreground">Simple AI Scheduling</h1>
              <p className="text-muted-foreground">Generate optimized schedules with OpenAI</p>
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
              disabled={isGenerating || !business || !staff || staff.length === 0}
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

        {/* API Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Free AI APIs Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Free API Status */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-sm font-medium">Groq</div>
                <Badge variant={apiConnections.groq ? 'default' : 'secondary'}>
                  {apiConnections.groq ? 'Available' : 'Checking...'}
                </Badge>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium">Cohere</div>
                <Badge variant={apiConnections.cohere ? 'default' : 'secondary'}>
                  {apiConnections.cohere ? 'Available' : 'Checking...'}
                </Badge>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium">HuggingFace</div>
                <Badge variant={apiConnections.huggingface ? 'default' : 'secondary'}>
                  {apiConnections.huggingface ? 'Available' : 'Checking...'}
                </Badge>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium">Mock AI</div>
                <Badge variant="default">Always Ready</Badge>
              </div>
            </div>

            <Alert>
              <Bot className="h-4 w-4" />
              <AlertDescription>
                <strong>Free AI Scheduling:</strong> Using multiple free AI APIs (Groq, Cohere, HuggingFace) with intelligent fallback. 
                No billing required! Add API keys to .env for enhanced performance:
                <br />• VITE_GROQ_API_KEY (14,400 free requests/day)
                <br />• VITE_COHERE_API_KEY (5M free tokens/month)
                <br />• VITE_HUGGINGFACE_API_KEY (Free inference)
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

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
                      Accept Schedule
                    </Button>
                  </div>
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

                {/* AI Insights */}
                <Alert>
                  <Bot className="h-4 w-4" />
                  <AlertDescription>
                    <strong>AI Insights:</strong> {schedulingResponse.ai_insights}
                  </AlertDescription>
                </Alert>

                {/* Recommendations */}
                {schedulingResponse.recommendations.length > 0 && (
                  <Alert>
                    <TrendingUp className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Recommendations:</strong>
                      <ul className="mt-2 list-disc list-inside">
                        {schedulingResponse.recommendations.map((rec: string, idx: number) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Detailed Schedule View */}
            <Card>
              <CardHeader>
                <CardTitle>Generated Schedule Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {schedulingResponse.shifts.map((shift: any, idx: number) => (
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
                Generate an optimized schedule using OpenAI. The AI will analyze your staff 
                availability and business requirements to create the most efficient schedule.
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
