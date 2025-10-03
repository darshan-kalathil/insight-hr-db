import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export const useLeaveAnalytics = (startDate?: Date, endDate?: Date, leaveTypes?: string[]) => {
  return useQuery({
    queryKey: ['leave-analytics', startDate, endDate, leaveTypes],
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
      // Only filter by leave types if "All Leaves" is not selected
      if (leaveTypes && leaveTypes.length > 0 && !leaveTypes.includes('All Leaves')) {
        query = query.in('leave_type', leaveTypes);
      }

      const { data: leaves, error } = await query;
      
      if (error) throw error;

      // Calculate analytics
      const totalRecords = leaves?.length || 0;
      
      // Leave type distribution
      const leaveTypeCount: Record<string, number> = {};
      leaves?.forEach(leave => {
        const type = leave.leave_type || 'Unknown';
        leaveTypeCount[type] = (leaveTypeCount[type] || 0) + 1;
      });

      // Find most used leave type
      const mostUsedType = Object.entries(leaveTypeCount)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

      // Monthly trends by leave type
      const monthlyDataByType: Record<string, Record<string, number>> = {};
      const monthlyTotals: Record<string, number> = {};
      
      leaves?.forEach(leave => {
        const month = format(new Date(leave.from_date), 'MMM yyyy');
        const type = leave.leave_type || 'Unknown';
        if (!monthlyDataByType[month]) {
          monthlyDataByType[month] = {};
        }
        monthlyDataByType[month][type] = (monthlyDataByType[month][type] || 0) + 1;
        
        // Track monthly totals for "All Leaves"
        monthlyTotals[month] = (monthlyTotals[month] || 0) + 1;
      });

      // Convert to array format for recharts
      const monthlyTrends = Object.entries(monthlyDataByType)
        .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
        .map(([month, types]) => ({
          month,
          ...types,
          'All Leaves': monthlyTotals[month] || 0
        }));

      // Date range
      const dates = leaves?.map(l => new Date(l.from_date)) || [];
      const minDate = dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
      const maxDate = dates.length ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;

      // Unique employees
      const uniqueEmployees = new Set(leaves?.map(l => l.employee_id)).size;

      return {
        totalRecords,
        mostUsedType,
        dateRange: minDate && maxDate 
          ? `${format(minDate, 'MMM dd, yyyy')} - ${format(maxDate, 'MMM dd, yyyy')}`
          : 'N/A',
        uniqueEmployees,
        leaveTypeDistribution: Object.entries(leaveTypeCount).map(([name, value]) => ({
          name,
          value
        })),
        monthlyTrends,
        selectedLeaveTypes: leaveTypes || []
      };
    }
  });
};
