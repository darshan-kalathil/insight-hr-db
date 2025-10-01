-- Add salary column to employees table
ALTER TABLE public.employees 
ADD COLUMN salary NUMERIC(12, 2);

-- Create salary_ranges table
CREATE TABLE public.salary_ranges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level TEXT NOT NULL UNIQUE,
  min_salary NUMERIC(12, 2) NOT NULL,
  max_salary NUMERIC(12, 2) NOT NULL,
  variable_pay_percentage NUMERIC(5, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.salary_ranges ENABLE ROW LEVEL SECURITY;

-- Create policies for salary_ranges (authenticated users can view)
CREATE POLICY "Authenticated users can view salary ranges" 
ON public.salary_ranges 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Super admins can manage salary ranges
CREATE POLICY "Super admins can insert salary ranges" 
ON public.salary_ranges 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update salary ranges" 
ON public.salary_ranges 
FOR UPDATE 
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete salary ranges" 
ON public.salary_ranges 
FOR DELETE 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_salary_ranges_updated_at
BEFORE UPDATE ON public.salary_ranges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial salary range data
INSERT INTO public.salary_ranges (level, min_salary, max_salary, variable_pay_percentage) VALUES
('N+1', 9500000, 16575000, 50),
('N+2', 7500000, 11500000, 40),
('N+3', 4500000, 8200000, 30),
('N+4', 3000000, 5508000, 20),
('N+5', 1500000, 3213000, 15),
('N+6', 500000, 1900800, 15);