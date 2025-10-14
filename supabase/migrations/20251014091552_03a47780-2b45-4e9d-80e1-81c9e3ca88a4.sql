-- Create consolidated table for leaves and regularizations
CREATE TABLE public.approved_absences_consolidated (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  coverage_date DATE NOT NULL,
  coverage_type TEXT NOT NULL CHECK (coverage_type IN ('Leave', 'Regularization')),
  leave_type TEXT,
  regularization_reason TEXT,
  source_record_id UUID NOT NULL,
  approval_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(employee_id, coverage_date, source_record_id)
);

-- Create indexes for fast lookups
CREATE INDEX idx_consolidated_employee_date 
ON public.approved_absences_consolidated(employee_id, coverage_date);

CREATE INDEX idx_consolidated_type 
ON public.approved_absences_consolidated(coverage_type);

-- Enable RLS
ALTER TABLE public.approved_absences_consolidated ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view approved absences consolidated"
ON public.approved_absences_consolidated
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert approved absences consolidated"
ON public.approved_absences_consolidated
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update approved absences consolidated"
ON public.approved_absences_consolidated
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can delete approved absences consolidated"
ON public.approved_absences_consolidated
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Function to expand multi-day leaves into individual date rows
CREATE OR REPLACE FUNCTION public.expand_leave_to_dates(
  p_employee_id UUID,
  p_leave_id UUID,
  p_from_date DATE,
  p_to_date DATE,
  p_leave_type TEXT,
  p_approval_status TEXT
)
RETURNS VOID AS $$
DECLARE
  date_cursor DATE;
BEGIN
  date_cursor := p_from_date;
  
  WHILE date_cursor <= p_to_date LOOP
    INSERT INTO public.approved_absences_consolidated (
      employee_id,
      coverage_date,
      coverage_type,
      leave_type,
      source_record_id,
      approval_status
    )
    VALUES (
      p_employee_id,
      date_cursor,
      'Leave',
      p_leave_type,
      p_leave_id,
      p_approval_status
    )
    ON CONFLICT (employee_id, coverage_date, source_record_id) 
    DO UPDATE SET
      leave_type = EXCLUDED.leave_type,
      approval_status = EXCLUDED.approval_status,
      updated_at = NOW();
    
    date_cursor := date_cursor + INTERVAL '1 day';
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for leave_records
CREATE OR REPLACE FUNCTION public.sync_leave_to_consolidated()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF NEW.approval_status IN ('Approved', 'Pending') THEN
      PERFORM public.expand_leave_to_dates(
        NEW.employee_id,
        NEW.id,
        NEW.from_date,
        NEW.to_date,
        NEW.leave_type,
        NEW.approval_status
      );
    ELSE
      DELETE FROM public.approved_absences_consolidated
      WHERE source_record_id = NEW.id;
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    DELETE FROM public.approved_absences_consolidated
    WHERE source_record_id = OLD.id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leave_records_sync
AFTER INSERT OR UPDATE OR DELETE ON public.leave_records
FOR EACH ROW EXECUTE FUNCTION public.sync_leave_to_consolidated();

-- Trigger function for attendance_regularization
CREATE OR REPLACE FUNCTION public.sync_regularization_to_consolidated()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF NEW.approval_status IN ('Approved', 'Pending') THEN
      INSERT INTO public.approved_absences_consolidated (
        employee_id,
        coverage_date,
        coverage_type,
        regularization_reason,
        source_record_id,
        approval_status
      )
      VALUES (
        NEW.employee_id,
        NEW.attendance_date,
        'Regularization',
        NEW.reason,
        NEW.id,
        NEW.approval_status
      )
      ON CONFLICT (employee_id, coverage_date, source_record_id)
      DO UPDATE SET
        regularization_reason = EXCLUDED.regularization_reason,
        approval_status = EXCLUDED.approval_status,
        updated_at = NOW();
    ELSE
      DELETE FROM public.approved_absences_consolidated
      WHERE source_record_id = NEW.id;
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    DELETE FROM public.approved_absences_consolidated
    WHERE source_record_id = OLD.id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER attendance_regularization_sync
AFTER INSERT OR UPDATE OR DELETE ON public.attendance_regularization
FOR EACH ROW EXECUTE FUNCTION public.sync_regularization_to_consolidated();

-- Populate consolidated table with existing data
-- Populate from leave_records
DO $$
DECLARE
  leave_rec RECORD;
BEGIN
  FOR leave_rec IN 
    SELECT id, employee_id, from_date, to_date, leave_type, approval_status
    FROM public.leave_records
    WHERE approval_status IN ('Approved', 'Pending')
  LOOP
    PERFORM public.expand_leave_to_dates(
      leave_rec.employee_id,
      leave_rec.id,
      leave_rec.from_date,
      leave_rec.to_date,
      leave_rec.leave_type,
      leave_rec.approval_status
    );
  END LOOP;
END $$;

-- Populate from attendance_regularization
INSERT INTO public.approved_absences_consolidated (
  employee_id,
  coverage_date,
  coverage_type,
  regularization_reason,
  source_record_id,
  approval_status
)
SELECT 
  employee_id,
  attendance_date,
  'Regularization',
  reason,
  id,
  approval_status
FROM public.attendance_regularization
WHERE approval_status IN ('Approved', 'Pending')
ON CONFLICT (employee_id, coverage_date, source_record_id) DO NOTHING;