import { supabase } from '@/integrations/supabase/client';

export interface LeaveRequest {
  id: string;
  staff_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  is_partial_day: boolean;
  status: string;
}

export async function getApprovedLeaveRequests(businessId: string, weekStartDate: Date, weekEndDate: Date): Promise<LeaveRequest[]> {
  try {
    const { data: leaveRequests, error } = await supabase
      .from('leave_requests')
      .select(`
        *,
        staff:staff_id!inner (
          business_id
        )
      `)
      .eq('staff.business_id', businessId)
      .eq('status', 'APPROVED')
      .or(`start_date.lte.${weekEndDate.toISOString().split('T')[0]},end_date.gte.${weekStartDate.toISOString().split('T')[0]}`);

    if (error) throw error;
    return leaveRequests || [];
  } catch (error) {
    console.error('Error fetching approved leave requests:', error);
    return [];
  }
}

export function isStaffOnLeave(staffId: string, date: Date, leaveRequests: LeaveRequest[]): boolean {
  const dateStr = date.toISOString().split('T')[0];
  
  return leaveRequests.some(request => {
    if (request.staff_id !== staffId) return false;
    
    const startDate = new Date(request.start_date);
    const endDate = new Date(request.end_date);
    const checkDate = new Date(dateStr);
    
    return checkDate >= startDate && checkDate <= endDate;
  });
}

export function getStaffPartialLeaveHours(staffId: string, date: Date, leaveRequests: LeaveRequest[]): { startTime?: string; endTime?: string } | null {
  const dateStr = date.toISOString().split('T')[0];
  
  const partialLeave = leaveRequests.find(request => {
    if (request.staff_id !== staffId || !request.is_partial_day) return false;
    
    const startDate = new Date(request.start_date);
    const endDate = new Date(request.end_date);
    const checkDate = new Date(dateStr);
    
    return checkDate >= startDate && checkDate <= endDate;
  });
  
  if (partialLeave && partialLeave.start_time && partialLeave.end_time) {
    return {
      startTime: partialLeave.start_time,
      endTime: partialLeave.end_time
    };
  }
  
  return null;
}
