import { format, eachMonthOfInterval, startOfMonth } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartContainer, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import type { DailyAbsenceData } from '@/hooks/useOrgAbsenceData';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload) return null;

  // Filter out zero values
  const nonZeroPayload = payload.filter(entry => entry.value > 0);

  if (nonZeroPayload.length === 0) return null;

  return (
    <div className="rounded-lg border bg-background p-2 shadow-md">
      <p className="text-sm font-medium mb-2">{label}</p>
      {nonZeroPayload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}</span>
          <span className="font-medium ml-auto">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

interface OrgAbsenceLineChartProps {
  data: DailyAbsenceData[];
  selectedTypes: string[];
  leaveTypes: string[];
  regularizationTypes: string[];
  startDate: Date;
  endDate: Date;
}

export const OrgAbsenceLineChart = ({
  data,
  selectedTypes,
  leaveTypes,
  regularizationTypes,
  startDate,
  endDate,
}: OrgAbsenceLineChartProps) => {
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

  // Count instances per month per type across all employees
  data.forEach(dailyData => {
    const absenceDate = new Date(dailyData.date);
    const monthStart = startOfMonth(absenceDate);
    const monthKey = format(monthStart, 'MMM yyyy');
    
    const monthData = monthlyData.find(m => m.month === monthKey);
    if (monthData) {
      // Count each employee's absence by type
      dailyData.employees.forEach(employee => {
        if (selectedTypes.includes(employee.leaveType)) {
          monthData[employee.leaveType] = (monthData[employee.leaveType] || 0) + 1;
        }
      });
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
          <Tooltip content={<CustomTooltip />} />
          <ChartLegend content={<ChartLegendContent />} />
          {selectedTypes.map((type) => (
            <Line
              key={type}
              type="monotone"
              dataKey={type}
              stroke={getColorForType(type)}
              strokeWidth={2}
              dot={(props: any) => {
                // Only show dot if value is greater than 0
                if (props.payload[type] > 0) {
                  return (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={4}
                      fill={getColorForType(type)}
                      stroke="none"
                    />
                  );
                }
                return null;
              }}
              activeDot={(props: any) => {
                // Only show active dot if value is greater than 0
                if (props.payload[type] > 0) {
                  return (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={6}
                      fill={getColorForType(type)}
                      stroke="white"
                      strokeWidth={2}
                    />
                  );
                }
                return null;
              }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};
