import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Check, ChevronsUpDown, X } from 'lucide-react';
import { format } from 'date-fns';
import { useEmployeeLeaveRegularization, useEmployees } from '@/hooks/useEmployeeLeaveRegularization';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { cn, getCurrentFinancialYear } from '@/lib/utils';

export const EmployeeLeaveRegularizationChart = () => {
  const financialYear = getCurrentFinancialYear();
  const [startDate, setStartDate] = useState<Date>(financialYear.startDate);
  const [endDate, setEndDate] = useState<Date>(financialYear.endDate);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [openCombobox, setOpenCombobox] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [openTypeFilter, setOpenTypeFilter] = useState(false);

  const { data: employees, isLoading: loadingEmployees } = useEmployees();
  const { data: analytics, isLoading: loadingAnalytics } = useEmployeeLeaveRegularization(
    selectedEmployeeId,
    startDate,
    endDate,
    selectedTypes.length > 0 ? selectedTypes : undefined
  );

  const selectedEmployee = employees?.find(e => e.id === selectedEmployeeId);

  // Build available types list
  const availableTypes = [
    ...(analytics?.allLeaveTypes || []),
    ...(analytics?.allRegReasons || []).map(r => `reg_${r}`)
  ];

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-4">
        <p className="font-semibold mb-2">{data.month}</p>
        
        {/* Leave breakdown */}
        <div className="mb-3">
          <p className="text-sm font-medium text-red-600">
            Leave Days: {data.leaveDays}
          </p>
          {data.leaveTypes && Object.keys(data.leaveTypes).length > 0 && (
            <div className="ml-2 mt-1 space-y-1">
              {Object.entries(data.leaveTypes).map(([type, days]) => (
                <p key={type} className="text-xs text-muted-foreground">
                  • {type}: {days as number} days
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Regularization breakdown */}
        <div>
          <p className="text-sm font-medium text-blue-600">
            Regularization Days: {data.regularizationDays}
          </p>
          {data.regularizationReasons && Object.keys(data.regularizationReasons).length > 0 && (
            <div className="ml-2 mt-1 space-y-1">
              {Object.entries(data.regularizationReasons).map(([reason, days]) => (
                <p key={reason} className="text-xs text-muted-foreground">
                  • {reason}: {days as number} days
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Search & Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          {/* Employee Search */}
          <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openCombobox}
                className="w-[300px] justify-between"
              >
                {selectedEmployee ? selectedEmployee.name : "Select employee..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search employee..." />
                <CommandList>
                  <CommandEmpty>No employee found.</CommandEmpty>
                  <CommandGroup>
                    {employees?.map((employee) => (
                      <CommandItem
                        key={employee.id}
                        value={employee.name}
                        onSelect={() => {
                          setSelectedEmployeeId(employee.id);
                          setOpenCombobox(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedEmployeeId === employee.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {employee.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Date Range */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'PPP') : 'Start date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={startDate} onSelect={(date) => date && setStartDate(date)} initialFocus />
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
              <Calendar mode="single" selected={endDate} onSelect={(date) => date && setEndDate(date)} initialFocus />
            </PopoverContent>
          </Popover>

          {/* Type Filter */}
          <Popover open={openTypeFilter} onOpenChange={setOpenTypeFilter}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openTypeFilter}
                className="w-[300px] justify-between"
                disabled={!selectedEmployeeId}
              >
                {selectedTypes.length > 0
                  ? `${selectedTypes.length} type(s) selected`
                  : "Filter by type..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search type..." />
                <CommandList>
                  <CommandEmpty>No types available.</CommandEmpty>
                  <CommandGroup>
                    {availableTypes.map((type) => {
                      const displayName = type.startsWith('reg_')
                        ? `Reg: ${type.replace('reg_', '')}`
                        : `Leave: ${type}`;
                      return (
                        <CommandItem
                          key={type}
                          value={displayName}
                          onSelect={() => toggleType(type)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedTypes.includes(type) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {displayName}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {selectedTypes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedTypes.map((type) => {
                const displayName = type.startsWith('reg_')
                  ? `Reg: ${type.replace('reg_', '')}`
                  : `Leave: ${type}`;
                return (
                  <Badge key={type} variant="secondary" className="gap-1">
                    {displayName}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => toggleType(type)}
                    />
                  </Badge>
                );
              })}
            </div>
          )}

          <Button variant="ghost" onClick={() => {
            const fy = getCurrentFinancialYear();
            setStartDate(fy.startDate);
            setEndDate(fy.endDate);
            setSelectedEmployeeId('');
            setSelectedTypes([]);
          }}>
            Reset filters
          </Button>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedEmployee 
              ? `Leave & Regularization Trends - ${selectedEmployee.name}`
              : 'Leave & Regularization Trends'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedEmployeeId ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              Select an employee to view their leave and regularization trends
            </div>
          ) : loadingAnalytics ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              Loading data...
            </div>
          ) : analytics?.monthlyTrends && analytics.monthlyTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={analytics.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="leaveDays" 
                  stroke="hsl(0 84% 60%)"
                  strokeWidth={2} 
                  name="Leave Days"
                  connectNulls
                  dot={{ fill: "hsl(0 84% 60%)", r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="regularizationDays" 
                  stroke="hsl(217 91% 60%)"
                  strokeWidth={2} 
                  name="Regularization Days"
                  connectNulls
                  dot={{ fill: "hsl(217 91% 60%)", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              No data available for selected employee and date range
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
