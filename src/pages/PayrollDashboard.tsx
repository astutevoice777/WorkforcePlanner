import React, { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Clock, 
  Users, 
  TrendingUp,
  Calendar,
  FileText,
  Download,
  Plus,
  Calculator,
  AlertCircle,
  CheckCircle,
  Edit,
  Trash2
} from 'lucide-react';
import { usePayroll } from '@/hooks/usePayroll';
import { useStaff } from '@/hooks/useStaff';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';

export default function PayrollDashboard() {
  const { 
    payrollPeriods, 
    loading, 
    createPayrollPeriod, 
    generatePayrollFromShifts,
    updatePayrollPeriodStatus,
    updatePayrollEntry,
    deletePayrollPeriod,
    getPayrollSummary
  } = usePayroll();
  const { staff } = useStaff();
  const { toast } = useToast();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<any>(null);
  const [currentView, setCurrentView] = useState<'overview' | 'periods' | 'reports'>('overview');
  const [newPeriodData, setNewPeriodData] = useState({
    period_start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    period_end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  const summary = getPayrollSummary();

  const handleCreatePeriod = async () => {
    try {
      const result = await createPayrollPeriod({
        period_start: new Date(newPeriodData.period_start),
        period_end: new Date(newPeriodData.period_end)
      });

      if (!result.error) {
        setIsCreateDialogOpen(false);
        toast({
          title: 'Payroll period created',
          description: 'New payroll period has been created successfully',
        });
      }
    } catch (error) {
      console.error('Error creating payroll period:', error);
    }
  };

  const handleGeneratePayroll = async (periodStart: Date, periodEnd: Date) => {
    try {
      await generatePayrollFromShifts(periodStart, periodEnd);
    } catch (error) {
      console.error('Error generating payroll:', error);
    }
  };

  const handleStatusUpdate = async (periodId: string, status: any) => {
    try {
      await updatePayrollPeriodStatus(periodId, status);
    } catch (error) {
      console.error('Error updating payroll status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'secondary';
      case 'PROCESSING': return 'default';
      case 'COMPLETED': return 'outline';
      case 'PAID': return 'default';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DRAFT': return <Edit className="h-3 w-3" />;
      case 'PROCESSING': return <Clock className="h-3 w-3" />;
      case 'COMPLETED': return <CheckCircle className="h-3 w-3" />;
      case 'PAID': return <DollarSign className="h-3 w-3" />;
      default: return <AlertCircle className="h-3 w-3" />;
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-xl flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Payroll Management</h1>
              <p className="text-muted-foreground">Manage staff payroll, deductions, and reports</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  New Period
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Payroll Period</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="period_start">Period Start</Label>
                    <Input
                      type="date"
                      value={newPeriodData.period_start}
                      onChange={(e) => setNewPeriodData(prev => ({ ...prev, period_start: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="period_end">Period End</Label>
                    <Input
                      type="date"
                      value={newPeriodData.period_end}
                      onChange={(e) => setNewPeriodData(prev => ({ ...prev, period_end: e.target.value }))}
                    />
                  </div>
                  <Button onClick={handleCreatePeriod} className="w-full">
                    Create Period
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button 
              onClick={() => handleGeneratePayroll(
                startOfMonth(new Date()),
                endOfMonth(new Date())
              )}
              variant="gradient"
            >
              <Calculator className="h-4 w-4 mr-2" />
              Generate Payroll
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <DollarSign className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold text-foreground">${summary.totalGrossPay.toFixed(0)}</p>
                  <p className="text-sm text-muted-foreground">Gross Pay (Month)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <TrendingUp className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold text-foreground">${summary.totalNetPay.toFixed(0)}</p>
                  <p className="text-sm text-muted-foreground">Net Pay (Month)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Clock className="h-8 w-8 text-accent" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{summary.totalHours.toFixed(0)}h</p>
                  <p className="text-sm text-muted-foreground">Total Hours</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{staff.length}</p>
                  <p className="text-sm text-muted-foreground">Active Staff</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={currentView} onValueChange={(value: any) => setCurrentView(value)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="periods">Payroll Periods</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Recent Payroll Periods</CardTitle>
                  <CardDescription>Latest payroll processing activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {payrollPeriods.slice(0, 5).map((period) => (
                      <div key={period.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div>
                          <p className="font-medium">
                            {format(new Date(period.period_start), 'MMM d')} - {format(new Date(period.period_end), 'MMM d, yyyy')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ${period.total_gross_pay.toFixed(2)} gross • {period.entries?.length || 0} employees
                          </p>
                        </div>
                        <Badge variant={getStatusColor(period.status) as "default" | "destructive" | "outline" | "secondary"}>
                          {getStatusIcon(period.status)}
                          <span className="ml-1">{period.status}</span>
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Payroll Analytics</CardTitle>
                  <CardDescription>Monthly payroll trends and insights</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Average Hours per Employee</span>
                      <span className="font-medium">
                        {staff.length > 0 ? (summary.totalHours / staff.length).toFixed(1) : 0}h
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Average Hourly Rate</span>
                      <span className="font-medium">
                        ${summary.totalHours > 0 ? (summary.totalGrossPay / summary.totalHours).toFixed(2) : 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Deductions</span>
                      <span className="font-medium">${summary.totalDeductions.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Payroll Periods</span>
                      <span className="font-medium">{summary.periodsCount}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="periods" className="space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Payroll Periods</CardTitle>
                    <CardDescription>Manage all payroll periods and entries</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {payrollPeriods.map((period) => (
                    <div key={period.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-medium text-lg">
                            {format(new Date(period.period_start), 'MMM d')} - {format(new Date(period.period_end), 'MMM d, yyyy')}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {period.entries?.length || 0} employees • {period.total_hours.toFixed(1)} total hours
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getStatusColor(period.status) as "default" | "destructive" | "outline" | "secondary"}>
                            {getStatusIcon(period.status)}
                            <span className="ml-1">{period.status}</span>
                          </Badge>
                          <Select
                            value={period.status}
                            onValueChange={(value) => handleStatusUpdate(period.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DRAFT">Draft</SelectItem>
                              <SelectItem value="PROCESSING">Processing</SelectItem>
                              <SelectItem value="COMPLETED">Completed</SelectItem>
                              <SelectItem value="PAID">Paid</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deletePayrollPeriod(period.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">${period.total_gross_pay.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">Gross Pay</p>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-bold text-red-600">${period.total_deductions.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">Deductions</p>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">${period.total_net_pay.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">Net Pay</p>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-bold text-purple-600">{period.total_hours.toFixed(1)}h</p>
                          <p className="text-xs text-muted-foreground">Total Hours</p>
                        </div>
                      </div>

                      {period.entries && period.entries.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="font-medium">Employee Breakdown</h5>
                          <div className="grid gap-2">
                            {period.entries.map((entry) => (
                              <div key={entry.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                                <div>
                                  <span className="font-medium">{entry.staff?.name}</span>
                                  <span className="text-sm text-muted-foreground ml-2">
                                    {entry.regular_hours}h reg + {entry.overtime_hours}h OT
                                  </span>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium">${entry.net_pay.toFixed(2)}</p>
                                  <p className="text-xs text-muted-foreground">${entry.gross_pay.toFixed(2)} gross</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Generate Reports</CardTitle>
                  <CardDescription>Create payroll reports and exports</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Payroll Summary Report
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      Tax Report (1099/W2)
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="h-4 w-4 mr-2" />
                      Monthly Breakdown
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="h-4 w-4 mr-2" />
                      Employee Pay Stubs
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common payroll management tasks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => handleGeneratePayroll(
                        startOfMonth(subMonths(new Date(), 1)),
                        endOfMonth(subMonths(new Date(), 1))
                      )}
                    >
                      <Calculator className="h-4 w-4 mr-2" />
                      Generate Last Month
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Edit className="h-4 w-4 mr-2" />
                      Bulk Edit Rates
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Review Discrepancies
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Process Payments
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
