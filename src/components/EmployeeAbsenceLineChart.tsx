import { format, eachMonthOfInterval, startOfMonth } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import type { EmployeeDailyAbsence } from '@/hooks/useEmployeeAbsenceData';

interface EmployeeAbsenceLineChartProps {
  data: EmployeeDailyAbsence[];
  selectedTypes: string[];
  leaveTypes: string[];
  regularizationTypes: string[];
  startDate: Date;
  endDate: Date;
}

export const EmployeeAbsenceLineChart = ({
  data,
  selectedTypes,
  leaveTypes,
  regularizationTypes,
  startDate,
  endDate,
}: EmployeeAbsenceLineChartProps) => {
  // Get color for each absence type
  const getColorForType = (absenceType: string) => {
    if (leaveTypes.includes(absenceType)) {
      return 'hsl(217, 91%, 60%)'; // blue-500
    }
    if (absenceType === 'Work From Home') {
      return 'hsl(25, 95%, 53%)'; // orange-500
    }
    if (absenceType === 'Attending Business Events' || absenceType === 'Travelling For Work') {
      return 'hsl(142, 71%, 45%)'; // green-500
    }
    return 'hsl(25, 95%, 53%)'; // orange-500 fallback
  };

  // Generate all months in the date range
  const months = eachMonthOfInterval({ start: startDate, end: endDate });

  // Initialize data structure for each month
  const monthlyData = months.map(month => {
    const monthKey = format(month, 'MMM yyyy');
    const obj: Record<string, any> = { month: monthKey };
    
    // Initialize all selected types to 0
    selectedTypes.forEach(type => {
      obj[type] = 0;
    });
    
    return obj;
  });

  // Count instances per month per type
  data.forEach(absence => {
    if (!absence.absenceType) return;
    
    const absenceDate = new Date(absence.date);
    const monthStart = startOfMonth(absenceDate);
    const monthKey = format(monthStart, 'MMM yyyy');
    
    const monthData = monthlyData.find(m => m.month === monthKey);
    if (monthData && selectedTypes.includes(absence.absenceType)) {
      monthData[absence.absenceType] = (monthData[absence.absenceType] || 0) + 1;
    }
  });

  // Build chart config
  const chartConfig: ChartConfig = {};
  selectedTypes.forEach(type => {
    chartConfig[type] = {
      label: type,
      color: getColorForType(type),
    };
  });

  if (monthlyData.length === 0 || selectedTypes.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No data available for the selected period
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="month" 
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            allowDecimals={false}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          {selectedTypes.map((type) => (
            <Line
              key={type}
              type="monotone"
              dataKey={type}
              stroke={getColorForType(type)}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};
