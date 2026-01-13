-- Add EPF column to employees table
ALTER TABLE public.employees 
ADD COLUMN epf numeric NULL;