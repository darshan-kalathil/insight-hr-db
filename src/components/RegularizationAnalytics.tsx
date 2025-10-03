import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useRegularizationAnalytics } from '@/hooks/useRegularizationAnalytics';
import { cn, getCurrentFinancialYear } from '@/lib/utils';

export const RegularizationAnalytics = () => {
  const financialYear = getCurrentFinancialYear();
  const [startDate, setStartDate] = useState<Date>(financialYear.startDate);
  const [endDate, setEndDate] = useState<Date>(financialYear.endDate);
  const [reason, setReason] = useState<string>('all');

  const { data: analytics, isLoading } = useRegularizationAnalytics(startDate, endDate, reason);

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

          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select reason" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All reasons</SelectItem>
              <SelectItem value="Travelling for Work">Travelling for Work</SelectItem>
              <SelectItem value="Work From Home">Work From Home</SelectItem>
              <SelectItem value="Attending Business Events">Attending Business Events</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="ghost" onClick={() => {
            const fy = getCurrentFinancialYear();
            setStartDate(fy.startDate);
            setEndDate(fy.endDate);
            setReason('all');
          }}>
            Clear filters
          </Button>
        </CardContent>
      </Card>

      {/* Top 10 Requesters - Only shown when a specific reason is selected */}
      {reason && reason !== 'all' && analytics?.topEmployees && analytics.topEmployees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Requesters for {reason}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Rank</TableHead>
                    <TableHead>Employee Name</TableHead>
                    <TableHead className="text-right">Number of Requests</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.topEmployees.map((employee) => (
                    <TableRow key={employee.rank}>
                      <TableCell className="font-medium">{employee.rank}</TableCell>
                      <TableCell>{employee.name}</TableCell>
                      <TableCell className="text-right">{employee.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
