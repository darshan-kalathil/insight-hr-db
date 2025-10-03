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

      const totalRequests = records?.length || 0;

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

      const topEmployee = Object.values(employeeCounts)
        .sort((a, b) => b.count - a.count)[0];

      // Date range
      const dates = records?.map(r => new Date(r.attendance_date)) || [];
      const minDate = dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
      const maxDate = dates.length ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;

      // Average requests per employee
      const uniqueEmployees = Object.keys(employeeCounts).length;
      const avgRequestsPerEmployee = uniqueEmployees > 0 
        ? (totalRequests / uniqueEmployees).toFixed(1)
        : '0';

      return {
        totalRequests,
        topEmployee: topEmployee?.name || 'N/A',
        topEmployeeCount: topEmployee?.count || 0,
        dateRange: minDate && maxDate 
          ? `${format(minDate, 'MMM dd, yyyy')} - ${format(maxDate, 'MMM dd, yyyy')}`
          : 'N/A',
        avgRequestsPerEmployee
      };
    }
  });
};
