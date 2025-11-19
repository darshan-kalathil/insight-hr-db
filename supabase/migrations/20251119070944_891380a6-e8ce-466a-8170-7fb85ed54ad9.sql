-- Create leave_records table
CREATE TABLE public.leave_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zoho_link_id TEXT NOT NULL UNIQUE,
  employee_code TEXT NOT NULL,
  leave_type TEXT NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  days_hours_taken NUMERIC NOT NULL,
  approval_status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.leave_records ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view leave records"
ON public.leave_records
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert leave records"
ON public.leave_records
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update leave records"
ON public.leave_records
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can delete leave records"
ON public.leave_records
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_leave_records_updated_at
BEFORE UPDATE ON public.leave_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();