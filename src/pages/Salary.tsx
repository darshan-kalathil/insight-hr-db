import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

type SalaryRange = {
  level: string;
  min_salary: number;
  max_salary: number;
  variable_pay_percentage: number;
};

type Employee = {
  name: string;
  level: string;
  salary: number;
};

const Salary = () => {
  const [salaryRanges, setSalaryRanges] = useState<SalaryRange[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [rangesResult, employeesResult] = await Promise.all([
        supabase.from('salary_ranges').select('*').order('min_salary', { ascending: false }),
        supabase.from('employees').select('name, level, salary').eq('status', 'Active').not('salary', 'is', null)
      ]);

      if (rangesResult.error) throw rangesResult.error;
      if (employeesResult.error) throw employeesResult.error;

      setSalaryRanges(rangesResult.data || []);
      setEmployees(employeesResult.data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = selectedLevel === 'all' 
    ? employees 
    : employees.filter(emp => emp.level === selectedLevel);

  const getEmployeePosition = (salary: number, level: string) => {
    const range = salaryRanges.find(r => r.level === level);
    if (!range) return 50;
    
    const position = ((salary - range.min_salary) / (range.max_salary - range.min_salary)) * 100;
    return Math.max(0, Math.min(100, position));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculateTotalCompensation = (salary: number) => {
    const epf = salary * 0.06;
    const total = salary + epf;

    return { epf, total };
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Salary Visualization</h1>
            <p className="text-muted-foreground">View salary ranges and employee compensation</p>
          </div>
          <Select value={selectedLevel} onValueChange={setSelectedLevel}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {salaryRanges.map(range => (
                <SelectItem key={range.level} value={range.level}>{range.level}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Salary Ranges Table */}
        <Card>
          <CardHeader>
            <CardTitle>Salary Ranges by Level</CardTitle>
            <CardDescription>Minimum and maximum salary ranges with variable pay percentages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold bg-primary/5">Level</th>
                    <th className="text-right p-3 font-semibold bg-primary/5">Min</th>
                    <th className="text-right p-3 font-semibold bg-primary/5">Max</th>
                    <th className="text-right p-3 font-semibold bg-primary/5">Variable Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryRanges.map((range) => (
                    <tr key={range.level} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="p-3 font-medium">{range.level}</td>
                      <td className="p-3 text-right">{formatCurrency(range.min_salary)}</td>
                      <td className="p-3 text-right">{formatCurrency(range.max_salary)}</td>
                      <td className="p-3 text-right font-semibold text-primary">{range.variable_pay_percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Employee Salary Visualization */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Salary Distribution</CardTitle>
            <CardDescription>
              {selectedLevel === 'all' 
                ? `Showing all ${filteredEmployees.length} employees with salary data`
                : `Showing ${filteredEmployees.length} employees at level ${selectedLevel}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {filteredEmployees.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No employees found with salary data for this level</p>
            ) : (
              filteredEmployees.map((employee) => {
                const range = salaryRanges.find(r => r.level === employee.level);
                if (!range) return null;

                const position = getEmployeePosition(employee.salary, employee.level);
                const comp = calculateTotalCompensation(employee.salary);

                return (
                  <div key={employee.name} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{employee.name}</p>
                        <p className="text-sm text-muted-foreground">{employee.level}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lg">{formatCurrency(employee.salary)}</p>
                        <p className="text-xs text-muted-foreground">Fixed Salary</p>
                      </div>
                    </div>
                    
                    {/* Salary Range Bar */}
                    <div className="relative h-8 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 opacity-30"
                        style={{ width: '100%' }}
                      />
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full border-2 border-background shadow-lg z-10"
                        style={{ left: `${position}%`, transform: `translateX(-50%) translateY(-50%)` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-medium">
                        <span>{formatCurrency(range.min_salary)}</span>
                        <span>{formatCurrency(range.max_salary)}</span>
                      </div>
                    </div>

                    {/* Compensation Breakdown */}
                    <div className="grid grid-cols-3 gap-2 pt-2 text-sm">
                      <div className="bg-muted/50 p-2 rounded">
                        <p className="text-xs text-muted-foreground">Fixed</p>
                        <p className="font-medium">{formatCurrency(employee.salary)}</p>
                      </div>
                      <div className="bg-muted/50 p-2 rounded">
                        <p className="text-xs text-muted-foreground">EPF (6%)</p>
                        <p className="font-medium">{formatCurrency(comp.epf)}</p>
                      </div>
                      <div className="bg-primary/10 p-2 rounded">
                        <p className="text-xs text-muted-foreground">Total Comp</p>
                        <p className="font-semibold text-primary">{formatCurrency(comp.total)}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Salary;
