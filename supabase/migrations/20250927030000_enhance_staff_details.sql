-- Enhance staff table with comprehensive details
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS preferred_working_hours JSONB DEFAULT '{}';
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS shift_preferences JSONB DEFAULT '{}';
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS holiday_dates JSONB DEFAULT '[]';
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2);
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS salary_type TEXT DEFAULT 'hourly' CHECK (salary_type IN ('hourly', 'fixed', 'per_shift'));
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS fixed_salary DECIMAL(12,2);
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS per_shift_rate DECIMAL(10,2);
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update constraints to include more detailed information
-- The constraints JSONB field will now include:
-- {
--   "maxHoursPerDay": 8,
--   "maxHoursPerWeek": 40,
--   "minHoursBetweenShifts": 12,
--   "preferredShifts": ["morning", "evening", "night"],
--   "blockedShifts": ["night"]
-- }

-- Update availability to include more detailed time slots
-- The availability JSONB field will now include:
-- {
--   "monday": [{"start": "09:00", "end": "17:00"}],
--   "tuesday": [{"start": "09:00", "end": "17:00"}],
--   ...
-- }

-- Update preferred_working_hours to include:
-- {
--   "preferredStart": "09:00",
--   "preferredEnd": "17:00",
--   "flexibleHours": true
-- }

-- Update shift_preferences to include:
-- {
--   "preferred": ["morning", "afternoon"],
--   "blocked": ["night"],
--   "canWorkWeekends": true,
--   "canWorkHolidays": false
-- }

-- Create index for better performance on new fields
CREATE INDEX IF NOT EXISTS idx_staff_position ON public.staff(position);
CREATE INDEX IF NOT EXISTS idx_staff_salary_type ON public.staff(salary_type);
CREATE INDEX IF NOT EXISTS idx_staff_start_date ON public.staff(start_date);
