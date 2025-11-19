-- Add unique constraint to attendance_records for proper upsert behavior
ALTER TABLE public.attendance_records 
ADD CONSTRAINT attendance_records_employee_code_date_key 
UNIQUE (employee_code, date);