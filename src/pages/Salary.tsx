import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SalaryScatterChart } from '@/components/SalaryScatterChart';
import { SalaryRangesTable } from '@/components/SalaryRangesTable';

type SalaryRange = {
  id: string;
  level: string;
  min_salary: number;
  max_salary: number;
  variable_pay_percentage: number;
};

type Employee = {
  id: string;
  name: string;
  level: string;
  salary: number;
};

const Salary = () => {
  const [salaryRanges, setSalaryRanges] = useState<SalaryRange[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [rangesResult, employeesResult] = await Promise.all([
        supabase.from('salary_ranges').select('id, level, min_salary, max_salary, variable_pay_percentage').order('min_salary', { ascending: false }),
        supabase.from('employees').select('id, name, level, salary').eq('status', 'Active').not('salary', 'is', null)
      ]);

      if (rangesResult.error) throw rangesResult.error;
      if (employeesResult.error) throw employeesResult.error;

      setSalaryRanges(rangesResult.data || []);
      setEmployees(employeesResult.data || []);
    } catch (error: any) {
      toast.error('Error loading salary data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Salary Visualization</h1>
          <p className="text-muted-foreground">
            View salary distribution across all levels (uploaded salary includes Fixed + EPF)
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            <SalaryScatterChart employees={employees} salaryRanges={salaryRanges} />
            <SalaryRangesTable salaryRanges={salaryRanges} onUpdate={fetchData} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Salary;
