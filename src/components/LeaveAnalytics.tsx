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
  'All Leaves',
  'Sick Leave',
  'Casual Leave',
  'Earned Leave',
  'Compensatory Off',
  'Paternity Leave',
  'Bereavement Leave'
];

const LEAVE_TYPE_COLORS: Record<string, string> = {
  'All Leaves': '262 83% 58%', // Purple
  'Earned Leave': '217 91% 60%', // Blue
  'Sick Leave': '0 84% 60%', // Red
  'Casual Leave': '142 76% 36%', // Green
  'Compensatory Off': '45 93% 47%', // Yellow
  'Paternity Leave': '330 81% 60%', // Pink
  'Bereavement Leave': '0 0% 0%', // Black
};

export const LeaveAnalytics = () => {
  const financialYear = getCurrentFinancialYear();
  const [startDate, setStartDate] = useState<Date>(financialYear.startDate);
  const [endDate, setEndDate] = useState<Date>(financialYear.endDate);
  const [selectedLeaveTypes, setSelectedLeaveTypes] = useState<string[]>(['All Leaves']);

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
            setSelectedLeaveTypes(['All Leaves']);
          }}>
            Reset filters
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
                {selectedLeaveTypes.map((type) => (
                  <Line 
                    key={type}
                    type="monotone" 
                    dataKey={type} 
                    stroke={`hsl(${LEAVE_TYPE_COLORS[type] || '217 91% 60%'})`}
                    strokeWidth={2} 
                    name={type}
                    connectNulls
                    dot={{ fill: `hsl(${LEAVE_TYPE_COLORS[type] || '217 91% 60%'})`, r: 4 }}
                    activeDot={{ r: 6 }}
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
