import { useState, useEffect } from 'react';
import { useBusiness } from './useBusiness';
import { useStaff } from './useStaff';
import { useSchedules } from './useSchedules';
import { useToast } from './use-toast';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';

export interface PayrollPeriod {
  id: string;
  business_id: string;
  period_start: string;
  period_end: string;
  status: 'DRAFT' | 'PROCESSING' | 'COMPLETED' | 'PAID';
  total_hours: number;
  total_gross_pay: number;
  total_deductions: number;
  total_net_pay: number;
  processed_at?: string;
  processed_by?: string;
  created_at: string;
  updated_at: string;
  entries?: PayrollEntry[];
}

export interface PayrollEntry {
  id: string;
  payroll_period_id: string;
  staff_id: string;
  regular_hours: number;
  overtime_hours: number;
  holiday_hours: number;
  regular_rate: number;
  overtime_rate?: number;
  holiday_rate?: number;
  gross_pay: number;
  tax_deductions: number;
  other_deductions: number;
  net_pay: number;
  bonus: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  staff?: {
    name: string;
    email: string;
  };
}

export interface PayrollDeduction {
  id: string;
  payroll_entry_id: string;
  deduction_type: 'TAX' | 'INSURANCE' | 'RETIREMENT' | 'OTHER';
  description: string;
  amount: number;
  is_percentage: boolean;
  percentage?: number;
  created_at: string;
}

export function usePayroll() {
  const { business } = useBusiness();
  const { toast } = useToast();
  const [payrollPeriods, setPayrollPeriods] = useState<PayrollPeriod[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch payroll periods with entries (mock implementation)
  const fetchPayrollPeriods = async () => {
    if (!business) return;
    
    setLoading(true);
    try {
      // For now, create mock payroll data based on existing schedules
      // In a real implementation, this would fetch from payroll_periods table
      const mockPeriods: PayrollPeriod[] = [
        {
          id: 'period-1',
          business_id: business.id,
          period_start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
          period_end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
          status: 'DRAFT',
          total_hours: 160,
          total_gross_pay: 2400,
          total_deductions: 360,
          total_net_pay: 2040,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          entries: []
        }
      ];
      
      setPayrollPeriods(mockPeriods);
    } catch (error: any) {
      console.error('Error fetching payroll periods:', error);
      toast({
        title: 'Error loading payroll data',
        description: 'Failed to load payroll information',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Create new payroll period (mock implementation)
  const createPayrollPeriod = async (periodData: {
    period_start: Date;
    period_end: Date;
  }) => {
    if (!business) return { error: 'No business found' };

    try {
      const newPeriod: PayrollPeriod = {
        id: `period-${Date.now()}`,
        business_id: business.id,
        period_start: periodData.period_start.toISOString().split('T')[0],
        period_end: periodData.period_end.toISOString().split('T')[0],
        status: 'DRAFT',
        total_hours: 0,
        total_gross_pay: 0,
        total_deductions: 0,
        total_net_pay: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        entries: []
      };

      setPayrollPeriods(prev => [newPeriod, ...prev]);
      
      toast({
        title: 'Payroll period created',
        description: 'New payroll period has been created successfully',
      });
      
      return { data: newPeriod, error: null };
    } catch (error: any) {
      console.error('Error creating payroll period:', error);
      toast({
        title: 'Error creating payroll period',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  // Generate payroll from shifts (mock implementation)
  const generatePayrollFromShifts = async (
    periodStart: Date,
    periodEnd: Date
  ) => {
    if (!business) return { error: 'No business found' };

    try {
      setLoading(true);
      
      // Simulate payroll calculation from shifts
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newPeriod: PayrollPeriod = {
        id: `period-${Date.now()}`,
        business_id: business.id,
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        status: 'DRAFT',
        total_hours: 320,
        total_gross_pay: 4800,
        total_deductions: 720,
        total_net_pay: 4080,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        entries: []
      };

      setPayrollPeriods(prev => [newPeriod, ...prev]);
      
      toast({
        title: 'Payroll generated successfully',
        description: 'Payroll has been calculated from scheduled shifts',
      });

      return { data: newPeriod.id, error: null };
    } catch (error: any) {
      console.error('Error generating payroll:', error);
      toast({
        title: 'Error generating payroll',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Update payroll period status (mock implementation)
  const updatePayrollPeriodStatus = async (
    periodId: string,
    status: PayrollPeriod['status']
  ) => {
    try {
      setPayrollPeriods(prev => prev.map(period => 
        period.id === periodId 
          ? { 
              ...period, 
              status, 
              processed_at: status === 'COMPLETED' || status === 'PAID' ? new Date().toISOString() : period.processed_at,
              updated_at: new Date().toISOString()
            }
          : period
      ));
      
      toast({
        title: 'Payroll status updated',
        description: `Payroll period marked as ${status.toLowerCase()}`,
      });

      return { error: null };
    } catch (error: any) {
      console.error('Error updating payroll status:', error);
      toast({
        title: 'Error updating payroll',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  // Update payroll entry (mock implementation)
  const updatePayrollEntry = async (
    entryId: string,
    updates: Partial<PayrollEntry>
  ) => {
    try {
      // Mock implementation - in real app would update database
      toast({
        title: 'Payroll entry updated',
        description: 'Entry has been updated successfully',
      });
      return { error: null };
    } catch (error: any) {
      console.error('Error updating payroll entry:', error);
      toast({
        title: 'Error updating payroll entry',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  // Add deduction to payroll entry (mock implementation)
  const addPayrollDeduction = async (deductionData: Omit<PayrollDeduction, 'id' | 'created_at'>) => {
    try {
      // Mock implementation - in real app would insert to database
      toast({
        title: 'Deduction added',
        description: 'Payroll deduction has been added successfully',
      });

      return { error: null };
    } catch (error: any) {
      console.error('Error adding payroll deduction:', error);
      toast({
        title: 'Error adding deduction',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  // Delete payroll period (mock implementation)
  const deletePayrollPeriod = async (periodId: string) => {
    try {
      setPayrollPeriods(prev => prev.filter(period => period.id !== periodId));
      
      toast({
        title: 'Payroll period deleted',
        description: 'Payroll period has been removed',
      });

      return { error: null };
    } catch (error: any) {
      console.error('Error deleting payroll period:', error);
      toast({
        title: 'Error deleting payroll',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  // Calculate payroll summary statistics
  const getPayrollSummary = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const currentMonthPeriods = payrollPeriods.filter(period => {
      const periodDate = new Date(period.period_start);
      return periodDate.getMonth() === currentMonth && periodDate.getFullYear() === currentYear;
    });

    const totalGrossPay = currentMonthPeriods.reduce((sum, period) => sum + period.total_gross_pay, 0);
    const totalNetPay = currentMonthPeriods.reduce((sum, period) => sum + period.total_net_pay, 0);
    const totalHours = currentMonthPeriods.reduce((sum, period) => sum + period.total_hours, 0);
    const totalDeductions = currentMonthPeriods.reduce((sum, period) => sum + period.total_deductions, 0);

    return {
      totalGrossPay,
      totalNetPay,
      totalHours,
      totalDeductions,
      periodsCount: currentMonthPeriods.length
    };
  };

  useEffect(() => {
    if (business) {
      fetchPayrollPeriods();
    }
  }, [business]);

  return {
    payrollPeriods,
    loading,
    createPayrollPeriod,
    generatePayrollFromShifts,
    updatePayrollPeriodStatus,
    updatePayrollEntry,
    addPayrollDeduction,
    deletePayrollPeriod,
    getPayrollSummary,
    refetch: fetchPayrollPeriods,
  };
}
