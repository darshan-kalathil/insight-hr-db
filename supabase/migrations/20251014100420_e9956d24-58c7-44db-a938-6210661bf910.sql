-- Drop the attendance_reconciliation table as it's no longer needed
-- The biometric_attendance.status column will be updated directly during reconciliation
DROP TABLE IF EXISTS public.attendance_reconciliation;