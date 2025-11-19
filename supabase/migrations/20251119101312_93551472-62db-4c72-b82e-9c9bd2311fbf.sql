-- Create consolidated attendance coverage table
CREATE TABLE IF NOT EXISTS public.attendance_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code TEXT NOT NULL,
  coverage_date DATE NOT NULL,
  coverage_type TEXT NOT NULL,
  coverage_reason TEXT NOT NULL,
  approval_status TEXT NOT NULL,
  source_id UUID NOT NULL,
  source_table TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_code, coverage_date, source_id)
);

CREATE INDEX IF NOT EXISTS idx_coverage_employee_date ON public.attendance_coverage(employee_code, coverage_date);
CREATE INDEX IF NOT EXISTS idx_coverage_date ON public.attendance_coverage(coverage_date);

ALTER TABLE public.attendance_coverage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view coverage"
ON public.attendance_coverage FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Function to expand leave date ranges
CREATE OR REPLACE FUNCTION public.expand_leave_dates(
  p_employee_code TEXT,
  p_from_date DATE,
  p_to_date DATE,
  p_leave_type TEXT,
  p_approval_status TEXT,
  p_source_id UUID
)
RETURNS VOID AS $$
DECLARE
  loop_date DATE;
BEGIN
  loop_date := p_from_date;
  
  WHILE loop_date <= p_to_date LOOP
    INSERT INTO public.attendance_coverage (
      employee_code, coverage_date, coverage_type, coverage_reason,
      approval_status, source_id, source_table
    ) VALUES (
      p_employee_code, loop_date, 'Leave', p_leave_type,
      p_approval_status, p_source_id, 'leave_records'
    )
    ON CONFLICT (employee_code, coverage_date, source_id) 
    DO UPDATE SET
      coverage_reason = EXCLUDED.coverage_reason,
      approval_status = EXCLUDED.approval_status,
      updated_at = NOW();
    
    loop_date := loop_date + INTERVAL '1 day';
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Core reconciliation function
CREATE OR REPLACE FUNCTION public.reconcile_attendance_range(
  p_employee_code TEXT,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS VOID AS $$
DECLARE
  attendance_row RECORD;
  coverage_row RECORD;
  new_status TEXT;
  employee_location TEXT;
BEGIN
  SELECT location INTO employee_location
  FROM public.employees WHERE empl_no = p_employee_code;
  
  FOR attendance_row IN 
    SELECT * FROM public.attendance_records
    WHERE employee_code = p_employee_code
      AND date BETWEEN p_start_date AND p_end_date
      AND status = 'Absent'
  LOOP
    IF employee_location = 'Delhi' THEN
      SELECT * INTO coverage_row
      FROM public.attendance_coverage
      WHERE employee_code = p_employee_code
        AND coverage_date = attendance_row.date
        AND approval_status != 'Rejected'
      ORDER BY CASE coverage_type WHEN 'Leave' THEN 1 WHEN 'Regularization' THEN 2 END
      LIMIT 1;
      
      IF coverage_row IS NOT NULL THEN
        new_status := coverage_row.coverage_reason;
      ELSE
        new_status := 'Unapproved Absence';
      END IF;
    ELSE
      new_status := COALESCE(employee_location, 'Absent');
    END IF;
    
    IF attendance_row.status != new_status THEN
      UPDATE public.attendance_records
      SET status = new_status, updated_at = NOW()
      WHERE id = attendance_row.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Bulk reconciliation function
CREATE OR REPLACE FUNCTION public.reconcile_all_attendance(
  p_start_date DATE DEFAULT '2024-01-01',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  total_processed BIGINT,
  total_updated BIGINT,
  delhi_employees BIGINT,
  non_delhi_employees BIGINT
) AS $$
DECLARE
  emp_record RECORD;
  processed_count BIGINT := 0;
  delhi_count BIGINT := 0;
  non_delhi_count BIGINT := 0;
  initial_count BIGINT;
  final_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO initial_count
  FROM public.attendance_records
  WHERE status = 'Absent' AND date BETWEEN p_start_date AND p_end_date;
  
  FOR emp_record IN 
    SELECT DISTINCT empl_no, location FROM public.employees
  LOOP
    IF emp_record.location = 'Delhi' THEN
      delhi_count := delhi_count + 1;
    ELSE
      non_delhi_count := non_delhi_count + 1;
    END IF;
    
    PERFORM public.reconcile_attendance_range(
      emp_record.empl_no, p_start_date, p_end_date
    );
    
    processed_count := processed_count + 1;
  END LOOP;
  
  SELECT COUNT(*) INTO final_count
  FROM public.attendance_records
  WHERE status = 'Absent' AND date BETWEEN p_start_date AND p_end_date;
  
  RETURN QUERY SELECT processed_count, initial_count - final_count, delhi_count, non_delhi_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for leave records
CREATE OR REPLACE FUNCTION public.sync_leave_to_coverage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM public.expand_leave_dates(
      NEW.employee_code, NEW.from_date, NEW.to_date,
      NEW.leave_type, NEW.approval_status, NEW.id
    );
    PERFORM public.reconcile_attendance_range(NEW.employee_code, NEW.from_date, NEW.to_date);
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.attendance_coverage 
    WHERE source_id = OLD.id AND source_table = 'leave_records';
    PERFORM public.reconcile_attendance_range(OLD.employee_code, OLD.from_date, OLD.to_date);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_leave_coverage ON public.leave_records;
CREATE TRIGGER trigger_sync_leave_coverage
AFTER INSERT OR UPDATE OR DELETE ON public.leave_records
FOR EACH ROW EXECUTE FUNCTION public.sync_leave_to_coverage();

-- Trigger function for regularization records
CREATE OR REPLACE FUNCTION public.sync_regularization_to_coverage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    INSERT INTO public.attendance_coverage (
      employee_code, coverage_date, coverage_type, coverage_reason,
      approval_status, source_id, source_table
    ) VALUES (
      NEW.employee_code, NEW.attendance_day, 'Regularization',
      COALESCE(NEW.reason, 'Regularization Request'),
      NEW.approval_status, NEW.id, 'attendance_regularization'
    )
    ON CONFLICT (employee_code, coverage_date, source_id) 
    DO UPDATE SET
      coverage_reason = EXCLUDED.coverage_reason,
      approval_status = EXCLUDED.approval_status,
      updated_at = NOW();
    
    PERFORM public.reconcile_attendance_range(NEW.employee_code, NEW.attendance_day, NEW.attendance_day);
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.attendance_coverage 
    WHERE source_id = OLD.id AND source_table = 'attendance_regularization';
    PERFORM public.reconcile_attendance_range(OLD.employee_code, OLD.attendance_day, OLD.attendance_day);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_regularization_coverage ON public.attendance_regularization;
CREATE TRIGGER trigger_sync_regularization_coverage
AFTER INSERT OR UPDATE OR DELETE ON public.attendance_regularization
FOR EACH ROW EXECUTE FUNCTION public.sync_regularization_to_coverage();