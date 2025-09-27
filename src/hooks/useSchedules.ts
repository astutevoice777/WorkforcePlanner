import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from './useBusiness';
import { useToast } from './use-toast';

export interface Schedule {
  id: string;
  business_id: string;
  week_start_date: string;
  status: string;
  generated_by: string;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  approved_by?: string;
  shifts?: Shift[];
}

export interface Shift {
  id: string;
  schedule_id: string;
  staff_id: string;
  role_id: string;
  date: string;
  start_time: string;
  end_time: string;
  duration: number;
  status: string;
  notes?: string;
  pay_rate?: number;
  created_at: string;
  updated_at: string;
}

export function useSchedules() {
  const { business } = useBusiness();
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch schedules with their shifts
  const fetchSchedules = async () => {
    if (!business) return;
    
    setLoading(true);
    try {
      // Get schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('schedules')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (schedulesError) throw schedulesError;

      // Get shifts for all schedules
      const scheduleIds = schedulesData?.map(s => s.id) || [];
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .in('schedule_id', scheduleIds)
        .order('date');

      if (shiftsError) throw shiftsError;

      // Combine schedules with their shifts
      const schedulesWithShifts = schedulesData?.map(schedule => ({
        ...schedule,
        shifts: shiftsData?.filter(s => s.schedule_id === schedule.id) || []
      })) || [];

      setSchedules(schedulesWithShifts);
    } catch (error: any) {
      console.error('Error fetching schedules:', error);
      toast({
        title: 'Error loading schedules',
        description: 'Failed to load schedule data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Add new schedule with shifts
  const addSchedule = async (scheduleData: {
    week_start_date: Date;
    shifts: Omit<Shift, 'id' | 'schedule_id' | 'created_at' | 'updated_at'>[];
    status?: string;
    generated_by?: string;
  }) => {
    if (!business) return { error: 'No business found' };

    try {
      // Insert schedule
      const { data: newSchedule, error: scheduleError } = await supabase
        .from('schedules')
        .insert({
          business_id: business.id,
          week_start_date: scheduleData.week_start_date.toISOString().split('T')[0],
          status: scheduleData.status || 'DRAFT',
          generated_by: scheduleData.generated_by || 'MANUAL',
        })
        .select()
        .single();

      if (scheduleError) throw scheduleError;

      // Insert shifts
      if (scheduleData.shifts.length > 0) {
        const shiftsWithScheduleId = scheduleData.shifts.map(shift => ({
          ...shift,
          schedule_id: newSchedule.id,
          date: typeof shift.date === 'string' ? shift.date : new Date(shift.date as any).toISOString().split('T')[0],
        }));

        const { error: shiftsError } = await supabase
          .from('shifts')
          .insert(shiftsWithScheduleId);

        if (shiftsError) throw shiftsError;
      }

      await fetchSchedules();
      return { data: newSchedule, error: null };
    } catch (error: any) {
      console.error('Error adding schedule:', error);
      toast({
        title: 'Error creating schedule',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  // Update schedule
  const updateSchedule = async (scheduleId: string, scheduleData: Partial<Schedule>) => {
    try {
      const { shifts, ...schedulePayload } = scheduleData;
      
      // Update schedule
      const { data: updatedSchedule, error: scheduleError } = await supabase
        .from('schedules')
        .update(schedulePayload)
        .eq('id', scheduleId)
        .select()
        .single();

      if (scheduleError) throw scheduleError;

      await fetchSchedules();
      return { data: updatedSchedule, error: null };
    } catch (error: any) {
      console.error('Error updating schedule:', error);
      toast({
        title: 'Error updating schedule',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  // Delete schedule
  const deleteSchedule = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      await fetchSchedules();
      return { error: null };
    } catch (error: any) {
      console.error('Error deleting schedule:', error);
      toast({
        title: 'Error deleting schedule',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  useEffect(() => {
    if (business) {
      fetchSchedules();
    }
  }, [business]);

  return {
    schedules,
    loading,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    refetch: fetchSchedules,
  };
}