import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useBusiness } from '@/hooks/useBusiness';

export interface PayrollPeriod {
  id: string;
  business_id: string;
  period_start: string;
  period_end: string;
  status: 'DRAFT' | 'PROCESSING' | 'COMPLETED' | 'PAID';
  total_hours: number | null;
  total_gross_pay: number | null;
  total_deductions: number | null;
  total_net_pay: number | null;
  processed_at: string | null;
  processed_by: string | null;
  created_at: string;
  updated_at: string;
  entries?: PayrollEntry[];
}

export interface PayrollEntry {
  id: string;
  payroll_period_id: string;
  staff_id: string;
  regular_hours: number | null;
  overtime_hours: number | null;
  holiday_hours: number | null;
  regular_rate: number;
  overtime_rate: number | null;
  holiday_rate: number | null;
  gross_pay: number | null;
  tax_deductions: number | null;
  other_deductions: number | null;
  net_pay: number | null;
  bonus: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  staff?: {
    id: string;
    name: string;
    email: string;
  };
  deductions?: PayrollDeduction[];
}

export interface PayrollDeduction {
  id: string;
  payroll_entry_id: string;
  deduction_type: 'TAX' | 'INSURANCE' | 'RETIREMENT' | 'OTHER';
  description: string;
  amount: number;
  is_percentage: boolean | null;
  percentage: number | null;
  created_at: string;
}

export function usePayrollIntegrated() {
  const { business } = useBusiness();
  const { toast } = useToast();
  const [payrollPeriods, setPayrollPeriods] = useState<PayrollPeriod[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPayrollPeriods = async () => {
    if (!business) return;
    
    setLoading(true);
    try {
      const { data: periods, error } = await supabase
        .from('payroll_periods')
        .select(`
          *,
          entries:payroll_entries(
            *,
            staff:staff_id(id, name, email),
            deductions:payroll_deductions(*)
          )
        `)
        .eq('business_id', business.id)
        .order('period_start', { ascending: false });
      
      if (error) throw error;
      
      setPayrollPeriods(periods || []);
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

  const createPayrollPeriod = async (data: { period_start: Date; period_end: Date }) => {
    if (!business) return { error: new Error('No business selected') };
    
    setLoading(true);
    try {
      const { data: period, error } = await supabase
        .from('payroll_periods')
        .insert({
          business_id: business.id,
          period_start: data.period_start.toISOString().split('T')[0],
          period_end: data.period_end.toISOString().split('T')[0],
          status: 'DRAFT',
        })
        .select()
        .single();

      if (error) throw error;

      await fetchPayrollPeriods();
      
      toast({
        title: 'Payroll period created',
        description: 'New payroll period has been created successfully',
      });

      return { data: period, error: null };
    } catch (error: any) {
      console.error('Error creating payroll period:', error);
      toast({
        title: 'Error creating payroll period',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const generatePayrollFromShifts = async (periodStart: Date, periodEnd: Date) => {
    if (!business) return { error: new Error('No business selected') };
    
    setLoading(true);
    try {
      const { data: payrollPeriodId, error } = await supabase.rpc('calculate_payroll_from_shifts', {
        p_business_id: business.id,
        p_period_start: periodStart.toISOString().split('T')[0],
        p_period_end: periodEnd.toISOString().split('T')[0],
      });

      if (error) throw error;

      await fetchPayrollPeriods();
      
      toast({
        title: 'Payroll generated',
        description: 'Payroll has been generated from shift data',
      });

      return { data: payrollPeriodId, error: null };
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

  const updatePayrollPeriodStatus = async (periodId: string, status: PayrollPeriod['status']) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('payroll_periods')
        .update({ 
          status,
          ...(status === 'COMPLETED' && { processed_at: new Date().toISOString() })
        })
        .eq('id', periodId);

      if (error) throw error;

      await fetchPayrollPeriods();
      
      toast({
        title: 'Status updated',
        description: `Payroll period status updated to ${status}`,
      });

      return { error: null };
    } catch (error: any) {
      console.error('Error updating payroll status:', error);
      toast({
        title: 'Error updating status',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const updatePayrollEntry = async (entryId: string, updates: Partial<PayrollEntry>) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('payroll_entries')
        .update(updates)
        .eq('id', entryId);

      if (error) throw error;

      await fetchPayrollPeriods();
      
      toast({
        title: 'Entry updated',
        description: 'Payroll entry has been updated successfully',
      });

      return { error: null };
    } catch (error: any) {
      console.error('Error updating payroll entry:', error);
      toast({
        title: 'Error updating entry',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const deletePayrollPeriod = async (periodId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('payroll_periods')
        .delete()
        .eq('id', periodId);

      if (error) throw error;

      await fetchPayrollPeriods();
      
      toast({
        title: 'Payroll period deleted',
        description: 'Payroll period has been deleted successfully',
      });

      return { error: null };
    } catch (error: any) {
      console.error('Error deleting payroll period:', error);
      toast({
        title: 'Error deleting period',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const addPayrollDeduction = async (entryId: string, deduction: Omit<PayrollDeduction, 'id' | 'payroll_entry_id' | 'created_at'>) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('payroll_deductions')
        .insert({
          payroll_entry_id: entryId,
          ...deduction,
        });

      if (error) throw error;

      await fetchPayrollPeriods();
      
      toast({
        title: 'Deduction added',
        description: 'Payroll deduction has been added successfully',
      });

      return { error: null };
    } catch (error: any) {
      console.error('Error adding deduction:', error);
      toast({
        title: 'Error adding deduction',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const generatePayrollReport = async (periodId: string, reportType: 'SUMMARY' | 'DETAILED' | 'TAX' | 'EXPORT') => {
    if (!business) return { error: new Error('No business selected') };
    
    setLoading(true);
    try {
      // Get payroll period with entries
      const { data: period, error: periodError } = await supabase
        .from('payroll_periods')
        .select(`
          *,
          entries:payroll_entries(
            *,
            staff:staff_id(id, name, email),
            deductions:payroll_deductions(*)
          )
        `)
        .eq('id', periodId)
        .single();

      if (periodError) throw periodError;

      // Generate report data based on type
      let reportData: any = {
        period: period,
        generated_at: new Date().toISOString(),
        report_type: reportType,
      };

      switch (reportType) {
        case 'SUMMARY':
          reportData.summary = {
            total_employees: period.entries?.length || 0,
            total_hours: period.total_hours,
            total_gross_pay: period.total_gross_pay,
            total_deductions: period.total_deductions,
            total_net_pay: period.total_net_pay,
          };
          break;
        case 'DETAILED':
          reportData.entries = period.entries;
          break;
        case 'TAX':
          reportData.tax_summary = period.entries?.map((entry: any) => ({
            staff_id: entry.staff_id,
            staff_name: entry.staff?.name,
            gross_pay: entry.gross_pay,
            tax_deductions: entry.tax_deductions,
            other_deductions: entry.other_deductions,
          }));
          break;
        case 'EXPORT':
          reportData.export_data = period.entries?.map((entry: any) => ({
            employee_name: entry.staff?.name,
            employee_email: entry.staff?.email,
            regular_hours: entry.regular_hours,
            overtime_hours: entry.overtime_hours,
            regular_rate: entry.regular_rate,
            overtime_rate: entry.overtime_rate,
            gross_pay: entry.gross_pay,
            deductions: entry.tax_deductions + (entry.other_deductions || 0),
            net_pay: entry.net_pay,
          }));
          break;
      }

      // Save report to database
      const { data: report, error: reportError } = await supabase
        .from('payroll_reports')
        .insert({
          business_id: business.id,
          payroll_period_id: periodId,
          report_type: reportType,
          report_data: reportData,
        })
        .select()
        .single();

      if (reportError) throw reportError;

      toast({
        title: 'Report generated',
        description: `${reportType} report has been generated successfully`,
      });

      return { data: report, error: null };
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast({
        title: 'Error generating report',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const getPayrollSummary = () => {
    const totalPeriods = payrollPeriods.length;
    const completedPeriods = payrollPeriods.filter(p => p.status === 'COMPLETED' || p.status === 'PAID').length;
    const totalGrossPay = payrollPeriods.reduce((sum, p) => sum + (p.total_gross_pay || 0), 0);
    const totalNetPay = payrollPeriods.reduce((sum, p) => sum + (p.total_net_pay || 0), 0);
    const totalHours = payrollPeriods.reduce((sum, p) => sum + (p.total_hours || 0), 0);

    return {
      totalPeriods,
      completedPeriods,
      totalGrossPay,
      totalNetPay,
      totalHours,
      averageGrossPay: totalPeriods > 0 ? totalGrossPay / totalPeriods : 0,
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
    deletePayrollPeriod,
    addPayrollDeduction,
    generatePayrollReport,
    getPayrollSummary,
    fetchPayrollPeriods,
  };
}
