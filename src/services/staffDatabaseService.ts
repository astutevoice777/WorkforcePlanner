import { supabase } from '@/integrations/supabase/client';

export interface StaffData {
  id: string;
  name: string;
  email: string;
  phone: string;
  business_id: string;
  is_active: boolean;
  availability?: any;
  constraints?: any;
  preferred_working_hours?: any;
  shift_preferences?: any;
  holiday_dates?: any;
  hourly_rate?: number;
  created_at: string;
  updated_at: string;
}

export interface ShiftData {
  id: string;
  staff_id: string;
  role_id: string;
  schedule_id: string;
  date: string;
  start_time: string;
  end_time: string;
  duration: number;
  pay_rate: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequestData {
  id: string;
  staff_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  is_partial_day: boolean;
  reason: string | null;
  status: string;
  requested_at: string;
  reviewed_at: string | null;
  reviewer_notes: string | null;
}

class StaffDatabaseService {
  /**
   * Test database connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('count')
        .limit(1);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error: any) {
      console.error('Database connection test failed:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to connect to database' 
      };
    }
  }

  /**
   * Get staff member by ID with full details
   */
  async getStaffById(staffId: string): Promise<{ data: StaffData | null; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select(`
          *,
          business:business_id (
            name,
            address
          )
        `)
        .eq('id', staffId)
        .eq('is_active', true)
        .single();

      if (error) {
        throw error;
      }

      return { data };
    } catch (error: any) {
      console.error('Error fetching staff data:', error);
      return { 
        data: null, 
        error: error.message || 'Failed to fetch staff data' 
      };
    }
  }

  /**
   * Get staff shifts with role and schedule information
   */
  async getStaffShifts(staffId: string, limit: number = 10): Promise<{ data: any[]; error?: string }> {
    try {
      // First try the enhanced query with better joins
      const { data, error } = await supabase
        .from('shifts')
        .select(`
          *,
          role:role_id (
            name,
            color,
            hourly_rate
          ),
          schedule:schedule_id (
            generated_by,
            status,
            week_start_date
          )
        `)
        .eq('staff_id', staffId)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(limit);

      if (error) {
        console.warn('Direct query failed, trying alternative approach:', error);
        
        // Fallback: Get shifts without joins first
        const { data: shiftsData, error: shiftsError } = await supabase
          .from('shifts')
          .select('*')
          .eq('staff_id', staffId)
          .gte('date', new Date().toISOString().split('T')[0])
          .order('date', { ascending: true })
          .order('start_time', { ascending: true })
          .limit(limit);

        if (shiftsError) {
          throw shiftsError;
        }

        // Manually fetch role and schedule data
        const enrichedShifts = await Promise.all(
          (shiftsData || []).map(async (shift) => {
            const [roleResult, scheduleResult] = await Promise.all([
              supabase.from('roles').select('name, color, hourly_rate').eq('id', shift.role_id).single(),
              supabase.from('schedules').select('generated_by, status, week_start_date').eq('id', shift.schedule_id).single()
            ]);

            return {
              ...shift,
              role: roleResult.data || { name: 'Unknown', color: '#gray', hourly_rate: 0 },
              schedule: scheduleResult.data || { generated_by: 'UNKNOWN', status: 'UNKNOWN', week_start_date: null }
            };
          })
        );

        return { data: enrichedShifts };
      }

      return { data: data || [] };
    } catch (error: any) {
      console.error('Error fetching staff shifts:', error);
      return { 
        data: [], 
        error: error.message || 'Failed to fetch shifts' 
      };
    }
  }

  /**
   * Get staff leave requests
   */
  async getStaffLeaveRequests(staffId: string, limit: number = 10): Promise<{ data: LeaveRequestData[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('staff_id', staffId)
        .order('requested_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return { data: data || [] };
    } catch (error: any) {
      console.error('Error fetching leave requests:', error);
      return { 
        data: [], 
        error: error.message || 'Failed to fetch leave requests' 
      };
    }
  }

  /**
   * Create a new leave request
   */
  async createLeaveRequest(requestData: Omit<LeaveRequestData, 'id' | 'status' | 'requested_at' | 'reviewed_at' | 'reviewer_notes'>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('leave_requests')
        .insert({
          ...requestData,
          status: 'PENDING'
        });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error creating leave request:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to create leave request' 
      };
    }
  }

  /**
   * Update staff profile information
   */
  async updateStaffProfile(staffId: string, updates: Partial<Pick<StaffData, 'name' | 'phone'>>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('staff')
        .update(updates)
        .eq('id', staffId);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error updating staff profile:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to update profile' 
      };
    }
  }

  /**
   * Get staff roles
   */
  async getStaffRoles(staffId: string): Promise<{ data: any[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('staff_roles')
        .select(`
          role:role_id (
            id,
            name,
            color,
            hourly_rate,
            description
          )
        `)
        .eq('staff_id', staffId);

      if (error) {
        throw error;
      }

      return { data: data?.map(sr => sr.role).filter(Boolean) || [] };
    } catch (error: any) {
      console.error('Error fetching staff roles:', error);
      return { 
        data: [], 
        error: error.message || 'Failed to fetch roles' 
      };
    }
  }

  /**
   * Get comprehensive staff dashboard data using database function
   */
  async getStaffDashboardData(staffEmail: string): Promise<{ data: any | null; error?: string }> {
    try {
      const { data, error } = await (supabase as any).rpc('get_staff_dashboard_data', {
        staff_email: staffEmail.toLowerCase()
      });

      if (error) {
        throw error;
      }

      return { data };
    } catch (error: any) {
      console.error('Error fetching staff dashboard data:', error);
      // Fallback to individual queries if function fails
      return this.getStaffDashboardDataFallback(staffEmail);
    }
  }

  /**
   * Fallback method for getting staff dashboard data
   */
  private async getStaffDashboardDataFallback(staffEmail: string): Promise<{ data: any | null; error?: string }> {
    try {
      // Get staff record first
      const staffResult = await this.validateStaff(staffEmail);
      if (staffResult.error || !staffResult.data) {
        return { data: null, error: staffResult.error || 'Staff not found' };
      }

      const staffId = staffResult.data.id!;

      // Get all data in parallel
      const [shiftsResult, leaveResult, rolesResult] = await Promise.all([
        this.getStaffShifts(staffId, 20),
        this.getStaffLeaveRequests(staffId, 10),
        this.getStaffRoles(staffId)
      ]);

      return {
        data: {
          staff: staffResult.data,
          shifts: shiftsResult.data || [],
          leave_requests: leaveResult.data || [],
          roles: rolesResult.data || [],
          generated_at: new Date().toISOString()
        }
      };
    } catch (error: any) {
      console.error('Error in fallback dashboard data fetch:', error);
      return {
        data: null,
        error: error.message || 'Failed to fetch dashboard data'
      };
    }
  }

  /**
   * Create leave request using database function
   */
  async createLeaveRequestWithFunction(
    staffEmail: string,
    requestData: {
      leave_type: string;
      start_date: string;
      end_date: string;
      start_time?: string;
      end_time?: string;
      is_partial_day?: boolean;
      reason?: string;
    }
  ): Promise<{ success: boolean; requestId?: string; error?: string }> {
    try {
      const { data, error } = await (supabase as any).rpc('create_staff_leave_request', {
        staff_email: staffEmail.toLowerCase(),
        leave_type_param: requestData.leave_type,
        start_date_param: requestData.start_date,
        end_date_param: requestData.end_date,
        start_time_param: requestData.start_time || null,
        end_time_param: requestData.end_time || null,
        is_partial_day_param: requestData.is_partial_day || false,
        reason_param: requestData.reason || null
      });

      if (error) {
        throw error;
      }

      return { success: true, requestId: data };
    } catch (error: any) {
      console.error('Error creating leave request with function:', error);
      // Fallback to direct insert - get staff ID first
      const staffResult = await this.validateStaff(staffEmail);
      if (staffResult.error || !staffResult.data?.id) {
        return { success: false, error: 'Staff not found' };
      }

      return this.createLeaveRequest({
        staff_id: staffResult.data.id,
        leave_type: requestData.leave_type,
        start_date: requestData.start_date,
        end_date: requestData.end_date,
        start_time: requestData.start_time || null,
        end_time: requestData.end_time || null,
        is_partial_day: requestData.is_partial_day || false,
        reason: requestData.reason || null
      });
    }
  }

  /**
   * Validate staff exists and is active
   */
  async validateStaff(email: string): Promise<{ data: Partial<StaffData> | null; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('id, name, email, business_id, is_active, phone, created_at, updated_at')
        .eq('email', email.toLowerCase())
        .eq('is_active', true)
        .single();

      if (error) {
        throw error;
      }

      return { data };
    } catch (error: any) {
      console.error('Error validating staff:', error);
      return { 
        data: null, 
        error: error.message || 'Staff validation failed' 
      };
    }
  }
}

export const staffDatabaseService = new StaffDatabaseService();
