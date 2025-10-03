import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export const useEmployeeLeaveRegularization = (
  employeeId?: string, 
  startDate?: Date, 
  endDate?: Date,
  selectedLeaveType?: string,
  selectedRegType?: string
) => {
  return useQuery({
    queryKey: ['employee-leave-regularization', employeeId, startDate, endDate, selectedLeaveType, selectedRegType],
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

      // Filter by selected leave type
      if (selectedLeaveType) {
        leaveQuery = leaveQuery.eq('leave_type', selectedLeaveType);
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

      // Filter by selected regularization reason
      if (selectedRegType) {
        regQuery = regQuery.eq('reason', selectedRegType);
      }

      const { data: regularizations, error: regError } = await regQuery;
      if (regError) throw regError;

      // Process monthly data - structure by month and type
      const monthlyData: Record<string, Record<string, number>> = {};

      // Get unique leave and regularization types
      const allLeaveTypes = new Set<string>();
      const allRegReasons = new Set<string>();

      // Process leaves - sum number of days per type
      leaves?.forEach(leave => {
        const month = format(new Date(leave.from_date), 'MMM yyyy');
        if (!monthlyData[month]) {
          monthlyData[month] = {};
        }
        const days = Number(leave.number_of_days) || 0;
        const type = leave.leave_type || 'Unknown';
        allLeaveTypes.add(type);
        monthlyData[month][type] = (monthlyData[month][type] || 0) + days;
        
        // Also track total leaves for default view
        monthlyData[month]['Total Leaves'] = (monthlyData[month]['Total Leaves'] || 0) + days;
      });

      // Process regularizations - each is 1 day per reason
      regularizations?.forEach(reg => {
        const month = format(new Date(reg.attendance_date), 'MMM yyyy');
        if (!monthlyData[month]) {
          monthlyData[month] = {};
        }
        const reason = `reg_${reg.reason || 'Unknown'}`;
        allRegReasons.add(reason);
        monthlyData[month][reason] = (monthlyData[month][reason] || 0) + 1;
        
        // Also track total regularizations for default view
        monthlyData[month]['Total Regularizations'] = (monthlyData[month]['Total Regularizations'] || 0) + 1;
      });

      // Convert to array format for recharts
      const monthlyTrends = Object.entries(monthlyData)
        .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
        .map(([month, data]) => ({
          month,
          ...data
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
