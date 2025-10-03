import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { CalendarIcon, Check, ChevronsUpDown } from 'lucide-react';
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
  const [selectedType, setSelectedType] = useState<string>('');

  const { data: employees, isLoading: loadingEmployees } = useEmployees();
  const { data: analytics, isLoading: loadingAnalytics } = useEmployeeLeaveRegularization(
    selectedEmployeeId,
    startDate,
    endDate,
    selectedType || undefined
  );

  const selectedEmployee = employees?.find(e => e.id === selectedEmployeeId);

  // Build available types list - allRegReasons already has reg_ prefix
  const availableTypes = [
    ...(analytics?.allLeaveTypes || []),
    ...(analytics?.allRegReasons || [])
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-4">
        <p className="font-semibold mb-2">{data.month}</p>
        <div className="space-y-1">
          {payload.map((entry: any) => {
            const isReg = entry.dataKey.startsWith('reg_');
            const displayName = isReg ? entry.dataKey.replace('reg_', '') : entry.dataKey;
            const color = isReg ? 'text-blue-600' : 'text-red-600';
            
            return (
              <p key={entry.dataKey} className={`text-sm ${color}`}>
                {displayName}: {entry.value} days
              </p>
            );
          })}
        </div>
      </div>
    );
  };

  // Determine which lines to show
  const linesToShow = selectedType 
    ? [selectedType] 
    : ['Total Leaves', 'Total Regularizations'];

  // Generate distinct shades for multiple lines of same category
  const getLineColor = (type: string, index: number, total: number) => {
    const isReg = type.startsWith('reg_');
    if (type === 'Total Leaves') return 'hsl(0 84% 60%)';
    if (type === 'Total Regularizations') return 'hsl(217 91% 60%)';
    
    if (isReg) {
      // Blue shades for regularizations
      const lightness = 60 - (index * 10);
      return `hsl(217 91% ${lightness}%)`;
    } else {
      // Red shades for leaves
      const lightness = 60 - (index * 10);
      return `hsl(0 84% ${lightness}%)`;
    }
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
          <Select 
            value={selectedType} 
            onValueChange={setSelectedType}
            disabled={!selectedEmployeeId}
          >
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Filter by type..." />
            </SelectTrigger>
            <SelectContent>
              {availableTypes.map((type) => {
                const displayName = type.startsWith('reg_')
                  ? `Reg: ${type.replace('reg_', '')}`
                  : `Leave: ${type}`;
                return (
                  <SelectItem key={type} value={type}>
                    {displayName}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Button variant="ghost" onClick={() => {
            const fy = getCurrentFinancialYear();
            setStartDate(fy.startDate);
            setEndDate(fy.endDate);
            setSelectedEmployeeId('');
            setSelectedType('');
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
                {linesToShow.map((type, index) => {
                  const isReg = type.startsWith('reg_');
                  const displayName = isReg ? type.replace('reg_', '') : type;
                  const lineColor = getLineColor(type, index, linesToShow.length);
                  
                  return (
                    <Line 
                      key={type}
                      type="monotone" 
                      dataKey={type}
                      stroke={lineColor}
                      strokeWidth={2} 
                      name={displayName}
                      connectNulls
                      dot={{ fill: lineColor, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  );
                })}
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
