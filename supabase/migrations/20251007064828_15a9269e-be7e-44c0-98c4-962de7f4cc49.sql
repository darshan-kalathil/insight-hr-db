-- Create biometric_attendance table
CREATE TABLE public.biometric_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  employee_code TEXT NOT NULL,
  attendance_date DATE NOT NULL,
  in_time TIME,
  out_time TIME,
  duration TEXT,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, attendance_date)
);

-- Create attendance_reconciliation table
CREATE TABLE public.attendance_reconciliation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  is_unapproved_absence BOOLEAN NOT NULL DEFAULT false,
  biometric_status TEXT NOT NULL,
  has_leave BOOLEAN NOT NULL DEFAULT false,
  has_regularization BOOLEAN NOT NULL DEFAULT false,
  leave_type TEXT,
  regularization_reason TEXT,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, attendance_date)
);

-- Enable Row Level Security
ALTER TABLE public.biometric_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_reconciliation ENABLE ROW LEVEL SECURITY;

-- RLS Policies for biometric_attendance
CREATE POLICY "Authenticated users can view biometric attendance"
ON public.biometric_attendance
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert biometric attendance"
ON public.biometric_attendance
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update biometric attendance"
ON public.biometric_attendance
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can delete biometric attendance"
ON public.biometric_attendance
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies for attendance_reconciliation
CREATE POLICY "Authenticated users can view attendance reconciliation"
ON public.attendance_reconciliation
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert attendance reconciliation"
ON public.attendance_reconciliation
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update attendance reconciliation"
ON public.attendance_reconciliation
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can delete attendance reconciliation"
ON public.attendance_reconciliation
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create indexes for better query performance
CREATE INDEX idx_biometric_attendance_employee_date ON public.biometric_attendance(employee_id, attendance_date);
CREATE INDEX idx_biometric_attendance_date ON public.biometric_attendance(attendance_date);
CREATE INDEX idx_biometric_attendance_status ON public.biometric_attendance(status);

CREATE INDEX idx_attendance_reconciliation_employee_date ON public.attendance_reconciliation(employee_id, attendance_date);
CREATE INDEX idx_attendance_reconciliation_unapproved ON public.attendance_reconciliation(is_unapproved_absence) WHERE is_unapproved_absence = true;
CREATE INDEX idx_attendance_reconciliation_date ON public.attendance_reconciliation(attendance_date);

-- Add update trigger for biometric_attendance
CREATE TRIGGER update_biometric_attendance_updated_at
BEFORE UPDATE ON public.biometric_attendance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();