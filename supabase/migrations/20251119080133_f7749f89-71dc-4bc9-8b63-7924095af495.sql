-- Add unique constraint on date and employee_code combination for attendance_records
-- This allows upsert operations to work correctly
ALTER TABLE public.attendance_records 
ADD CONSTRAINT attendance_records_date_employee_code_key 
UNIQUE (date, employee_code);