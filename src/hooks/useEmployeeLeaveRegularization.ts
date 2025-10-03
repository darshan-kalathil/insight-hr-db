import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export const useEmployeeLeaveRegularization = (
  employeeId?: string, 
  startDate?: Date, 
  endDate?: Date,
  selectedTypes?: string[]
) => {
  return useQuery({
    queryKey: ['employee-leave-regularization', employeeId, startDate, endDate, selectedTypes],
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

      // Filter by selected leave types
      if (selectedTypes && selectedTypes.length > 0) {
        const leaveTypes = selectedTypes.filter(t => !t.startsWith('reg_'));
        if (leaveTypes.length > 0) {
          leaveQuery = leaveQuery.in('leave_type', leaveTypes);
        }
      }

      const { data: leaves, error: leaveError } = await leaveQuery;
      if (leaveError) throw leaveError;

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

      // Filter by selected regularization reasons
      if (selectedTypes && selectedTypes.length > 0) {
        const regReasons = selectedTypes
          .filter(t => t.startsWith('reg_'))
          .map(t => t.replace('reg_', ''));
        if (regReasons.length > 0) {
          regQuery = regQuery.in('reason', regReasons);
        }
      }

      const { data: regularizations, error: regError } = await regQuery;
      if (regError) throw regError;

      // Process monthly data
      const monthlyData: Record<string, {
        leaveDays: number;
        regularizationDays: number;
        leaveTypes: Record<string, number>;
        regularizationReasons: Record<string, number>;
      }> = {};

      // Get unique leave and regularization types
      const allLeaveTypes = new Set<string>();
      const allRegReasons = new Set<string>();

      // Process leaves - sum number of days
      leaves?.forEach(leave => {
        const month = format(new Date(leave.from_date), 'MMM yyyy');
        if (!monthlyData[month]) {
          monthlyData[month] = {
            leaveDays: 0,
            regularizationDays: 0,
            leaveTypes: {},
            regularizationReasons: {}
          };
        }
        const days = Number(leave.number_of_days) || 0;
        monthlyData[month].leaveDays += days;
        const type = leave.leave_type || 'Unknown';
        allLeaveTypes.add(type);
        monthlyData[month].leaveTypes[type] = (monthlyData[month].leaveTypes[type] || 0) + days;
      });

      // Process regularizations - each is 1 day
      regularizations?.forEach(reg => {
        const month = format(new Date(reg.attendance_date), 'MMM yyyy');
        if (!monthlyData[month]) {
          monthlyData[month] = {
            leaveDays: 0,
            regularizationDays: 0,
            leaveTypes: {},
            regularizationReasons: {}
          };
        }
        monthlyData[month].regularizationDays += 1;
        const reason = reg.reason || 'Unknown';
        allRegReasons.add(reason);
        monthlyData[month].regularizationReasons[reason] = (monthlyData[month].regularizationReasons[reason] || 0) + 1;
      });

      // Convert to array format for recharts
      const monthlyTrends = Object.entries(monthlyData)
        .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
        .map(([month, data]) => ({
          month,
          leaveDays: data.leaveDays,
          regularizationDays: data.regularizationDays,
          leaveTypes: data.leaveTypes,
          regularizationReasons: data.regularizationReasons
        }));

      return {
        monthlyTrends,
        totalLeaveDays: leaves?.reduce((sum, leave) => sum + (Number(leave.number_of_days) || 0), 0) || 0,
        totalRegularizationDays: regularizations?.length || 0,
        allLeaveTypes: Array.from(allLeaveTypes),
        allRegReasons: Array.from(allRegReasons)
      };
    },
    enabled: !!employeeId
  });
};

export const useEmployees = () => {
  return useQuery({
    queryKey: ['employees-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });
};
