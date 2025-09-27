-- Add staff authentication and schedule management enhancements

-- Add user_type to distinguish between business owners and staff
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'owner' CHECK (user_type IN ('owner', 'staff'));

-- Create staff_users table to link staff records with auth users
CREATE TABLE IF NOT EXISTS public.staff_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(staff_id),
  UNIQUE(user_id)
);

-- Add schedule generation settings to businesses table
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS schedule_settings JSONB DEFAULT '{
  "maxHoursPerWeek": 40,
  "minHoursBetweenShifts": 12,
  "maxConsecutiveDays": 6,
  "preferredShiftLength": 8,
  "allowSplitShifts": false,
  "autoAssignShifts": true,
  "considerAvailability": true,
  "considerPreferences": true,
  "balanceWorkload": true
}';

-- Add AI generation metadata to schedules table
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS ai_generation_data JSONB DEFAULT '{}';
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS generation_parameters JSONB DEFAULT '{}';
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS optimization_score DECIMAL(5,2);

-- Create leave_requests table (enhanced version of time_off_requests)
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL DEFAULT 'vacation' CHECK (leave_type IN ('vacation', 'sick', 'personal', 'emergency', 'unpaid')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_partial_day BOOLEAN DEFAULT false,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewer_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create shift_templates table for recurring shift patterns
CREATE TABLE IF NOT EXISTS public.shift_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration DECIMAL(4,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create schedule_constraints table for business-specific scheduling rules
CREATE TABLE IF NOT EXISTS public.schedule_constraints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  constraint_type TEXT NOT NULL CHECK (constraint_type IN ('min_staff', 'max_staff', 'required_role', 'blocked_time', 'preferred_time')),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME,
  end_time TIME,
  role_id UUID REFERENCES public.roles(id),
  min_count INTEGER,
  max_count INTEGER,
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for new tables
ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_constraints ENABLE ROW LEVEL SECURITY;

-- RLS policies for staff_users
CREATE POLICY "Business owners can view staff users for their businesses" ON public.staff_users
  FOR SELECT USING (
    staff_id IN (
      SELECT id FROM public.staff 
      WHERE business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Staff can view their own staff user record" ON public.staff_users
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Business owners can manage staff users for their businesses" ON public.staff_users
  FOR ALL USING (
    staff_id IN (
      SELECT id FROM public.staff 
      WHERE business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    )
  );

-- RLS policies for leave_requests
CREATE POLICY "Business owners can view leave requests for their staff" ON public.leave_requests
  FOR SELECT USING (
    staff_id IN (
      SELECT id FROM public.staff 
      WHERE business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Staff can view their own leave requests" ON public.leave_requests
  FOR SELECT USING (
    staff_id IN (
      SELECT staff_id FROM public.staff_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can create their own leave requests" ON public.leave_requests
  FOR INSERT WITH CHECK (
    staff_id IN (
      SELECT staff_id FROM public.staff_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can manage leave requests for their staff" ON public.leave_requests
  FOR ALL USING (
    staff_id IN (
      SELECT id FROM public.staff 
      WHERE business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    )
  );

-- RLS policies for shift_templates
CREATE POLICY "Business owners can manage shift templates" ON public.shift_templates
  FOR ALL USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

-- RLS policies for schedule_constraints
CREATE POLICY "Business owners can manage schedule constraints" ON public.schedule_constraints
  FOR ALL USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

-- Staff can view shifts assigned to them
CREATE POLICY "Staff can view their own shifts" ON public.shifts
  FOR SELECT USING (
    staff_id IN (
      SELECT staff_id FROM public.staff_users WHERE user_id = auth.uid()
    )
  );

-- Create triggers for new tables
CREATE TRIGGER update_leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shift_templates_updated_at
  BEFORE UPDATE ON public.shift_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_schedule_constraints_updated_at
  BEFORE UPDATE ON public.schedule_constraints
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_staff_users_staff_id ON public.staff_users(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_users_user_id ON public.staff_users(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_staff_id ON public.leave_requests(staff_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON public.leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_shift_templates_business_id ON public.shift_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_shift_templates_day_of_week ON public.shift_templates(day_of_week);
CREATE INDEX IF NOT EXISTS idx_schedule_constraints_business_id ON public.schedule_constraints(business_id);

-- Function to create staff user account
CREATE OR REPLACE FUNCTION public.create_staff_user_account(
  staff_email TEXT,
  staff_name TEXT,
  business_owner_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
  staff_record_id UUID;
BEGIN
  -- Check if the requesting user owns a business
  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE user_id = business_owner_id) THEN
    RAISE EXCEPTION 'Only business owners can create staff accounts';
  END IF;

  -- Find the staff record
  SELECT id INTO staff_record_id
  FROM public.staff 
  WHERE email = staff_email 
    AND business_id IN (SELECT id FROM public.businesses WHERE user_id = business_owner_id);

  IF staff_record_id IS NULL THEN
    RAISE EXCEPTION 'Staff record not found or not owned by this business';
  END IF;

  -- Create auth user (this would typically be done through Supabase Auth API)
  -- For now, we'll return a placeholder
  -- In practice, you'd call the Supabase Auth API to create the user
  
  RETURN staff_record_id;
END;
$$;

-- Function to export schedule data for AI generation
CREATE OR REPLACE FUNCTION public.export_schedule_data_for_ai(
  business_id_param UUID,
  week_start_date_param DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  business_data JSONB;
  staff_data JSONB;
  roles_data JSONB;
  constraints_data JSONB;
  templates_data JSONB;
  leave_requests_data JSONB;
BEGIN
  -- Check if user owns the business
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE id = business_id_param AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get business settings
  SELECT to_jsonb(b.*) INTO business_data
  FROM public.businesses b
  WHERE b.id = business_id_param;

  -- Get staff data with availability and constraints
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'name', s.name,
      'email', s.email,
      'availability', s.availability,
      'constraints', s.constraints,
      'preferred_working_hours', s.preferred_working_hours,
      'shift_preferences', s.shift_preferences,
      'hourly_rate', s.hourly_rate,
      'roles', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'name', r.name,
            'hourly_rate', r.hourly_rate
          )
        )
        FROM public.roles r
        JOIN public.staff_roles sr ON r.id = sr.role_id
        WHERE sr.staff_id = s.id
      )
    )
  ) INTO staff_data
  FROM public.staff s
  WHERE s.business_id = business_id_param AND s.is_active = true;

  -- Get roles data
  SELECT jsonb_agg(to_jsonb(r.*)) INTO roles_data
  FROM public.roles r
  WHERE r.business_id = business_id_param;

  -- Get schedule constraints
  SELECT jsonb_agg(to_jsonb(sc.*)) INTO constraints_data
  FROM public.schedule_constraints sc
  WHERE sc.business_id = business_id_param AND sc.is_active = true;

  -- Get shift templates
  SELECT jsonb_agg(to_jsonb(st.*)) INTO templates_data
  FROM public.shift_templates st
  WHERE st.business_id = business_id_param AND st.is_active = true;

  -- Get approved leave requests for the week
  SELECT jsonb_agg(
    jsonb_build_object(
      'staff_id', lr.staff_id,
      'start_date', lr.start_date,
      'end_date', lr.end_date,
      'start_time', lr.start_time,
      'end_time', lr.end_time,
      'is_partial_day', lr.is_partial_day,
      'leave_type', lr.leave_type
    )
  ) INTO leave_requests_data
  FROM public.leave_requests lr
  JOIN public.staff s ON lr.staff_id = s.id
  WHERE s.business_id = business_id_param 
    AND lr.status = 'APPROVED'
    AND lr.start_date <= week_start_date_param + INTERVAL '6 days'
    AND lr.end_date >= week_start_date_param;

  -- Build the complete result
  result := jsonb_build_object(
    'business', business_data,
    'staff', COALESCE(staff_data, '[]'::jsonb),
    'roles', COALESCE(roles_data, '[]'::jsonb),
    'constraints', COALESCE(constraints_data, '[]'::jsonb),
    'templates', COALESCE(templates_data, '[]'::jsonb),
    'leave_requests', COALESCE(leave_requests_data, '[]'::jsonb),
    'week_start_date', week_start_date_param,
    'generated_at', now()
  );

  RETURN result;
END;
$$;
