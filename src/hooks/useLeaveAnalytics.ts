import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export const useLeaveAnalytics = (startDate?: Date, endDate?: Date, leaveType?: string) => {
  return useQuery({
    queryKey: ['leave-analytics', startDate, endDate, leaveType],
    queryFn: async () => {
      let query = supabase
        .from('leave_records')
        .select('*, employees(name)');

      // Apply date filters
      if (startDate) {
        query = query.gte('from_date', format(startDate, 'yyyy-MM-dd'));
      }
      if (endDate) {
        query = query.lte('to_date', format(endDate, 'yyyy-MM-dd'));
      }
      // Filter by leave type if not "All Leave Types"
      if (leaveType && leaveType !== 'All Leave Types') {
        query = query.eq('leave_type', leaveType);
      }

      const { data: leaves, error } = await query;
      
      if (error) throw error;

      // Calculate daily leave data for heatmap
      const dailyLeaveMap: Record<string, { count: number; employees: { name: string; leaveType: string }[] }> = {};

      leaves?.forEach(leave => {
        const fromDate = new Date(leave.from_date);
        const toDate = new Date(leave.to_date);
        
        // Expand date range to individual days
        for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
          const dateKey = format(d, 'yyyy-MM-dd');
          
          if (!dailyLeaveMap[dateKey]) {
            dailyLeaveMap[dateKey] = { count: 0, employees: [] };
          }
          
          dailyLeaveMap[dateKey].count += 1;
          dailyLeaveMap[dateKey].employees.push({
            name: leave.employees?.name || 'Unknown',
            leaveType: leave.leave_type || 'Unknown'
          });
        }
      });

      // Convert to array format for the component
      const dailyLeaveData = Object.entries(dailyLeaveMap).map(([date, data]) => ({
        date,
        count: data.count,
        employees: data.employees
      }));

      return {
        dailyLeaveData,
        selectedLeaveType: leaveType || 'All Leave Types'
      };
    }
  });
};
