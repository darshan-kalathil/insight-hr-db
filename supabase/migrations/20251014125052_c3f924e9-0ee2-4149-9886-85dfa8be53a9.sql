-- Create trigger for leave_records table
CREATE TRIGGER sync_leave_to_consolidated_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.leave_records
FOR EACH ROW
EXECUTE FUNCTION public.sync_leave_to_consolidated();

-- Create trigger for attendance_regularization table
CREATE TRIGGER sync_regularization_to_consolidated_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.attendance_regularization
FOR EACH ROW
EXECUTE FUNCTION public.sync_regularization_to_consolidated();