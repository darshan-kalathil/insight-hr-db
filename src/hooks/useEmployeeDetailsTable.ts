import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, eachDayOfInterval, parseISO } from 'date-fns';

export const useEmployeeDetailsTable = (
  employeeId?: string, 
  startDate?: Date, 
  endDate?: Date,
  selectedLeaveType?: string,
  selectedRegType?: string
) => {
  return useQuery({
    queryKey: ['employee-details-table', employeeId, startDate, endDate, selectedLeaveType, selectedRegType],
    queryFn: async () => {
      if (!employeeId) return null;

      // Fetch leave records
      let leaveQuery = supabase
        .from('leave_records')
        .select('*')
        .eq('employee_id', employeeId);

      if (startDate) {
        leaveQuery = leaveQuery.gte('from_date', format(startDate, 'yyyy-MM-dd'));
      }
      if (endDate) {
        leaveQuery = leaveQuery.lte('to_date', format(endDate, 'yyyy-MM-dd'));
      }

      if (selectedLeaveType) {
        leaveQuery = leaveQuery.eq('leave_type', selectedLeaveType);
      }

      const { data: leaves, error: leaveError } = await leaveQuery;
      if (leaveError) throw leaveError;

      // Expand leave records into individual days
      const expandedLeaves = (leaves || []).flatMap(leave => {
        const fromDate = parseISO(leave.from_date);
        const toDate = parseISO(leave.to_date);
        const daysInRange = eachDayOfInterval({ start: fromDate, end: toDate });

        return daysInRange.map(date => ({
          date: format(date, 'yyyy-MM-dd'),
          leaveType: leave.leave_type,
          reason: leave.reason,
          approvalStatus: leave.approval_status,
          totalDays: leave.number_of_days
        }));
      });

      // Fetch regularization records
      let regQuery = supabase
        .from('attendance_regularization')
        .select('*')
        .eq('employee_id', employeeId);

      if (startDate) {
        regQuery = regQuery.gte('attendance_date', format(startDate, 'yyyy-MM-dd'));
      }
      if (endDate) {
        regQuery = regQuery.lte('attendance_date', format(endDate, 'yyyy-MM-dd'));
      }

      if (selectedRegType) {
        regQuery = regQuery.eq('reason', selectedRegType);
      }

      const { data: regularizations, error: regError } = await regQuery;
      if (regError) throw regError;

      // Sort by date (most recent first)
      expandedLeaves.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      regularizations?.sort((a, b) => new Date(b.attendance_date).getTime() - new Date(a.attendance_date).getTime());

      return {
        leaveRecords: expandedLeaves,
        regularizationRecords: regularizations || []
      };
    },
    enabled: !!employeeId
  });
};
