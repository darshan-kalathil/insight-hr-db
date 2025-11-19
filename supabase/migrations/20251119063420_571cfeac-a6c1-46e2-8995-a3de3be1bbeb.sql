-- Drop tables with CASCADE to remove all dependent objects
DROP TABLE IF EXISTS leave_records CASCADE;
DROP TABLE IF EXISTS attendance_regularization CASCADE;
DROP TABLE IF EXISTS biometric_attendance CASCADE;
DROP TABLE IF EXISTS approved_absences_consolidated CASCADE;

-- Drop functions with CASCADE
DROP FUNCTION IF EXISTS public.expand_leave_to_dates(uuid, uuid, date, date, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.sync_leave_to_consolidated() CASCADE;
DROP FUNCTION IF EXISTS public.sync_regularization_to_consolidated() CASCADE;