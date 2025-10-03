import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useLeaveAnalytics } from '@/hooks/useLeaveAnalytics';
import { LeaveHeatmap } from '@/components/LeaveHeatmap';
import { cn, getCurrentFinancialYear } from '@/lib/utils';

const LEAVE_TYPES = [
  'All Leave Types',
  'Sick Leave',
  'Casual Leave',
  'Earned Leave',
  'Compensatory Off',
  'Paternity Leave',
  'Bereavement Leave'
];

export const LeaveAnalytics = () => {
  const financialYear = getCurrentFinancialYear();
  const [startDate, setStartDate] = useState<Date>(financialYear.startDate);
  const [endDate, setEndDate] = useState<Date>(financialYear.endDate);
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>('All Leave Types');

  const { data: analytics, isLoading } = useLeaveAnalytics(startDate, endDate, selectedLeaveType);

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

          <Select value={selectedLeaveType} onValueChange={setSelectedLeaveType}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select leave type" />
            </SelectTrigger>
            <SelectContent>
              {LEAVE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="ghost" onClick={() => {
            const fy = getCurrentFinancialYear();
            setStartDate(fy.startDate);
            setEndDate(fy.endDate);
            setSelectedLeaveType('All Leave Types');
          }}>
            Reset filters
          </Button>
        </CardContent>
      </Card>

      {/* Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Leave Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[600px] flex items-center justify-center text-muted-foreground">
              Loading...
            </div>
          ) : analytics?.dailyLeaveData && analytics.dailyLeaveData.length > 0 ? (
            <LeaveHeatmap 
              data={analytics.dailyLeaveData} 
              startDate={startDate}
              endDate={endDate}
            />
          ) : (
            <div className="h-[600px] flex items-center justify-center text-muted-foreground">
              No leave data available for the selected period
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
