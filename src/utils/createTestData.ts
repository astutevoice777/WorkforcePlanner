import { supabase } from '@/integrations/supabase/client';

export async function createTestShifts(businessId: string, staffId: string, roleId: string) {
  try {
    // Create a test schedule first
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .insert({
        business_id: businessId,
        week_start_date: new Date().toISOString().split('T')[0],
        status: 'DRAFT',
        generated_by: 'TEST',
      })
      .select()
      .single();

    if (scheduleError) throw scheduleError;

    // Create some test shifts for the next few days
    const testShifts = [];
    const today = new Date();
    
    for (let i = 0; i < 5; i++) {
      const shiftDate = new Date(today);
      shiftDate.setDate(today.getDate() + i);
      
      testShifts.push({
        schedule_id: schedule.id,
        staff_id: staffId,
        role_id: roleId,
        date: shiftDate.toISOString().split('T')[0],
        start_time: '09:00',
        end_time: '17:00',
        duration: 8,
        status: 'SCHEDULED',
        pay_rate: 15.00,
        notes: 'Test shift'
      });
    }

    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .insert(testShifts)
      .select();

    if (shiftsError) throw shiftsError;

    console.log('Test shifts created:', shifts);
    return { schedule, shifts };
  } catch (error) {
    console.error('Error creating test data:', error);
    throw error;
  }
}

export async function createTestLeaveRequest(staffId: string) {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const { data: leaveRequest, error } = await supabase
      .from('leave_requests')
      .insert({
        staff_id: staffId,
        leave_type: 'vacation',
        start_date: tomorrow.toISOString().split('T')[0],
        end_date: tomorrow.toISOString().split('T')[0],
        is_partial_day: false,
        reason: 'Test leave request',
        status: 'PENDING'
      })
      .select()
      .single();

    if (error) throw error;

    console.log('Test leave request created:', leaveRequest);
    return leaveRequest;
  } catch (error) {
    console.error('Error creating test leave request:', error);
    throw error;
  }
}
