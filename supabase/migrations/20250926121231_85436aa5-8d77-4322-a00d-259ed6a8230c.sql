-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create businesses table
CREATE TABLE public.businesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  business_hours JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create roles table (linked to businesses)
CREATE TABLE public.roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  hourly_rate DECIMAL(10,2) DEFAULT 15.00,
  min_staff_required INTEGER NOT NULL DEFAULT 1,
  max_staff_allowed INTEGER NOT NULL DEFAULT 2,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create staff table
CREATE TABLE public.staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  availability JSONB NOT NULL DEFAULT '{}',
  constraints JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create staff_roles junction table (many-to-many)
CREATE TABLE public.staff_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(staff_id, role_id)
);

-- Create schedules table
CREATE TABLE public.schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  generated_by TEXT NOT NULL DEFAULT 'MANUAL' CHECK (generated_by IN ('AI', 'MANUAL')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id)
);

-- Create shifts table
CREATE TABLE public.shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration DECIMAL(4,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'CONFIRMED', 'CANCELLED', 'COMPLETED')),
  notes TEXT,
  pay_rate DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create time_off_requests table
CREATE TABLE public.time_off_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for businesses
CREATE POLICY "Users can view their own businesses" ON public.businesses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own businesses" ON public.businesses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own businesses" ON public.businesses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own businesses" ON public.businesses
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for roles
CREATE POLICY "Users can view roles for their businesses" ON public.roles
  FOR SELECT USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert roles for their businesses" ON public.roles
  FOR INSERT WITH CHECK (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update roles for their businesses" ON public.roles
  FOR UPDATE USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete roles for their businesses" ON public.roles
  FOR DELETE USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

-- Create RLS policies for staff
CREATE POLICY "Users can view staff for their businesses" ON public.staff
  FOR SELECT USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert staff for their businesses" ON public.staff
  FOR INSERT WITH CHECK (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update staff for their businesses" ON public.staff
  FOR UPDATE USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete staff for their businesses" ON public.staff
  FOR DELETE USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

-- Create RLS policies for staff_roles
CREATE POLICY "Users can view staff roles for their businesses" ON public.staff_roles
  FOR SELECT USING (
    staff_id IN (
      SELECT id FROM public.staff 
      WHERE business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert staff roles for their businesses" ON public.staff_roles
  FOR INSERT WITH CHECK (
    staff_id IN (
      SELECT id FROM public.staff 
      WHERE business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update staff roles for their businesses" ON public.staff_roles
  FOR UPDATE USING (
    staff_id IN (
      SELECT id FROM public.staff 
      WHERE business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete staff roles for their businesses" ON public.staff_roles
  FOR DELETE USING (
    staff_id IN (
      SELECT id FROM public.staff 
      WHERE business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    )
  );

-- Create RLS policies for schedules
CREATE POLICY "Users can view schedules for their businesses" ON public.schedules
  FOR SELECT USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert schedules for their businesses" ON public.schedules
  FOR INSERT WITH CHECK (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update schedules for their businesses" ON public.schedules
  FOR UPDATE USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete schedules for their businesses" ON public.schedules
  FOR DELETE USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

-- Create RLS policies for shifts
CREATE POLICY "Users can view shifts for their businesses" ON public.shifts
  FOR SELECT USING (
    schedule_id IN (
      SELECT id FROM public.schedules 
      WHERE business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert shifts for their businesses" ON public.shifts
  FOR INSERT WITH CHECK (
    schedule_id IN (
      SELECT id FROM public.schedules 
      WHERE business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update shifts for their businesses" ON public.shifts
  FOR UPDATE USING (
    schedule_id IN (
      SELECT id FROM public.schedules 
      WHERE business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete shifts for their businesses" ON public.shifts
  FOR DELETE USING (
    schedule_id IN (
      SELECT id FROM public.schedules 
      WHERE business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    )
  );

-- Create RLS policies for time_off_requests
CREATE POLICY "Users can view time off requests for their staff" ON public.time_off_requests
  FOR SELECT USING (
    staff_id IN (
      SELECT id FROM public.staff 
      WHERE business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert time off requests for their staff" ON public.time_off_requests
  FOR INSERT WITH CHECK (
    staff_id IN (
      SELECT id FROM public.staff 
      WHERE business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update time off requests for their staff" ON public.time_off_requests
  FOR UPDATE USING (
    staff_id IN (
      SELECT id FROM public.staff 
      WHERE business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete time off requests for their staff" ON public.time_off_requests
  FOR DELETE USING (
    staff_id IN (
      SELECT id FROM public.staff 
      WHERE business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    )
  );

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_updated_at
  BEFORE UPDATE ON public.staff
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at
  BEFORE UPDATE ON public.schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_businesses_user_id ON public.businesses(user_id);
CREATE INDEX idx_roles_business_id ON public.roles(business_id);
CREATE INDEX idx_staff_business_id ON public.staff(business_id);
CREATE INDEX idx_staff_roles_staff_id ON public.staff_roles(staff_id);
CREATE INDEX idx_staff_roles_role_id ON public.staff_roles(role_id);
CREATE INDEX idx_schedules_business_id ON public.schedules(business_id);
CREATE INDEX idx_shifts_schedule_id ON public.shifts(schedule_id);
CREATE INDEX idx_shifts_staff_id ON public.shifts(staff_id);
CREATE INDEX idx_shifts_date ON public.shifts(date);
CREATE INDEX idx_time_off_requests_staff_id ON public.time_off_requests(staff_id);