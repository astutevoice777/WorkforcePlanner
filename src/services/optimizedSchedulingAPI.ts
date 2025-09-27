import { generateOptimizedSchedule, AdvancedConstraints, OptimizationResult } from '@/lib/advancedScheduleOptimizer';
import { supabase } from '@/integrations/supabase/client';

export interface ScheduleOptimizationRequest {
  businessId: string;
  weekStartDate: Date;
  templateId?: string;
  customConstraints?: Partial<AdvancedConstraints>;
}

export interface OptimizedScheduleResponse {
  success: boolean;
  data?: OptimizationResult;
  error?: string;
  executionTime: number;
}

/**
 * Main API service for optimized schedule generation
 */
export class OptimizedSchedulingAPI {
  
  /**
   * Generate an optimized schedule for a business
   */
  static async generateSchedule(request: ScheduleOptimizationRequest): Promise<OptimizedScheduleResponse> {
    const startTime = Date.now();
    
    try {
      console.log('🚀 Starting optimized schedule generation for business:', request.businessId);
      
      // 1. Fetch business data and constraints
      const businessData = await this.fetchBusinessData(request.businessId);
      if (!businessData.success) {
        return {
          success: false,
          error: businessData.error,
          executionTime: Date.now() - startTime
        };
      }
      
      // 2. Build optimization constraints
      const constraints = await this.buildOptimizationConstraints(
        request.businessId,
        request.customConstraints
      );
      
      // 3. Fetch staff availability and roles
      const staffData = await this.fetchStaffData(request.businessId);
      if (!staffData.success) {
        return {
          success: false,
          error: staffData.error,
          executionTime: Date.now() - startTime
        };
      }
      
      // 4. Run optimization algorithm
      const optimizationResult = await generateOptimizedSchedule({
        businessId: request.businessId,
        weekStartDate: request.weekStartDate,
        staffAvailability: staffData.staffAvailability,
        roles: staffData.roles,
        constraints
      });
      
      // 5. Save optimized schedule to database
      const saveResult = await this.saveOptimizedSchedule(
        request.businessId,
        request.weekStartDate,
        optimizationResult
      );
      
      if (!saveResult.success) {
        console.warn('Failed to save schedule, but optimization succeeded');
      }
      
      console.log('✅ Schedule optimization completed successfully');
      console.log(`📊 Scores - Coverage: ${optimizationResult.coverageScore.toFixed(1)}%, Fairness: ${optimizationResult.fairnessScore.toFixed(1)}%, Cost: ${optimizationResult.costScore.toFixed(1)}%`);
      
      return {
        success: true,
        data: optimizationResult,
        executionTime: Date.now() - startTime
      };
      
    } catch (error) {
      console.error('❌ Schedule optimization failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown optimization error',
        executionTime: Date.now() - startTime
      };
    }
  }
  
  /**
   * Fetch business data and basic constraints
   */
  private static async fetchBusinessData(businessId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const { data: business, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();
      
      if (error) throw error;
      
      return { success: true, data: business };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch business data: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Fetch staff availability and roles data
   */
  private static async fetchStaffData(businessId: string): Promise<{
    success: boolean;
    staffAvailability?: Record<string, any[]>;
    roles?: any[];
    error?: string;
  }> {
    try {
      // Fetch staff with availability
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('id, name, availability, constraints')
        .eq('business_id', businessId)
        .eq('is_active', true);
      
      if (staffError) throw staffError;
      
      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .eq('business_id', businessId);
      
      if (rolesError) throw rolesError;
      
      // Transform staff availability to required format
      const staffAvailability: Record<string, any[]> = {};
      
      staff?.forEach(s => {
        const availability = s.availability || {};
        const staffAvailabilityArray: any[] = [];
        
        Object.entries(availability).forEach(([day, times]: [string, any]) => {
          const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(day);
          if (Array.isArray(times) && times.length > 0) {
            times.forEach((timeSlot: any) => {
              staffAvailabilityArray.push({
                dayOfWeek: dayIndex,
                startTime: timeSlot.startTime,
                endTime: timeSlot.endTime,
                isAvailable: true
              });
            });
          }
        });
        
        staffAvailability[s.id] = staffAvailabilityArray;
      });
      
      return {
        success: true,
        staffAvailability,
        roles: roles || []
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch staff data: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Build optimization constraints from business settings and templates
   */
  private static async buildOptimizationConstraints(
    businessId: string,
    customConstraints?: Partial<AdvancedConstraints>
  ): Promise<AdvancedConstraints> {
    
    // Fetch business hours and settings
    const { data: business } = await supabase
      .from('businesses')
      .select('business_hours')
      .eq('id', businessId)
      .single();
    
    const businessHours = business?.business_hours || {
      monday: { start: '09:00', end: '17:00', isOpen: true },
      tuesday: { start: '09:00', end: '17:00', isOpen: true },
      wednesday: { start: '09:00', end: '17:00', isOpen: true },
      thursday: { start: '09:00', end: '17:00', isOpen: true },
      friday: { start: '09:00', end: '17:00', isOpen: true },
      saturday: { start: '10:00', end: '16:00', isOpen: true },
      sunday: { start: '12:00', end: '16:00', isOpen: false }
    };
    
    // Extract open days and hours
    const openDays: number[] = [];
    let earliestStart = '09:00';
    let latestEnd = '17:00';
    
    Object.entries(businessHours).forEach(([day, hours]: [string, any]) => {
      if (hours.isOpen) {
        const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(day);
        openDays.push(dayIndex);
        if (hours.start < earliestStart) earliestStart = hours.start;
        if (hours.end > latestEnd) latestEnd = hours.end;
      }
    });
    
    // Fetch roles for min/max staff requirements
    const { data: roles } = await supabase
      .from('roles')
      .select('id, min_staff_required, max_staff_allowed')
      .eq('business_id', businessId);
    
    const minStaffPerRole: Record<string, number> = {};
    const maxStaffPerRole: Record<string, number> = {};
    
    roles?.forEach(role => {
      minStaffPerRole[role.id] = role.min_staff_required || 1;
      maxStaffPerRole[role.id] = role.max_staff_allowed || 3;
    });
    
    // Default constraints with business-specific overrides
    const defaultConstraints: AdvancedConstraints = {
      maxHoursPerDay: 8,
      maxHoursPerWeek: 40,
      minHoursPerWeek: 20,
      minStaffPerRole,
      maxStaffPerRole,
      minBreakBetweenShifts: 12, // 12 hours between shifts
      maxConsecutiveDays: 5,
      preferredShiftLengths: [4, 6, 8], // 4, 6, or 8 hour shifts
      businessHours: {
        start: earliestStart,
        end: latestEnd,
        days: openDays
      },
      peakHours: [
        // Lunch rush
        { day: 1, startTime: '12:00', endTime: '14:00', multiplier: 1.5 },
        { day: 2, startTime: '12:00', endTime: '14:00', multiplier: 1.5 },
        { day: 3, startTime: '12:00', endTime: '14:00', multiplier: 1.5 },
        { day: 4, startTime: '12:00', endTime: '14:00', multiplier: 1.5 },
        { day: 5, startTime: '12:00', endTime: '14:00', multiplier: 1.5 },
        // Weekend peak
        { day: 6, startTime: '11:00', endTime: '15:00', multiplier: 1.3 },
      ],
      skillRequirements: {}, // Can be enhanced with role-skill mapping
      staffSkills: {}, // Can be enhanced with staff skills
      laborCostBudget: undefined, // Can be set based on business budget
      fairnessWeight: 0.7, // Prioritize fair distribution
      costWeight: 0.5 // Moderate cost optimization
    };
    
    // Merge with custom constraints
    return {
      ...defaultConstraints,
      ...customConstraints
    };
  }
  
  /**
   * Save optimized schedule to database
   */
  private static async saveOptimizedSchedule(
    businessId: string,
    weekStartDate: Date,
    optimizationResult: OptimizationResult
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Create schedule record
      const { data: schedule, error: scheduleError } = await supabase
        .from('schedules')
        .insert({
          business_id: businessId,
          week_start_date: weekStartDate.toISOString().split('T')[0],
          status: 'DRAFT',
          optimization_score: optimizationResult.totalScore,
          coverage_score: optimizationResult.coverageScore,
          fairness_score: optimizationResult.fairnessScore,
          cost_score: optimizationResult.costScore,
          constraint_violations: optimizationResult.constraintViolations,
          recommendations: optimizationResult.recommendations
        })
        .select()
        .single();
      
      if (scheduleError) throw scheduleError;
      
      // Create shift records
      const shiftsToInsert = optimizationResult.shifts.map(shift => ({
        schedule_id: schedule.id,
        staff_id: shift.staffId,
        role_id: shift.roleId,
        date: shift.date,
        start_time: shift.startTime,
        end_time: shift.endTime,
        duration: shift.duration,
        optimization_score: shift.score,
        status: 'SCHEDULED'
      }));
      
      const { error: shiftsError } = await supabase
        .from('shifts')
        .insert(shiftsToInsert);
      
      if (shiftsError) throw shiftsError;
      
      return { success: true };
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to save schedule: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Get optimization history and analytics
   */
  static async getOptimizationAnalytics(businessId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const { data: schedules, error } = await supabase
        .from('schedules')
        .select(`
          id,
          week_start_date,
          optimization_score,
          coverage_score,
          fairness_score,
          cost_score,
          created_at,
          shifts(count)
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      // Calculate analytics
      const analytics = {
        totalSchedules: schedules?.length || 0,
        averageOptimizationScore: schedules?.reduce((acc, s) => acc + (s.optimization_score || 0), 0) / (schedules?.length || 1),
        averageCoverageScore: schedules?.reduce((acc, s) => acc + (s.coverage_score || 0), 0) / (schedules?.length || 1),
        averageFairnessScore: schedules?.reduce((acc, s) => acc + (s.fairness_score || 0), 0) / (schedules?.length || 1),
        averageCostScore: schedules?.reduce((acc, s) => acc + (s.cost_score || 0), 0) / (schedules?.length || 1),
        recentSchedules: schedules
      };
      
      return { success: true, data: analytics };
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch analytics: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}
