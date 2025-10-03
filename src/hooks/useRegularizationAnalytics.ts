import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export const useRegularizationAnalytics = (startDate?: Date, endDate?: Date, reason?: string) => {
  return useQuery({
    queryKey: ['regularization-analytics', startDate, endDate, reason],
    queryFn: async () => {
      let query = supabase
        .from('attendance_regularization')
        .select('*, employees(name)');

      // Apply date filters
      if (startDate) {
        query = query.gte('attendance_date', format(startDate, 'yyyy-MM-dd'));
      }
      if (endDate) {
        query = query.lte('attendance_date', format(endDate, 'yyyy-MM-dd'));
      }

      if (reason && reason !== 'all') {
        query = query.eq('reason', reason);
      }

      const { data: records, error } = await query;
      
      if (error) throw error;

      // Employee with most requests
      const employeeCounts: Record<string, { count: number; name: string }> = {};
      records?.forEach(record => {
        const empId = record.employee_id;
        const empName = (record.employees as any)?.name || 'Unknown';
        if (!employeeCounts[empId]) {
          employeeCounts[empId] = { count: 0, name: empName };
        }
        employeeCounts[empId].count++;
      });

      // Top 10 employees for the selected reason
      const topEmployees = Object.values(employeeCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map((emp, index) => ({
          rank: index + 1,
          name: emp.name,
          count: emp.count
        }));

      return {
        topEmployees: reason && reason !== 'all' ? topEmployees : []
      };
    }
  });
};
