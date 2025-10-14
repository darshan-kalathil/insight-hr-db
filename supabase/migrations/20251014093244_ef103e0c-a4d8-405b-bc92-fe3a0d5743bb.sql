-- Update sync_leave_to_consolidated to include 'Submitted' status
CREATE OR REPLACE FUNCTION public.sync_leave_to_consolidated()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF NEW.approval_status IN ('Approved', 'Pending', 'Submitted') THEN
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
$function$;

-- Update sync_regularization_to_consolidated to include 'Submitted' status
CREATE OR REPLACE FUNCTION public.sync_regularization_to_consolidated()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF NEW.approval_status IN ('Approved', 'Pending', 'Submitted') THEN
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
$function$;

-- Backfill existing 'Submitted' records
INSERT INTO public.approved_absences_consolidated (
  employee_id,
  coverage_date,
  coverage_type,
  regularization_reason,
  source_record_id,
  approval_status
)
SELECT 
  ar.employee_id,
  ar.attendance_date,
  'Regularization',
  ar.reason,
  ar.id,
  ar.approval_status
FROM public.attendance_regularization ar
WHERE ar.approval_status = 'Submitted'
ON CONFLICT (employee_id, coverage_date, source_record_id)
DO UPDATE SET
  regularization_reason = EXCLUDED.regularization_reason,
  approval_status = EXCLUDED.approval_status,
  updated_at = NOW();

-- Backfill existing 'Submitted' leave records
INSERT INTO public.approved_absences_consolidated (
  employee_id,
  coverage_date,
  coverage_type,
  leave_type,
  source_record_id,
  approval_status
)
SELECT 
  lr.employee_id,
  generate_series(lr.from_date, lr.to_date, '1 day'::interval)::date,
  'Leave',
  lr.leave_type,
  lr.id,
  lr.approval_status
FROM public.leave_records lr
WHERE lr.approval_status = 'Submitted'
ON CONFLICT (employee_id, coverage_date, source_record_id)
DO UPDATE SET
  leave_type = EXCLUDED.leave_type,
  approval_status = EXCLUDED.approval_status,
  updated_at = NOW();