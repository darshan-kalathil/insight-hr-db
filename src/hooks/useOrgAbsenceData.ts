import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, eachDayOfInterval } from 'date-fns';

interface OrgAbsenceDataParams {
  selectedTypes: string[];
  startDate: Date;
  endDate: Date;
}

export interface DailyAbsenceData {
  date: string;
  count: number;
  employees: { name: string; leaveType: string }[];
}

export const useOrgAbsenceData = ({ selectedTypes, startDate, endDate }: OrgAbsenceDataParams) => {
  return useQuery({
    queryKey: ['org-absence-data', selectedTypes, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async (): Promise<DailyAbsenceData[]> => {
      if (selectedTypes.length === 0) {
        return [];
      }

      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      // Fetch leave records
      const { data: leaveData, error: leaveError } = await supabase
        .from('leave_records')
        .select('employee_code, from_date, to_date, leave_type')
        .in('leave_type', selectedTypes)
        .not('approval_status', 'in', '("Rejected","Cancelled")')
        .lte('from_date', endDateStr)
        .gte('to_date', startDateStr);

      if (leaveError) throw leaveError;

      // Fetch regularization records
      const { data: regularizationData, error: regularizationError } = await supabase
        .from('attendance_regularization')
        .select('employee_code, attendance_day, reason')
        .in('reason', selectedTypes)
        .not('approval_status', 'in', '("Cancelled")')
        .gte('attendance_day', startDateStr)
        .lte('attendance_day', endDateStr);

      if (regularizationError) throw regularizationError;

      // Get all unique employee codes
      const employeeCodes = [
        ...new Set([
          ...(leaveData?.map(l => l.employee_code) || []),
          ...(regularizationData?.map(r => r.employee_code) || []),
        ]),
      ];

      // Fetch employee names
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('empl_no, name')
        .in('empl_no', employeeCodes);

      if (employeeError) throw employeeError;

      // Create employee name map
      const employeeNameMap = new Map(
        employeeData?.map(e => [e.empl_no, e.name]) || []
      );

      // Create a map to store absences by date and employee
      const absenceMap = new Map<string, Map<string, { name: string; leaveType: string; isLeave: boolean }>>();

      // Process leave records - expand multi-day leaves
      leaveData?.forEach(leave => {
        const fromDate = new Date(leave.from_date);
        const toDate = new Date(leave.to_date);
        const daysInRange = eachDayOfInterval({ start: fromDate, end: toDate });

        daysInRange.forEach(day => {
          const dayStr = format(day, 'yyyy-MM-dd');
          if (dayStr >= startDateStr && dayStr <= endDateStr) {
            if (!absenceMap.has(dayStr)) {
              absenceMap.set(dayStr, new Map());
            }
            const dayMap = absenceMap.get(dayStr)!;
            dayMap.set(leave.employee_code, {
              name: employeeNameMap.get(leave.employee_code) || leave.employee_code,
              leaveType: leave.leave_type,
              isLeave: true,
            });
          }
        });
      });

      // Process regularization records - only add if employee doesn't have leave on that day
      regularizationData?.forEach(reg => {
        const dayStr = reg.attendance_day;
        if (!absenceMap.has(dayStr)) {
          absenceMap.set(dayStr, new Map());
        }
        const dayMap = absenceMap.get(dayStr)!;
        
        // Only add regularization if employee doesn't already have a leave entry (leave takes precedence)
        if (!dayMap.has(reg.employee_code)) {
          dayMap.set(reg.employee_code, {
            name: employeeNameMap.get(reg.employee_code) || reg.employee_code,
            leaveType: reg.reason || 'Regularization',
            isLeave: false,
          });
        }
      });

      // Convert to array format for heatmap
      const dailyData: DailyAbsenceData[] = [];
      const allDays = eachDayOfInterval({ start: startDate, end: endDate });

      allDays.forEach(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayMap = absenceMap.get(dayStr);
        
        if (dayMap) {
          const employees = Array.from(dayMap.values()).map(e => ({
            name: e.name,
            leaveType: e.leaveType,
          }));
          
          dailyData.push({
            date: dayStr,
            count: employees.length,
            employees,
          });
        } else {
          dailyData.push({
            date: dayStr,
            count: 0,
            employees: [],
          });
        }
      });

      return dailyData;
    },
    enabled: selectedTypes.length > 0,
  });
};
