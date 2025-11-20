import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, eachDayOfInterval } from 'date-fns';

export interface EmployeeDailyAbsence {
  date: string;
  absenceType: string | null;
}

export const useEmployeeAbsenceData = (
  employeeCode: string | null,
  selectedTypes: string[],
  startDate: Date,
  endDate: Date
) => {
  return useQuery({
    queryKey: ['employee-absence-data', employeeCode, selectedTypes, startDate, endDate],
    queryFn: async () => {
      if (!employeeCode) return [];

      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      // Fetch leave records
      const { data: leaveData, error: leaveError } = await supabase
        .from('leave_records')
        .select('from_date, to_date, leave_type, approval_status')
        .eq('employee_code', employeeCode)
        .not('approval_status', 'in', '("Rejected","Cancelled")')
        .gte('to_date', startDateStr)
        .lte('from_date', endDateStr);

      if (leaveError) throw leaveError;

      // Fetch regularization records
      const { data: regData, error: regError } = await supabase
        .from('attendance_regularization')
        .select('attendance_day, reason, approval_status')
        .eq('employee_code', employeeCode)
        .not('approval_status', 'in', '("Cancelled")')
        .gte('attendance_day', startDateStr)
        .lte('attendance_day', endDateStr);

      if (regError) throw regError;

      // Create a map to store absence data by date
      const absenceMap = new Map<string, string>();

      // Process leave records (expand multi-day leaves)
      leaveData?.forEach((leave) => {
        if (selectedTypes.includes(leave.leave_type)) {
          const leaveDays = eachDayOfInterval({
            start: new Date(leave.from_date),
            end: new Date(leave.to_date),
          });

          leaveDays.forEach((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            if (dateStr >= startDateStr && dateStr <= endDateStr) {
              absenceMap.set(dateStr, leave.leave_type);
            }
          });
        }
      });

      // Process regularization records (only if leave doesn't exist for that date)
      regData?.forEach((reg) => {
        const reason = reg.reason || 'Regularization';
        if (selectedTypes.includes(reason) && !absenceMap.has(reg.attendance_day)) {
          absenceMap.set(reg.attendance_day, reason);
        }
      });

      // Convert map to array format for heatmap
      const result: EmployeeDailyAbsence[] = [];
      absenceMap.forEach((absenceType, date) => {
        result.push({ date, absenceType });
      });

      return result;
    },
    enabled: !!employeeCode && selectedTypes.length > 0,
  });
};
