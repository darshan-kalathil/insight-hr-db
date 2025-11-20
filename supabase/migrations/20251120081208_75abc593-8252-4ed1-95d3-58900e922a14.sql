-- Drop triggers that automatically run reconciliation on leave and regularization changes
DROP TRIGGER IF EXISTS trigger_sync_leave_coverage ON public.leave_records;
DROP TRIGGER IF EXISTS trigger_sync_regularization_coverage ON public.attendance_regularization;