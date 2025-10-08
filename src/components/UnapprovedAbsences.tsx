import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, RefreshCw, Info, MapPin } from 'lucide-react';
import { format, startOfYear, endOfYear, subYears, startOfMonth, endOfMonth } from 'date-fns';
import { useUnapprovedAbsences, useEmployeeAbsenceDetails } from '@/hooks/useUnapprovedAbsences';
import { useReconciliation } from '@/hooks/useReconciliation';
import { cn } from '@/lib/utils';

export const UnapprovedAbsences = () => {
  // Default to current financial year (April to March)
  const today = new Date();
  const currentYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  const defaultStartDate = new Date(currentYear, 3, 1); // April 1st
  const defaultEndDate = new Date(currentYear + 1, 2, 31); // March 31st next year

  const [startDate, setStartDate] = useState<Date>(defaultStartDate);
  const [endDate, setEndDate] = useState<Date>(defaultEndDate);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [selectedEmployee, setSelectedEmployee] = useState<{
    id: string;
    name: string;
    code: string;
  } | null>(null);

  const { data, isLoading, refetch } = useUnapprovedAbsences(startDate, endDate, statusFilter);
  const { data: employeeDetails } = useEmployeeAbsenceDetails(
    selectedEmployee?.id || '',
    startDate,
    endDate
  );
  const { isReconciling, lastCalculated, triggerReconciliation } = useReconciliation();

  const handleRecalculate = async () => {
    await triggerReconciliation(startDate, endDate);
    refetch();
  };

  const resetFilters = () => {
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
    setStatusFilter('active');
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Alert>
        <MapPin className="h-4 w-4" />
        <AlertDescription>
          <strong>Delhi Office Only:</strong> Showing unapproved absences for Delhi-based employees only. 
          Employees in other locations are excluded as biometric data is only available for the Delhi office.
        </AlertDescription>
      </Alert>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Delhi Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalEmployees || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">with unapproved absences</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Unapproved Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{data?.totalUnapprovedDays || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">across all employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Last Calculated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {lastCalculated ? format(lastCalculated, 'PPp') : 'Not yet calculated'}
            </div>
            <Button
              onClick={handleRecalculate}
              disabled={isReconciling}
              size="sm"
              variant="outline"
              className="mt-2"
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", isReconciling && "animate-spin")} />
              Recalculate
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Unapproved Absences</CardTitle>
          <CardDescription>Select date range to view unapproved absences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={startDate} onSelect={(date) => date && setStartDate(date)} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={endDate} onSelect={(date) => date && setEndDate(date)} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Employee Status</label>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={resetFilters} variant="outline">
              Reset to Financial Year
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employees with Unapproved Absences</CardTitle>
          <CardDescription>
            Click on an employee name to view detailed absence dates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : !data?.employeeSummary.length ? (
            <div className="text-center py-8">
              <p className="text-2xl mb-2">🎉</p>
              <p className="font-semibold">All absences are reconciled!</p>
              <p className="text-sm text-muted-foreground mt-2">
                No unapproved absences found for the selected date range.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Employee Code</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Unapproved Days</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.employeeSummary.map((emp) => (
                  <TableRow
                    key={emp.employeeId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedEmployee({ id: emp.employeeId, name: emp.name, code: emp.code })}
                  >
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>{emp.code}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <MapPin className="h-3 w-3" />
                        Delhi
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive">{emp.count}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Employee Details Modal */}
      <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Unapproved Absence Details</DialogTitle>
            <DialogDescription>
              {selectedEmployee?.name} ({selectedEmployee?.code})
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {employeeDetails && employeeDetails.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Leave/Regularization</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeDetails.map((detail) => (
                    <TableRow key={detail.id}>
                      <TableCell>{format(new Date(detail.attendance_date), 'PPP')}</TableCell>
                      <TableCell>{format(new Date(detail.attendance_date), 'EEEE')}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{detail.biometric_status}</Badge>
                      </TableCell>
                      <TableCell>
                        {detail.leave_type ? (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400">
                            Leave: {detail.leave_type}
                          </Badge>
                        ) : detail.regularization_reason ? (
                          <Badge variant="outline" className="bg-orange-500/10 text-orange-700 dark:text-orange-400">
                            Reg: {detail.regularization_reason}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Needs leave or regularization entry</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No details available
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
