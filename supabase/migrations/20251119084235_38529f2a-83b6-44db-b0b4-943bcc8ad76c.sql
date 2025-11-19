-- Create attendance_regularization table
CREATE TABLE public.attendance_regularization (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_code TEXT NOT NULL,
  attendance_day DATE NOT NULL,
  reason TEXT,
  description TEXT,
  approval_status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_code, attendance_day)
);

-- Enable Row Level Security
ALTER TABLE public.attendance_regularization ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view regularization records" 
ON public.attendance_regularization 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert regularization records" 
ON public.attendance_regularization 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update regularization records" 
ON public.attendance_regularization 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can delete regularization records" 
ON public.attendance_regularization 
FOR DELETE 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_attendance_regularization_updated_at
BEFORE UPDATE ON public.attendance_regularization
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();