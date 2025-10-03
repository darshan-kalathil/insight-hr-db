import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useLeaveAnalytics } from '@/hooks/useLeaveAnalytics';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { cn, getCurrentFinancialYear } from '@/lib/utils';

const LEAVE_TYPES = [
  'Sick Leave',
  'Casual Leave',
  'Earned Leave',
  'Compensatory Off',
  'Paternity Leave',
  'Bereavement Leave'
];

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--destructive))'
];

export const LeaveAnalytics = () => {
  const financialYear = getCurrentFinancialYear();
  const [startDate, setStartDate] = useState<Date>(financialYear.startDate);
  const [endDate, setEndDate] = useState<Date>(financialYear.endDate);
  const [selectedLeaveTypes, setSelectedLeaveTypes] = useState<string[]>([]);

  const { data: analytics, isLoading } = useLeaveAnalytics(startDate, endDate, selectedLeaveTypes.length > 0 ? selectedLeaveTypes : undefined);

  const toggleLeaveType = (type: string) => {
    setSelectedLeaveTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'PPP') : 'Start date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'PPP') : 'End date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                {selectedLeaveTypes.length === 0 
                  ? "Select leave types" 
                  : `${selectedLeaveTypes.length} type(s) selected`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-4">
              <div className="space-y-2">
                {LEAVE_TYPES.map(type => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox 
                      id={type}
                      checked={selectedLeaveTypes.includes(type)}
                      onCheckedChange={() => toggleLeaveType(type)}
                    />
                    <label htmlFor={type} className="text-sm cursor-pointer flex-1">
                      {type}
                    </label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="ghost" onClick={() => {
            const fy = getCurrentFinancialYear();
            setStartDate(fy.startDate);
            setEndDate(fy.endDate);
            setSelectedLeaveTypes([]);
          }}>
            Clear filters
          </Button>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Trends Over Time by Type</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics?.monthlyTrends && analytics.monthlyTrends.length > 0 && selectedLeaveTypes.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={analytics.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                {selectedLeaveTypes.map((type, index) => (
                  <Line 
                    key={type}
                    type="monotone" 
                    dataKey={type} 
                    stroke={COLORS[index % COLORS.length]} 
                    strokeWidth={2} 
                    name={type}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              {selectedLeaveTypes.length === 0 
                ? "Select leave types to view trends"
                : "No data available"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
