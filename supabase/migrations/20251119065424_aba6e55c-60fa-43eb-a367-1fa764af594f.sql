-- Create attendance_records table
CREATE TABLE public.attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  employee_code TEXT NOT NULL,
  in_time TIME,
  out_time TIME,
  duration TEXT,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_attendance_record UNIQUE (date, employee_code)
);

-- Enable Row Level Security
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view attendance records"
ON public.attendance_records
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert attendance records"
ON public.attendance_records
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update attendance records"
ON public.attendance_records
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can delete attendance records"
ON public.attendance_records
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_attendance_records_updated_at
BEFORE UPDATE ON public.attendance_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();