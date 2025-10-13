import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { LevelWiseHeadcount } from '@/components/LevelWiseHeadcount';
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

// Get current financial year (April 1 to March 31)
const getCurrentFinancialYear = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed

  // If we're in Jan-Mar, financial year started last year
  // If we're in Apr-Dec, financial year started this year
  const fyStartYear = currentMonth < 3 ? currentYear - 1 : currentYear;
  return {
    start: new Date(fyStartYear, 3, 1),
    // April 1
    end: new Date(fyStartYear + 1, 2, 31) // March 31
  };
};
const Analytics = () => {
  const [levelData, setLevelData] = useState<any[]>([]);
  const [podData, setPodData] = useState<any[]>([]);
  const [attritionData, setAttritionData] = useState<any>({});
  const [levelWiseHeadcount, setLevelWiseHeadcount] = useState<{[key: string]: number}>({});
  const [loading, setLoading] = useState(true);
  const [podFilter, setPodFilter] = useState<string>('all');
  const [uniquePods, setUniquePods] = useState<string[]>([]);
  const fy = getCurrentFinancialYear();
  const [periodFrom, setPeriodFrom] = useState<Date>(fy.start);
  const [periodTo, setPeriodTo] = useState<Date>(fy.end);
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchAnalytics();
  }, [podFilter, periodFrom, periodTo]);
  const fetchAnalytics = async () => {
    try {
      const {
        data: employees,
        error
      } = await supabase.from('employees').select('*');
      if (error) throw error;

      // Filter active employees for charts
      const activeEmployees = employees.filter((e: any) => e.status === 'Active' || e.status === 'Serving Notice Period');

      // Get unique pods for filter
      const pods = [...new Set(activeEmployees.map((e: any) => e.pod))].sort();
      setUniquePods(pods);

      // Level distribution (active employees only, filtered by pod if selected)
      const filteredForLevel = podFilter === 'all' ? activeEmployees : activeEmployees.filter((e: any) => e.pod === podFilter);
      const levelCounts = filteredForLevel.reduce((acc: any, emp: any) => {
        acc[emp.level] = (acc[emp.level] || 0) + 1;
        return acc;
      }, {});
      setLevelData(Object.entries(levelCounts).map(([name, value]) => ({
        name,
        value
      })));

      // POD distribution (active employees only)
      const podCounts = activeEmployees.reduce((acc: any, emp: any) => {
        acc[emp.pod] = (acc[emp.pod] || 0) + 1;
        return acc;
      }, {});
      setPodData(Object.entries(podCounts).map(([name, value]) => ({
        name,
        value
      })).sort((a: any, b: any) => b.value - a.value).slice(0, 10));

      // Attrition analysis with correct formula
      const activeCount = employees.filter((e: any) => e.status === 'Active' || e.status === 'Serving Notice Period').length;
      const inactiveCount = employees.filter((e: any) => e.status === 'Inactive').length;
      const noticeCount = employees.filter((e: any) => e.status === 'Serving Notice Period').length;

      // Employees who left during the period
      const employeesWhoLeft = employees.filter((e: any) => {
        if (!e.date_of_exit) return false;
        const exitDate = new Date(e.date_of_exit);
        return exitDate >= periodFrom && exitDate <= periodTo && e.status === 'Inactive';
      }).length;

      // Headcount at start of period
      const headcountAtStart = employees.filter((e: any) => {
        const joinDate = new Date(e.doj);
        if (joinDate > periodFrom) return false;

        // Either currently active or left after the start date
        if (e.status === 'Active' || e.status === 'Serving Notice Period') return true;
        if (e.date_of_exit) {
          const exitDate = new Date(e.date_of_exit);
          return exitDate > periodFrom;
        }
        return false;
      }).length;

      // Headcount at end of period
      const headcountAtEnd = employees.filter((e: any) => {
        const joinDate = new Date(e.doj);
        if (joinDate > periodTo) return false;

        // Either currently active or left after the end date
        if (e.status === 'Active' || e.status === 'Serving Notice Period') return true;
        if (e.date_of_exit) {
          const exitDate = new Date(e.date_of_exit);
          return exitDate > periodTo;
        }
        return false;
      }).length;

      // Calculate average headcount and attrition rate
      const averageHeadcount = (headcountAtStart + headcountAtEnd) / 2;
      const attritionRate = averageHeadcount > 0 ? (employeesWhoLeft / averageHeadcount * 100).toFixed(2) : '0.00';
      setAttritionData({
        total: employees.length,
        active: activeCount,
        inactive: inactiveCount,
        notice: noticeCount,
        attritionRate,
        employeesWhoLeft,
        averageHeadcount: averageHeadcount.toFixed(0)
      });

      // Level-wise active headcount for the selected period
      const levelWiseHeadcountData = employees.filter((e: any) => {
        const joinDate = new Date(e.doj);
        
        // Must have joined before or during the period
        if (joinDate > periodTo) return false;
        
        // Either currently active or left after the period started
        if (e.status === 'Active' || e.status === 'Serving Notice Period') return true;
        
        // If inactive, check if they were active during any part of the period
        if (e.date_of_exit) {
          const exitDate = new Date(e.date_of_exit);
          return exitDate >= periodFrom;
        }
        
        return false;
      }).reduce((acc: any, emp: any) => {
        acc[emp.level] = (acc[emp.level] || 0) + 1;
        return acc;
      }, {});
      
      setLevelWiseHeadcount(levelWiseHeadcountData);
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
  if (loading) {
    return <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-lg">Loading analytics...</div>
        </div>
      </DashboardLayout>;
  }
  return <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">HR Analytics</h1>
          
          {/* Date Range Selectors */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">Attrition: From</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal", !periodFrom && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {periodFrom ? format(periodFrom, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={periodFrom} onSelect={date => date && setPeriodFrom(date)} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">Attrition: To</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal", !periodTo && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {periodTo ? format(periodTo, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={periodTo} onSelect={date => date && setPeriodTo(date)} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Employees</CardDescription>
              <CardTitle className="text-4xl">{attritionData.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active</CardDescription>
              <CardTitle className="text-4xl text-accent">{attritionData.active}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Inactive</CardDescription>
              <CardTitle className="text-4xl text-destructive">{attritionData.inactive}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Attrition Rate</CardDescription>
              <CardTitle className="text-4xl">{attritionData.attritionRate}%</CardTitle>
              <div className="text-xs text-muted-foreground mt-2">
                {attritionData.employeesWhoLeft} left / Avg {attritionData.averageHeadcount} employees
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Level-wise Headcount Card */}
        <LevelWiseHeadcount 
          levelData={levelWiseHeadcount}
          periodFrom={periodFrom}
          periodTo={periodTo}
        />

        {/* Salary Features Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Salary Visualization & Management
            </CardTitle>
            <CardDescription>
              Analyze salary distribution, view interactive scatter charts with Fixed/Fixed+EPF/CTC modes, 
              and manage salary ranges for each level with variable pay percentages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/salary'}>
              View Salary Analytics
            </Button>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Level Distribution</CardTitle>
              <CardDescription>Employee distribution across levels</CardDescription>
              <div className="mt-4">
                <Select value={podFilter} onValueChange={setPodFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by POD" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All PODs</SelectItem>
                    {uniquePods.map(pod => <SelectItem key={pod} value={pod}>{pod}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={levelData} cx="50%" cy="50%" labelLine={false} label={({
                  name,
                  percent
                }) => `${name} (${(percent * 100).toFixed(0)}%)`} outerRadius={80} fill="#8884d8" dataKey="value">
                    {levelData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pod Distribution</CardTitle>
              <CardDescription>Top 10 departments by headcount</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={podData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip formatter={value => [value, 'Count']} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>;
};
export default Analytics;