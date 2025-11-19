import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { getCurrentFinancialYear } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AttendanceRecord {
  id: string;
  date: string;
  employee_code: string;
  in_time: string | null;
  out_time: string | null;
  duration: string | null;
  status: string;
  employee_name?: string;
}

export const AttendanceRecords = () => {
  const { toast } = useToast();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => {
    const fy = getCurrentFinancialYear();
    return { from: fy.startDate, to: fy.endDate };
  });

  // Function to normalize status display
  const normalizeStatus = (status: string): string => {
    if (status === 'Present (No Poutpunch)') {
      return 'Present';
    }
    return status;
  };

  // Get unique statuses for filter
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(records.map(r => normalizeStatus(r.status)));
    return Array.from(statuses).sort();
  }, [records]);

  // Filter records based on selected status
  const filteredRecords = useMemo(() => {
    if (statusFilter === 'all') return records;
    return records.filter(r => normalizeStatus(r.status) === statusFilter);
  }, [records, statusFilter]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('*')
        .gte('date', format(dateRange.from, 'yyyy-MM-dd'))
        .lte('date', format(dateRange.to, 'yyyy-MM-dd'));

      if (attendanceError) throw attendanceError;

      // Fetch employee names
      const employeeCodes = [...new Set(attendanceData?.map(r => r.employee_code) || [])];
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('empl_no, name')
        .in('empl_no', employeeCodes);

      if (employeesError) throw employeesError;

      // Create a map of employee codes to names
      const employeeMap = new Map(employeesData?.map(e => [e.empl_no, e.name]) || []);

      // Merge the data and sort: month first, then employee code, then date
      const recordsWithNames = attendanceData?.map(record => ({
        ...record,
        employee_name: employeeMap.get(record.employee_code),
        year_month: record.date.substring(0, 7) // Extract YYYY-MM for sorting
      })) || [];

      // Sort by year-month, then employee_code, then date
      recordsWithNames.sort((a, b) => {
        if (a.year_month !== b.year_month) {
          return a.year_month.localeCompare(b.year_month);
        }
        if (a.employee_code !== b.employee_code) {
          return a.employee_code.localeCompare(b.employee_code);
        }
        return a.date.localeCompare(b.date);
      });

      setRecords(recordsWithNames);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [dateRange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Records</CardTitle>
        <CardDescription>
          View all attendance records for the selected date range (default: current financial year)
        </CardDescription>
        <div className="flex gap-4 mt-4 flex-wrap">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[200px]">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(dateRange.from, 'dd MMM yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange.from}
                onSelect={(date) => date && setDateRange({ ...dateRange, from: date })}
              />
            </PopoverContent>
          </Popover>
          <span className="flex items-center">to</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[200px]">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(dateRange.to, 'dd MMM yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange.to}
                onSelect={(date) => date && setDateRange({ ...dateRange, to: date })}
              />
            </PopoverContent>
          </Popover>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="all">All Statuses</SelectItem>
              {uniqueStatuses.map(status => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-center py-8">Loading records...</p>
        ) : filteredRecords.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No records found for the selected filters</p>
        ) : (
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>In Time</TableHead>
                  <TableHead>Out Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => {
                  const displayStatus = normalizeStatus(record.status);
                  return (
                    <TableRow key={record.id}>
                      <TableCell>{format(new Date(record.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>{record.employee_name || record.employee_code}</TableCell>
                      <TableCell>{record.in_time || '-'}</TableCell>
                      <TableCell>{record.out_time || '-'}</TableCell>
                      <TableCell>{record.duration || '-'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          displayStatus === 'Present' ? 'bg-green-100 text-green-800' :
                          displayStatus === 'Absent' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {displayStatus}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
