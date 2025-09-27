import { supabase } from '@/integrations/supabase/client';
import { SchedulingData } from './openaiSchedulingService';

export class SchedulingDataService {
  // Export all scheduling-relevant data from database
  async exportSchedulingData(businessId: string, weekStartDate: Date): Promise<SchedulingData | null> {
    try {
      console.log('Exporting scheduling data for business:', businessId, 'week:', weekStartDate);

      // Calculate week end date
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekStartDate.getDate() + 6);

      // 1. Get business information
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, business_hours')
        .eq('id', businessId)
        .single();

      if (businessError) throw businessError;

      // 2. Get all active staff with their availability and constraints
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select(`
          id,
          name,
          email,
          availability,
          constraints,
          hourly_rate,
          is_active,
          staff_roles (
            role_id
          )
        `)
        .eq('business_id', businessId)
        .eq('is_active', true);

      if (staffError) throw staffError;

      // 3. Get all roles for the business
      const { data: roles, error: rolesError } = await supabase
        .from('roles')
        .select('id, name, hourly_rate, min_staff_required, max_staff_allowed, color')
        .eq('business_id', businessId);

      if (rolesError) throw rolesError;

      // 4. Get approved leave requests that overlap with the scheduling week
      // First, try to get leave requests, but handle if table doesn't exist
      let leaveRequests: any[] = [];
      try {
        const { data: leaveData, error: leaveError } = await supabase
          .from('leave_requests')
          .select(`
            staff_id,
            start_date,
            end_date,
            status,
            is_partial_day,
            start_time,
            end_time
          `)
          .eq('status', 'APPROVED')
          .or(`start_date.lte.${weekEndDate.toISOString().split('T')[0]},end_date.gte.${weekStartDate.toISOString().split('T')[0]}`)
          .in('staff_id', staff?.map(s => s.id) || []);

        if (!leaveError && leaveData) {
          leaveRequests = leaveData;
        }
      } catch (error) {
        // If leave_requests table doesn't exist, try time_off_requests table
        console.log('leave_requests table not found, trying time_off_requests...');
        try {
          const { data: timeOffData, error: timeOffError } = await supabase
            .from('time_off_requests')
            .select(`
              staff_id,
              start_date,
              end_date,
              status
            `)
            .eq('status', 'APPROVED')
            .or(`start_date.lte.${weekEndDate.toISOString().split('T')[0]},end_date.gte.${weekStartDate.toISOString().split('T')[0]}`)
            .in('staff_id', staff?.map(s => s.id) || []);

          if (!timeOffError && timeOffData) {
            leaveRequests = timeOffData.map(req => ({
              ...req,
              is_partial_day: false,
              start_time: null,
              end_time: null
            }));
          }
        } catch (timeOffError) {
          console.log('No leave/time-off tables found, proceeding without leave data');
          leaveRequests = [];
        }
      }

      // 5. Transform staff data to include role IDs
      const transformedStaff = staff?.map(staffMember => ({
        id: staffMember.id,
        name: staffMember.name,
        email: staffMember.email,
        availability: staffMember.availability || this.getDefaultAvailability(),
        constraints: staffMember.constraints || this.getDefaultConstraints(),
        hourly_rate: staffMember.hourly_rate || 15.0,
        roles: staffMember.staff_roles?.map((sr: any) => sr.role_id) || []
      })) || [];

      // 6. Build the complete scheduling data object
      const schedulingData: SchedulingData = {
        business: {
          id: business.id,
          name: business.name,
          business_hours: business.business_hours || this.getDefaultBusinessHours()
        },
        staff: transformedStaff,
        roles: roles || [],
        leave_requests: leaveRequests || [],
        week_start_date: weekStartDate.toISOString().split('T')[0],
        constraints: {
          maxHoursPerDay: 8,
          maxHoursPerWeek: 40,
          minBreakBetweenShifts: 12
        }
      };

      console.log('Exported scheduling data:', schedulingData);
      return schedulingData;

    } catch (error: any) {
      console.error('Error exporting scheduling data:', error);
      return null;
    }
  }

  // Get staff email mapping for calendar invitations
  async getStaffEmailMap(businessId: string): Promise<Record<string, string>> {
    try {
      const { data: staff, error } = await supabase
        .from('staff')
        .select('id, email')
        .eq('business_id', businessId)
        .eq('is_active', true);

      if (error) throw error;

      const emailMap: Record<string, string> = {};
      staff?.forEach(staffMember => {
        emailMap[staffMember.id] = staffMember.email;
      });

      return emailMap;
    } catch (error) {
      console.error('Error getting staff email map:', error);
      return {};
    }
  }

  // Save AI-generated schedule to database
  async saveAISchedule(
    businessId: string,
    weekStartDate: Date,
    shifts: any[],
    optimizationScore: number,
    totalCost: number,
    aiInsights: string
  ): Promise<{ scheduleId: string | null; error: string | null }> {
    try {
      // 1. Create the schedule record
      const { data: schedule, error: scheduleError } = await supabase
        .from('schedules')
        .insert({
          business_id: businessId,
          week_start_date: weekStartDate.toISOString().split('T')[0],
          status: 'DRAFT',
          generated_by: 'AI',
          optimization_score: optimizationScore,
          ai_generation_data: {
            total_cost: totalCost,
            ai_insights: aiInsights,
            generated_at: new Date().toISOString()
          }
        })
        .select('id')
        .single();

      if (scheduleError) throw scheduleError;

      // 2. Create shift records
      const shiftRecords = shifts.map(shift => ({
        schedule_id: schedule.id,
        staff_id: shift.staff_id,
        role_id: shift.role_id,
        date: shift.date,
        start_time: shift.start_time,
        end_time: shift.end_time,
        duration: shift.duration,
        pay_rate: shift.pay_rate,
        status: 'SCHEDULED',
        notes: shift.reasoning
      }));

      const { error: shiftsError } = await supabase
        .from('shifts')
        .insert(shiftRecords);

      if (shiftsError) throw shiftsError;

      return { scheduleId: schedule.id, error: null };

    } catch (error: any) {
      console.error('Error saving AI schedule:', error);
      return { scheduleId: null, error: error.message };
    }
  }

  // Get default availability (9 AM - 5 PM, Monday to Friday)
  private getDefaultAvailability() {
    return {
      monday: { available: true, startTime: '09:00', endTime: '17:00' },
      tuesday: { available: true, startTime: '09:00', endTime: '17:00' },
      wednesday: { available: true, startTime: '09:00', endTime: '17:00' },
      thursday: { available: true, startTime: '09:00', endTime: '17:00' },
      friday: { available: true, startTime: '09:00', endTime: '17:00' },
      saturday: { available: false, startTime: '09:00', endTime: '17:00' },
      sunday: { available: false, startTime: '09:00', endTime: '17:00' }
    };
  }

  // Get default business hours
  private getDefaultBusinessHours() {
    return {
      monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
      tuesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
      wednesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
      thursday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
      friday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
      saturday: { isOpen: false, openTime: '09:00', closeTime: '17:00' },
      sunday: { isOpen: false, openTime: '09:00', closeTime: '17:00' }
    };
  }

  // Get default constraints
  private getDefaultConstraints() {
    return {
      maxHoursPerDay: 8,
      maxHoursPerWeek: 40,
      minHoursBetweenShifts: 12
    };
  }
}

export const schedulingDataService = new SchedulingDataService();
