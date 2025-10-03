import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export const useEmployeeLeaveRegularization = (
  employeeId?: string, 
  startDate?: Date, 
  endDate?: Date
) => {
  return useQuery({
    queryKey: ['employee-leave-regularization', employeeId, startDate, endDate],
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

      const { data: regularizations, error: regError } = await regQuery;
      if (regError) throw regError;

      // Process monthly data
      const monthlyData: Record<string, {
        leaveCount: number;
        regularizationCount: number;
        leaveTypes: Record<string, number>;
        regularizationReasons: Record<string, number>;
      }> = {};

      // Process leaves
      leaves?.forEach(leave => {
        const month = format(new Date(leave.from_date), 'MMM yyyy');
        if (!monthlyData[month]) {
          monthlyData[month] = {
            leaveCount: 0,
            regularizationCount: 0,
            leaveTypes: {},
            regularizationReasons: {}
          };
        }
        monthlyData[month].leaveCount++;
        const type = leave.leave_type || 'Unknown';
        monthlyData[month].leaveTypes[type] = (monthlyData[month].leaveTypes[type] || 0) + 1;
      });

      // Process regularizations
      regularizations?.forEach(reg => {
        const month = format(new Date(reg.attendance_date), 'MMM yyyy');
        if (!monthlyData[month]) {
          monthlyData[month] = {
            leaveCount: 0,
            regularizationCount: 0,
            leaveTypes: {},
            regularizationReasons: {}
          };
        }
        monthlyData[month].regularizationCount++;
        const reason = reg.reason || 'Unknown';
        monthlyData[month].regularizationReasons[reason] = (monthlyData[month].regularizationReasons[reason] || 0) + 1;
      });

      // Convert to array format for recharts
      const monthlyTrends = Object.entries(monthlyData)
        .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
        .map(([month, data]) => ({
          month,
          leaveCount: data.leaveCount,
          regularizationCount: data.regularizationCount,
          leaveTypes: data.leaveTypes,
          regularizationReasons: data.regularizationReasons
        }));

      return {
        monthlyTrends,
        totalLeaves: leaves?.length || 0,
        totalRegularizations: regularizations?.length || 0
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
