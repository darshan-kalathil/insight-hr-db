import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface LevelWiseHeadcountProps {
  levelData: { [key: string]: number };
  periodFrom: Date;
  periodTo: Date;
}

export const LevelWiseHeadcount = ({ levelData, periodFrom, periodTo }: LevelWiseHeadcountProps) => {
  // Transform object to array format for chart and sort
  const chartData = Object.entries(levelData)
    .map(([level, count]) => ({ level, count }))
    .sort((a, b) => a.level.localeCompare(b.level));
  
  const totalCount = Object.values(levelData).reduce((sum, count) => sum + count, 0);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Level-wise Active Headcount</CardTitle>
        <CardDescription>
          Employees active as of {format(periodTo, "MMM d, yyyy")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Bar chart visualization */}
          <div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="level" />
                <YAxis />
                <Tooltip formatter={(value) => [value, 'Headcount']} />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Data table */}
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-right">Active Headcount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chartData.map(({ level, count }) => (
                  <TableRow key={level}>
                    <TableCell className="font-medium">{level}</TableCell>
                    <TableCell className="text-right">{count}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold border-t-2">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{totalCount}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
