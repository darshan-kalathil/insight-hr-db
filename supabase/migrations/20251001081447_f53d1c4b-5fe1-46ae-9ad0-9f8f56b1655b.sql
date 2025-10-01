-- Remove secondary_reporting and final_travel_approval columns from employees table
ALTER TABLE public.employees 
  DROP COLUMN IF EXISTS secondary_reporting,
  DROP COLUMN IF EXISTS final_travel_approval;