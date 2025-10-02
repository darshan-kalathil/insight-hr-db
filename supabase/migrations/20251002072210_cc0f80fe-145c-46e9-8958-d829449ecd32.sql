-- Create enum for action types
CREATE TYPE public.action_type AS ENUM ('create', 'update', 'delete');

-- Create enum for entity types
CREATE TYPE public.entity_type AS ENUM ('employee', 'user');

-- Create activity_logs table
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_type public.action_type NOT NULL,
  entity_type public.entity_type NOT NULL,
  entity_id UUID NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on created_at for performance
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins can view all logs
CREATE POLICY "Super admins can view all activity logs"
  ON public.activity_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'));

-- Policy: Authenticated users can insert logs
CREATE POLICY "Authenticated users can insert activity logs"
  ON public.activity_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);