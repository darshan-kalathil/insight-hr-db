import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, eachDayOfInterval } from 'date-fns';

export interface EmployeeDailyAbsence {
  date: string;
  absenceType: string | null;
}

export interface EmployeeAbsenceResult {
  absenceData: EmployeeDailyAbsence[];
  allAbsenceDates: Set<string>;
}

export const useEmployeeAbsenceData = (
  employeeCode: string | null,
  selectedTypes: string[],
  startDate: Date,
  endDate: Date
) => {
  return useQuery({
    queryKey: ['employee-absence-data', employeeCode, selectedTypes, startDate, endDate],
    queryFn: async (): Promise<EmployeeAbsenceResult> => {
      if (!employeeCode) return { absenceData: [], allAbsenceDates: new Set() };

      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      // Fetch ALL leave records (unfiltered) to determine which dates have any absence
      const { data: allLeaveData, error: allLeaveError } = await supabase
        .from('leave_records')
        .select('from_date, to_date, leave_type')
        .eq('employee_code', employeeCode)
        .not('approval_status', 'in', '("Rejected","Cancelled")')
        .gte('to_date', startDateStr)
        .lte('from_date', endDateStr);

      if (allLeaveError) throw allLeaveError;

      // Fetch ALL regularization records (unfiltered)
      const { data: allRegData, error: allRegError } = await supabase
        .from('attendance_regularization')
        .select('attendance_day, reason')
        .eq('employee_code', employeeCode)
        .not('approval_status', 'in', '("Cancelled")')
        .gte('attendance_day', startDateStr)
        .lte('attendance_day', endDateStr);

      if (allRegError) throw allRegError;

      // Create a Set of ALL dates that have any absence record (for red dot logic)
      const allAbsenceDates = new Set<string>();

      // Add all leave dates
      allLeaveData?.forEach((leave) => {
        const leaveDays = eachDayOfInterval({
          start: new Date(leave.from_date),
          end: new Date(leave.to_date),
        });
        leaveDays.forEach((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          if (dateStr >= startDateStr && dateStr <= endDateStr) {
            allAbsenceDates.add(dateStr);
          }
        });
      });

      // Add all regularization dates
      allRegData?.forEach((reg) => {
        allAbsenceDates.add(reg.attendance_day);
      });

      // Create a map to store FILTERED absence data by date (for display)
      const absenceMap = new Map<string, string>();

      // Process leave records for selected types only
      allLeaveData?.forEach((leave) => {
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

      // Process regularization records for selected types only
      allRegData?.forEach((reg) => {
        const reason = reg.reason || 'Regularization';
        if (selectedTypes.includes(reason) && !absenceMap.has(reg.attendance_day)) {
          absenceMap.set(reg.attendance_day, reason);
        }
      });

      // Convert map to array format for heatmap display
      const absenceData: EmployeeDailyAbsence[] = [];
      absenceMap.forEach((absenceType, date) => {
        absenceData.push({ date, absenceType });
      });

      return { absenceData, allAbsenceDates };
    },
    enabled: !!employeeCode && selectedTypes.length > 0,
  });
};
