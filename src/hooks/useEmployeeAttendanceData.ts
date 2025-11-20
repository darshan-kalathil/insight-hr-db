import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface EmployeeAttendanceRecord {
  date: string;
  status: string;
}

export const useEmployeeAttendanceData = (
  employeeCode: string | null,
  startDate: Date,
  endDate: Date
) => {
  return useQuery({
    queryKey: ['employee-attendance', employeeCode, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!employeeCode) return [];

      const { data, error } = await supabase
        .from('attendance_records')
        .select('date, status')
        .eq('employee_code', employeeCode)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (error) throw error;

      return (data || []).map(record => ({
        date: record.date,
        status: record.status
      }));
    },
    enabled: !!employeeCode,
  });
};
