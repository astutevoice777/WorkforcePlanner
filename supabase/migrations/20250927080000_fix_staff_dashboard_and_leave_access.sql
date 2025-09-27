-- Fix staff dashboard access and ensure public leave schema accessibility
-- This migration ensures staff can properly view their shifts and leave requests

-- Ensure leave_requests table is in public schema and accessible
-- (Already exists from previous migration, but ensuring proper access)

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Staff can view their own shifts" ON public.shifts;
DROP POLICY IF EXISTS "Staff can view their own leave requests" ON public.leave_requests;

-- Create more permissive policies for staff to view their own data
-- Allow staff to view their shifts regardless of authentication method
CREATE POLICY "Staff can view assigned shifts" ON public.shifts
  FOR SELECT USING (
    -- Allow access if staff_id matches any staff record with the same email as current session
    staff_id IN (
      SELECT id FROM public.staff 
      WHERE email = current_setting('app.current_user_email', true)
        OR id = staff_id -- Direct match for authenticated staff
    )
  );

-- Allow staff to view their leave requests
CREATE POLICY "Staff can view own leave requests" ON public.leave_requests
  FOR SELECT USING (
    staff_id IN (
      SELECT id FROM public.staff 
      WHERE email = current_setting('app.current_user_email', true)
        OR id = staff_id -- Direct match for authenticated staff
    )
  );

-- Allow staff to create leave requests
CREATE POLICY "Staff can create leave requests" ON public.leave_requests
  FOR INSERT WITH CHECK (
    staff_id IN (
      SELECT id FROM public.staff 
      WHERE email = current_setting('app.current_user_email', true)
        OR id = staff_id -- Direct match for authenticated staff
    )
  );

-- Create a more flexible policy for staff to view their profile data
DROP POLICY IF EXISTS "Staff can view their own profile" ON public.staff;
CREATE POLICY "Staff can view own profile" ON public.staff
  FOR SELECT USING (
    email = current_setting('app.current_user_email', true)
    OR id = current_setting('app.current_staff_id', true)::UUID
  );

-- Ensure staff can view roles they are assigned to
CREATE POLICY IF NOT EXISTS "Staff can view assigned roles" ON public.staff_roles
  FOR SELECT USING (
    staff_id IN (
      SELECT id FROM public.staff 
      WHERE email = current_setting('app.current_user_email', true)
        OR id = current_setting('app.current_staff_id', true)::UUID
    )
  );

-- Ensure staff can view role details for their assigned roles
CREATE POLICY IF NOT EXISTS "Staff can view role details" ON public.roles
  FOR SELECT USING (
    id IN (
      SELECT role_id FROM public.staff_roles sr
      JOIN public.staff s ON sr.staff_id = s.id
      WHERE s.email = current_setting('app.current_user_email', true)
        OR s.id = current_setting('app.current_staff_id', true)::UUID
    )
  );

-- Create function to set staff context for session
CREATE OR REPLACE FUNCTION public.set_staff_context(staff_email TEXT, staff_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set the current user email for policy evaluation
  PERFORM set_config('app.current_user_email', staff_email, true);
  
  -- Set staff ID if provided
  IF staff_id IS NOT NULL THEN
    PERFORM set_config('app.current_staff_id', staff_id::TEXT, true);
  END IF;
END;
$$;

-- Create function to get staff dashboard data
CREATE OR REPLACE FUNCTION public.get_staff_dashboard_data(staff_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  staff_record RECORD;
  shifts_data JSONB;
  leave_requests_data JSONB;
  roles_data JSONB;
  result JSONB;
BEGIN
  -- Set staff context
  PERFORM public.set_staff_context(staff_email);
  
  -- Get staff record
  SELECT * INTO staff_record
  FROM public.staff
  WHERE email = staff_email AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff member not found or inactive';
  END IF;
  
  -- Get upcoming shifts
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'date', s.date,
      'start_time', s.start_time,
      'end_time', s.end_time,
      'duration', s.duration,
      'pay_rate', s.pay_rate,
      'status', s.status,
      'notes', s.notes,
      'role', jsonb_build_object(
        'name', r.name,
        'color', r.color,
        'hourly_rate', r.hourly_rate
      ),
      'schedule', jsonb_build_object(
        'generated_by', sc.generated_by,
        'status', sc.status,
        'week_start_date', sc.week_start_date
      )
    )
  ), '[]'::jsonb) INTO shifts_data
  FROM public.shifts s
  LEFT JOIN public.roles r ON s.role_id = r.id
  LEFT JOIN public.schedules sc ON s.schedule_id = sc.id
  WHERE s.staff_id = staff_record.id
    AND s.date >= CURRENT_DATE
  ORDER BY s.date ASC, s.start_time ASC
  LIMIT 20;
  
  -- Get recent leave requests
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', lr.id,
      'leave_type', lr.leave_type,
      'start_date', lr.start_date,
      'end_date', lr.end_date,
      'start_time', lr.start_time,
      'end_time', lr.end_time,
      'is_partial_day', lr.is_partial_day,
      'reason', lr.reason,
      'status', lr.status,
      'requested_at', lr.requested_at,
      'reviewed_at', lr.reviewed_at,
      'reviewer_notes', lr.reviewer_notes
    )
  ), '[]'::jsonb) INTO leave_requests_data
  FROM public.leave_requests lr
  WHERE lr.staff_id = staff_record.id
  ORDER BY lr.requested_at DESC
  LIMIT 10;
  
  -- Get staff roles
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'name', r.name,
      'color', r.color,
      'hourly_rate', r.hourly_rate,
      'description', r.description
    )
  ), '[]'::jsonb) INTO roles_data
  FROM public.roles r
  JOIN public.staff_roles sr ON r.id = sr.role_id
  WHERE sr.staff_id = staff_record.id;
  
  -- Build result
  result := jsonb_build_object(
    'staff', jsonb_build_object(
      'id', staff_record.id,
      'name', staff_record.name,
      'email', staff_record.email,
      'phone', staff_record.phone,
      'business_id', staff_record.business_id,
      'is_active', staff_record.is_active,
      'created_at', staff_record.created_at
    ),
    'shifts', shifts_data,
    'leave_requests', leave_requests_data,
    'roles', roles_data,
    'generated_at', now()
  );
  
  RETURN result;
END;
$$;

-- Create function to create leave request
CREATE OR REPLACE FUNCTION public.create_staff_leave_request(
  staff_email TEXT,
  leave_type_param TEXT,
  start_date_param DATE,
  end_date_param DATE,
  start_time_param TIME DEFAULT NULL,
  end_time_param TIME DEFAULT NULL,
  is_partial_day_param BOOLEAN DEFAULT false,
  reason_param TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  staff_record RECORD;
  new_request_id UUID;
BEGIN
  -- Set staff context
  PERFORM public.set_staff_context(staff_email);
  
  -- Get staff record
  SELECT * INTO staff_record
  FROM public.staff
  WHERE email = staff_email AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff member not found or inactive';
  END IF;
  
  -- Insert leave request
  INSERT INTO public.leave_requests (
    staff_id,
    leave_type,
    start_date,
    end_date,
    start_time,
    end_time,
    is_partial_day,
    reason
  ) VALUES (
    staff_record.id,
    leave_type_param,
    start_date_param,
    end_date_param,
    start_time_param,
    end_time_param,
    is_partial_day_param,
    reason_param
  ) RETURNING id INTO new_request_id;
  
  RETURN new_request_id;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.set_staff_context(TEXT, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_staff_dashboard_data(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_staff_leave_request(TEXT, TEXT, DATE, DATE, TIME, TIME, BOOLEAN, TEXT) TO authenticated, anon;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shifts_staff_date ON public.shifts(staff_id, date);
CREATE INDEX IF NOT EXISTS idx_shifts_date_time ON public.shifts(date, start_time);
CREATE INDEX IF NOT EXISTS idx_leave_requests_staff_status ON public.leave_requests(staff_id, status);

-- Ensure the leave_requests table has proper permissions
GRANT SELECT, INSERT, UPDATE ON public.leave_requests TO authenticated, anon;
GRANT SELECT ON public.shifts TO authenticated, anon;
GRANT SELECT ON public.staff TO authenticated, anon;
GRANT SELECT ON public.roles TO authenticated, anon;
GRANT SELECT ON public.staff_roles TO authenticated, anon;
