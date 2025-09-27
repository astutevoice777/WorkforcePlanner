-- Add payroll-related tables

-- Create payroll_periods table
CREATE TABLE public.payroll_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PROCESSING', 'COMPLETED', 'PAID')),
  total_hours DECIMAL(10,2) DEFAULT 0,
  total_gross_pay DECIMAL(12,2) DEFAULT 0,
  total_deductions DECIMAL(12,2) DEFAULT 0,
  total_net_pay DECIMAL(12,2) DEFAULT 0,
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payroll_entries table
CREATE TABLE public.payroll_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_period_id UUID NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  regular_hours DECIMAL(10,2) DEFAULT 0,
  overtime_hours DECIMAL(10,2) DEFAULT 0,
  holiday_hours DECIMAL(10,2) DEFAULT 0,
  regular_rate DECIMAL(10,2) NOT NULL,
  overtime_rate DECIMAL(10,2),
  holiday_rate DECIMAL(10,2),
  gross_pay DECIMAL(12,2) DEFAULT 0,
  tax_deductions DECIMAL(12,2) DEFAULT 0,
  other_deductions DECIMAL(12,2) DEFAULT 0,
  net_pay DECIMAL(12,2) DEFAULT 0,
  bonus DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payroll_deductions table for tracking various deductions
CREATE TABLE public.payroll_deductions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_entry_id UUID NOT NULL REFERENCES public.payroll_entries(id) ON DELETE CASCADE,
  deduction_type TEXT NOT NULL CHECK (deduction_type IN ('TAX', 'INSURANCE', 'RETIREMENT', 'OTHER')),
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  is_percentage BOOLEAN DEFAULT false,
  percentage DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payroll_reports table for storing generated reports
CREATE TABLE public.payroll_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  payroll_period_id UUID REFERENCES public.payroll_periods(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('SUMMARY', 'DETAILED', 'TAX', 'EXPORT')),
  report_data JSONB NOT NULL,
  generated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payroll_periods
CREATE POLICY "Users can view payroll periods for their businesses" ON public.payroll_periods
  FOR SELECT USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert payroll periods for their businesses" ON public.payroll_periods
  FOR INSERT WITH CHECK (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update payroll periods for their businesses" ON public.payroll_periods
  FOR UPDATE USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete payroll periods for their businesses" ON public.payroll_periods
  FOR DELETE USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

-- Create RLS policies for payroll_entries
CREATE POLICY "Users can view payroll entries for their businesses" ON public.payroll_entries
  FOR SELECT USING (
    payroll_period_id IN (
      SELECT id FROM public.payroll_periods 
      WHERE business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert payroll entries for their businesses" ON public.payroll_entries
  FOR INSERT WITH CHECK (
    payroll_period_id IN (
      SELECT id FROM public.payroll_periods 
      WHERE business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update payroll entries for their businesses" ON public.payroll_entries
  FOR UPDATE USING (
    payroll_period_id IN (
      SELECT id FROM public.payroll_periods 
      WHERE business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete payroll entries for their businesses" ON public.payroll_entries
  FOR DELETE USING (
    payroll_period_id IN (
      SELECT id FROM public.payroll_periods 
      WHERE business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    )
  );

-- Create RLS policies for payroll_deductions
CREATE POLICY "Users can view payroll deductions for their businesses" ON public.payroll_deductions
  FOR SELECT USING (
    payroll_entry_id IN (
      SELECT pe.id FROM public.payroll_entries pe
      JOIN public.payroll_periods pp ON pe.payroll_period_id = pp.id
      WHERE pp.business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert payroll deductions for their businesses" ON public.payroll_deductions
  FOR INSERT WITH CHECK (
    payroll_entry_id IN (
      SELECT pe.id FROM public.payroll_entries pe
      JOIN public.payroll_periods pp ON pe.payroll_period_id = pp.id
      WHERE pp.business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update payroll deductions for their businesses" ON public.payroll_deductions
  FOR UPDATE USING (
    payroll_entry_id IN (
      SELECT pe.id FROM public.payroll_entries pe
      JOIN public.payroll_periods pp ON pe.payroll_period_id = pp.id
      WHERE pp.business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete payroll deductions for their businesses" ON public.payroll_deductions
  FOR DELETE USING (
    payroll_entry_id IN (
      SELECT pe.id FROM public.payroll_entries pe
      JOIN public.payroll_periods pp ON pe.payroll_period_id = pp.id
      WHERE pp.business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    )
  );

-- Create RLS policies for payroll_reports
CREATE POLICY "Users can view payroll reports for their businesses" ON public.payroll_reports
  FOR SELECT USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert payroll reports for their businesses" ON public.payroll_reports
  FOR INSERT WITH CHECK (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update payroll reports for their businesses" ON public.payroll_reports
  FOR UPDATE USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete payroll reports for their businesses" ON public.payroll_reports
  FOR DELETE USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_payroll_periods_updated_at
  BEFORE UPDATE ON public.payroll_periods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payroll_entries_updated_at
  BEFORE UPDATE ON public.payroll_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_payroll_periods_business_id ON public.payroll_periods(business_id);
CREATE INDEX idx_payroll_periods_dates ON public.payroll_periods(period_start, period_end);
CREATE INDEX idx_payroll_entries_period_id ON public.payroll_entries(payroll_period_id);
CREATE INDEX idx_payroll_entries_staff_id ON public.payroll_entries(staff_id);
CREATE INDEX idx_payroll_deductions_entry_id ON public.payroll_deductions(payroll_entry_id);
CREATE INDEX idx_payroll_reports_business_id ON public.payroll_reports(business_id);

-- Create function to calculate payroll automatically from shifts
CREATE OR REPLACE FUNCTION public.calculate_payroll_from_shifts(
  p_business_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS UUID AS $$
DECLARE
  v_payroll_period_id UUID;
  v_staff_record RECORD;
  v_shift_record RECORD;
  v_regular_hours DECIMAL(10,2);
  v_overtime_hours DECIMAL(10,2);
  v_gross_pay DECIMAL(12,2);
  v_net_pay DECIMAL(12,2);
BEGIN
  -- Create payroll period
  INSERT INTO public.payroll_periods (business_id, period_start, period_end, status)
  VALUES (p_business_id, p_period_start, p_period_end, 'DRAFT')
  RETURNING id INTO v_payroll_period_id;

  -- Calculate payroll for each staff member
  FOR v_staff_record IN 
    SELECT DISTINCT s.id, s.name
    FROM public.staff s
    WHERE s.business_id = p_business_id AND s.is_active = true
  LOOP
    v_regular_hours := 0;
    v_overtime_hours := 0;
    v_gross_pay := 0;

    -- Sum up hours from shifts in the period
    FOR v_shift_record IN
      SELECT sh.duration, sh.pay_rate
      FROM public.shifts sh
      JOIN public.schedules sc ON sh.schedule_id = sc.id
      WHERE sc.business_id = p_business_id
        AND sh.staff_id = v_staff_record.id
        AND sh.date >= p_period_start
        AND sh.date <= p_period_end
        AND sh.status IN ('CONFIRMED', 'COMPLETED')
    LOOP
      -- Simple calculation: first 40 hours are regular, rest is overtime
      IF v_regular_hours < 40 THEN
        IF v_regular_hours + v_shift_record.duration <= 40 THEN
          v_regular_hours := v_regular_hours + v_shift_record.duration;
          v_gross_pay := v_gross_pay + (v_shift_record.duration * v_shift_record.pay_rate);
        ELSE
          -- Split between regular and overtime
          DECLARE
            v_remaining_regular DECIMAL(10,2) := 40 - v_regular_hours;
            v_overtime_portion DECIMAL(10,2) := v_shift_record.duration - v_remaining_regular;
          BEGIN
            v_regular_hours := 40;
            v_overtime_hours := v_overtime_hours + v_overtime_portion;
            v_gross_pay := v_gross_pay + 
              (v_remaining_regular * v_shift_record.pay_rate) + 
              (v_overtime_portion * v_shift_record.pay_rate * 1.5);
          END;
        END IF;
      ELSE
        -- All overtime
        v_overtime_hours := v_overtime_hours + v_shift_record.duration;
        v_gross_pay := v_gross_pay + (v_shift_record.duration * v_shift_record.pay_rate * 1.5);
      END IF;
    END LOOP;

    -- Simple tax calculation (15% for demo)
    v_net_pay := v_gross_pay * 0.85;

    -- Insert payroll entry if staff worked any hours
    IF v_regular_hours > 0 OR v_overtime_hours > 0 THEN
      INSERT INTO public.payroll_entries (
        payroll_period_id,
        staff_id,
        regular_hours,
        overtime_hours,
        regular_rate,
        overtime_rate,
        gross_pay,
        tax_deductions,
        net_pay
      ) VALUES (
        v_payroll_period_id,
        v_staff_record.id,
        v_regular_hours,
        v_overtime_hours,
        COALESCE((SELECT AVG(pay_rate) FROM public.shifts sh JOIN public.schedules sc ON sh.schedule_id = sc.id 
                  WHERE sc.business_id = p_business_id AND sh.staff_id = v_staff_record.id), 15.00),
        COALESCE((SELECT AVG(pay_rate) FROM public.shifts sh JOIN public.schedules sc ON sh.schedule_id = sc.id 
                  WHERE sc.business_id = p_business_id AND sh.staff_id = v_staff_record.id), 15.00) * 1.5,
        v_gross_pay,
        v_gross_pay * 0.15,
        v_net_pay
      );
    END IF;
  END LOOP;

  -- Update payroll period totals
  UPDATE public.payroll_periods
  SET 
    total_hours = (SELECT COALESCE(SUM(regular_hours + overtime_hours), 0) FROM public.payroll_entries WHERE payroll_period_id = v_payroll_period_id),
    total_gross_pay = (SELECT COALESCE(SUM(gross_pay), 0) FROM public.payroll_entries WHERE payroll_period_id = v_payroll_period_id),
    total_deductions = (SELECT COALESCE(SUM(tax_deductions + other_deductions), 0) FROM public.payroll_entries WHERE payroll_period_id = v_payroll_period_id),
    total_net_pay = (SELECT COALESCE(SUM(net_pay), 0) FROM public.payroll_entries WHERE payroll_period_id = v_payroll_period_id)
  WHERE id = v_payroll_period_id;

  RETURN v_payroll_period_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
