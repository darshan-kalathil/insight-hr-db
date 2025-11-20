import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, eachDayOfInterval } from 'date-fns';

export const useEmployeeLeaveCoverage = (
  employeeCode: string | null,
  startDate: Date,
  endDate: Date
) => {
  return useQuery({
    queryKey: ['employee-leave-coverage', employeeCode, startDate, endDate],
    queryFn: async () => {
      if (!employeeCode) return new Set<string>();

      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      // Fetch ALL leave records (not filtered by type, excluding Rejected/Cancelled)
      const { data: leaveData, error: leaveError } = await supabase
        .from('leave_records')
        .select('from_date, to_date')
        .eq('employee_code', employeeCode)
        .not('approval_status', 'in', '("Rejected","Cancelled")')
        .gte('to_date', startDateStr)
        .lte('from_date', endDateStr);

      if (leaveError) throw leaveError;

      // Fetch ALL regularization records (not filtered by type, excluding Cancelled)
      const { data: regData, error: regError } = await supabase
        .from('attendance_regularization')
        .select('attendance_day')
        .eq('employee_code', employeeCode)
        .not('approval_status', 'in', '("Cancelled")')
        .gte('attendance_day', startDateStr)
        .lte('attendance_day', endDateStr);

      if (regError) throw regError;

      // Create a set of dates with coverage
      const coverageSet = new Set<string>();

      // Add all leave dates (expand multi-day leaves)
      leaveData?.forEach((leave) => {
        const leaveDays = eachDayOfInterval({
          start: new Date(leave.from_date),
          end: new Date(leave.to_date),
        });

        leaveDays.forEach((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          if (dateStr >= startDateStr && dateStr <= endDateStr) {
            coverageSet.add(dateStr);
          }
        });
      });

      // Add all regularization dates
      regData?.forEach((reg) => {
        coverageSet.add(reg.attendance_day);
      });

      return coverageSet;
    },
    enabled: !!employeeCode,
  });
};
