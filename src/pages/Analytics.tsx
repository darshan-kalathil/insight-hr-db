import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useToast } from '@/hooks/use-toast';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const Analytics = () => {
  const [levelData, setLevelData] = useState<any[]>([]);
  const [podData, setPodData] = useState<any[]>([]);
  const [attritionData, setAttritionData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data: employees, error } = await supabase
        .from('employees')
        .select('*');

      if (error) throw error;

      // Filter active employees for charts
      const activeEmployees = employees.filter((e: any) => 
        e.status === 'Active' || e.status === 'Serving Notice Period'
      );

      // Level distribution (active employees only)
      const levelCounts = activeEmployees.reduce((acc: any, emp: any) => {
        acc[emp.level] = (acc[emp.level] || 0) + 1;
        return acc;
      }, {});
      setLevelData(
        Object.entries(levelCounts).map(([name, value]) => ({ name, value }))
      );

      // POD distribution (active employees only)
      const podCounts = activeEmployees.reduce((acc: any, emp: any) => {
        acc[emp.pod] = (acc[emp.pod] || 0) + 1;
        return acc;
      }, {});
      setPodData(
        Object.entries(podCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a: any, b: any) => b.value - a.value)
          .slice(0, 10)
      );

      // Attrition analysis
      const activeCount = employees.filter((e: any) => 
        e.status === 'Active' || e.status === 'Serving Notice Period'
      ).length;
      const inactiveCount = employees.filter((e: any) => e.status === 'Inactive').length;
      const noticeCount = employees.filter((e: any) => e.status === 'Serving Notice Period').length;
      
      setAttritionData({
        total: employees.length,
        active: activeCount,
        inactive: inactiveCount,
        notice: noticeCount,
        attritionRate: ((inactiveCount / employees.length) * 100).toFixed(2)
      });

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
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-lg">Loading analytics...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">HR Analytics</h1>

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
            </CardHeader>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Level Distribution</CardTitle>
              <CardDescription>Employee distribution across levels</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={levelData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {levelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Department Distribution</CardTitle>
              <CardDescription>Top 10 departments by headcount</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={podData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
