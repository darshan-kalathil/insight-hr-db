-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the employee status update function to run daily at 2 AM
SELECT cron.schedule(
  'update-employee-status-daily',
  '0 2 * * *', -- At 2:00 AM every day
  $$
  SELECT
    net.http_post(
        url:='https://jhuoievjanptywbkwvcv.supabase.co/functions/v1/update-employee-status',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpodW9pZXZqYW5wdHl3Ymt3dmN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMzQ5NzIsImV4cCI6MjA3NDgxMDk3Mn0.iDH7KMU-SZnw-zgb_FZzKk780jNDS2sPShwINX2S-gw"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);