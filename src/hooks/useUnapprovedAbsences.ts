import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export const useUnapprovedAbsences = (startDate?: Date, endDate?: Date, statusFilter: 'all' | 'active' | 'inactive' = 'active') => {
  return useQuery({
    queryKey: ['unapproved-absences', startDate, endDate, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('biometric_attendance')
        .select(`
          *,
          employees!inner(id, empl_no, name, location, status)
        `)
        .eq('status', 'Absent')
        .eq('employees.location', 'Delhi');

      // Apply status filter
      if (statusFilter === 'active') {
        query = query.in('employees.status', ['Active', 'Serving Notice Period']);
      } else if (statusFilter === 'inactive') {
        query = query.not('employees.status', 'in', '(Active,Serving Notice Period)');
      }

      if (startDate) {
        query = query.gte('attendance_date', format(startDate, 'yyyy-MM-dd'));
      }
      if (endDate) {
        query = query.lte('attendance_date', format(endDate, 'yyyy-MM-dd'));
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // Group by employee to get summary
      const employeeSummary: Record<string, {
        employeeId: string;
        name: string;
        code: string;
        count: number;
        dates: Array<{
          date: string;
          biometricStatus: string;
        }>;
      }> = {};

      data?.forEach(record => {
        const emp = record.employees as any;
        const empId = emp.id;
        
        if (!employeeSummary[empId]) {
          employeeSummary[empId] = {
            employeeId: empId,
            name: emp.name,
            code: emp.empl_no,
            count: 0,
            dates: []
          };
        }
        
        employeeSummary[empId].count++;
        employeeSummary[empId].dates.push({
          date: record.attendance_date,
          biometricStatus: record.status
        });
      });

      // Convert to array and sort by count descending
      const summaryArray = Object.values(employeeSummary).sort((a, b) => b.count - a.count);

      return {
        employeeSummary: summaryArray,
        totalEmployees: summaryArray.length,
        totalUnapprovedDays: data?.length || 0
      };
    }
  });
};

export const useEmployeeAbsenceDetails = (employeeId: string, startDate?: Date, endDate?: Date) => {
  return useQuery({
    queryKey: ['employee-absence-details', employeeId, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('biometric_attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('status', 'Absent')
        .order('attendance_date', { ascending: false });

      if (startDate) {
        query = query.gte('attendance_date', format(startDate, 'yyyy-MM-dd'));
      }
      if (endDate) {
        query = query.lte('attendance_date', format(endDate, 'yyyy-MM-dd'));
      }

      const { data, error } = await query;
      
      if (error) throw error;

      return data || [];
    },
    enabled: !!employeeId
  });
};