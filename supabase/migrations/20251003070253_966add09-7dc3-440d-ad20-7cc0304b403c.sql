-- Create leave_records table
CREATE TABLE public.leave_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  leave_type TEXT NOT NULL,
  number_of_days NUMERIC NOT NULL,
  reason TEXT,
  approval_status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, from_date, to_date, leave_type)
);

-- Create attendance_regularization table
CREATE TABLE public.attendance_regularization (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  in_time TIME,
  out_time TIME,
  reason TEXT NOT NULL,
  approval_status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, attendance_date, reason)
);

-- Enable RLS
ALTER TABLE public.leave_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_regularization ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leave_records
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
USING (has_role(auth.uid(), 'super_admin'));

-- RLS Policies for attendance_regularization
CREATE POLICY "Authenticated users can view attendance regularization"
ON public.attendance_regularization
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert attendance regularization"
ON public.attendance_regularization
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update attendance regularization"
ON public.attendance_regularization
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can delete attendance regularization"
ON public.attendance_regularization
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'));

-- Add triggers for updated_at
CREATE TRIGGER update_leave_records_updated_at
BEFORE UPDATE ON public.leave_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendance_regularization_updated_at
BEFORE UPDATE ON public.attendance_regularization
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();