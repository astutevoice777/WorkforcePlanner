-- Add new columns to staff table for hourly rate and max hours per week
ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_hours_per_week INTEGER NOT NULL DEFAULT 40;

-- Optional: comment for documentation
COMMENT ON COLUMN public.staff.hourly_rate IS 'Default hourly rate for this staff member (can be overridden per shift if needed)';
COMMENT ON COLUMN public.staff.max_hours_per_week IS 'Maximum hours this staff member is available per week';
