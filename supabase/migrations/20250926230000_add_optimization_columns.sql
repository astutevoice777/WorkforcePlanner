-- Add optimization tracking columns to schedules table
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS optimization_score DECIMAL(5,2) DEFAULT 0;
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS coverage_score DECIMAL(5,2) DEFAULT 0;
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS fairness_score DECIMAL(5,2) DEFAULT 0;
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS cost_score DECIMAL(5,2) DEFAULT 0;
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS constraint_violations TEXT[] DEFAULT '{}';
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS recommendations TEXT[] DEFAULT '{}';

-- Add optimization score column to shifts table
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS optimization_score DECIMAL(5,2) DEFAULT 0;

-- Create index for optimization queries
CREATE INDEX IF NOT EXISTS idx_schedules_optimization_score ON public.schedules(optimization_score);
CREATE INDEX IF NOT EXISTS idx_shifts_optimization_score ON public.shifts(optimization_score);
