import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ScheduleExportData {
  business: any;
  staff: any[];
  roles: any[];
  constraints: any[];
  templates: any[];
  leave_requests: any[];
  week_start_date: string;
  generated_at: string;
}

export function useScheduleExport() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const exportScheduleDataForAI = async (businessId: string, weekStartDate: Date): Promise<ScheduleExportData | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('export_schedule_data_for_ai', {
        business_id_param: businessId,
        week_start_date_param: weekStartDate.toISOString().split('T')[0]
      });

      if (error) throw error;

      toast({
        title: 'Schedule data exported',
        description: 'Schedule data has been prepared for AI generation',
      });

      return data;
    } catch (error: any) {
      console.error('Error exporting schedule data:', error);
      toast({
        title: 'Export failed',
        description: error.message || 'Failed to export schedule data',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const generateScheduleWithAI = async (scheduleData: ScheduleExportData, aiApiEndpoint: string, apiKey?: string) => {
    setLoading(true);
    try {
      const response = await fetch(aiApiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` }),
        },
        body: JSON.stringify({
          action: 'generate_schedule',
          data: scheduleData,
          parameters: {
            optimize_for: ['workload_balance', 'staff_preferences', 'business_constraints'],
            max_iterations: 100,
            allow_overtime: false,
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API request failed: ${response.statusText}`);
      }

      const result = await response.json();

      toast({
        title: 'AI schedule generated',
        description: 'Schedule has been generated successfully using AI',
      });

      return result;
    } catch (error: any) {
      console.error('Error generating AI schedule:', error);
      toast({
        title: 'AI generation failed',
        description: error.message || 'Failed to generate schedule with AI',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const saveAIGeneratedSchedule = async (
    businessId: string,
    weekStartDate: Date,
    aiScheduleData: any,
    generationParameters: any
  ) => {
    setLoading(true);
    try {
      // Create a new schedule record
      const { data: schedule, error: scheduleError } = await supabase
        .from('schedules')
        .insert({
          business_id: businessId,
          week_start_date: weekStartDate.toISOString().split('T')[0],
          status: 'DRAFT',
          generated_by: 'AI',
          ai_generation_data: aiScheduleData,
          generation_parameters: generationParameters,
          optimization_score: aiScheduleData.optimization_score || null,
        })
        .select()
        .single();

      if (scheduleError) throw scheduleError;

      // Insert the generated shifts
      if (aiScheduleData.shifts && aiScheduleData.shifts.length > 0) {
        const shifts = aiScheduleData.shifts.map((shift: any) => ({
          schedule_id: schedule.id,
          staff_id: shift.staff_id,
          role_id: shift.role_id,
          date: shift.date,
          start_time: shift.start_time,
          end_time: shift.end_time,
          duration: shift.duration,
          pay_rate: shift.pay_rate || null,
          status: 'SCHEDULED',
          notes: shift.notes || null,
        }));

        const { error: shiftsError } = await supabase
          .from('shifts')
          .insert(shifts);

        if (shiftsError) throw shiftsError;
      }

      toast({
        title: 'Schedule saved',
        description: 'AI-generated schedule has been saved successfully',
      });

      return schedule;
    } catch (error: any) {
      console.error('Error saving AI schedule:', error);
      toast({
        title: 'Save failed',
        description: error.message || 'Failed to save AI-generated schedule',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    exportScheduleDataForAI,
    generateScheduleWithAI,
    saveAIGeneratedSchedule,
  };
}
