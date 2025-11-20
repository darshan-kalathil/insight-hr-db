import { format, eachMonthOfInterval, startOfMonth } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartContainer, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import type { DailyAbsenceData } from '@/hooks/useOrgAbsenceData';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  breakdown?: Record<string, Record<string, number>>; // month -> { leaveType -> count }
}

const CustomTooltip = ({ active, payload, label, breakdown }: CustomTooltipProps) => {
  if (!active || !payload || !breakdown || !label) return null;

  // Filter out zero values
  const nonZeroPayload = payload.filter(entry => entry.value > 0);

  if (nonZeroPayload.length === 0) return null;

  // Calculate total
  const total = nonZeroPayload.reduce((sum, entry) => sum + entry.value, 0);

  // Get breakdown for this month
  const monthBreakdown = breakdown[label] || {};

  return (
    <div className="rounded-lg border bg-background p-2 shadow-md">
      <p className="text-sm font-medium mb-2">{label}</p>
      
      {/* Show aggregated lines */}
      {nonZeroPayload.map((entry, index) => (
        <div key={index} className="mb-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="font-medium ml-auto">{entry.value}</span>
          </div>
          
          {/* Show breakdown if this is an aggregated category */}
          {entry.dataKey === 'Leaves' && Object.keys(monthBreakdown).some(key => key.startsWith('leave_')) && (
            <div className="ml-5 mt-1 space-y-0.5">
              {Object.entries(monthBreakdown)
                .filter(([key]) => key.startsWith('leave_'))
                .map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{key.replace('leave_', '')}</span>
                    <span className="ml-auto">{value}</span>
                  </div>
                ))}
            </div>
          )}
          
          {entry.dataKey === 'Travel/Business' && Object.keys(monthBreakdown).some(key => key.startsWith('travel_')) && (
            <div className="ml-5 mt-1 space-y-0.5">
              {Object.entries(monthBreakdown)
                .filter(([key]) => key.startsWith('travel_'))
                .map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{key.replace('travel_', '')}</span>
                    <span className="ml-auto">{value}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      ))}
      
      <div className="flex items-center gap-2 text-sm mt-2 pt-2 border-t border-border">
        <span className="font-semibold">Total Absences</span>
        <span className="font-semibold ml-auto">{total}</span>
      </div>
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
  // Generate all months in the date range
  const months = eachMonthOfInterval({ start: startDate, end: endDate });

  // Initialize data structure for each month with aggregated categories
  const monthlyData = months.map(month => {
    const monthKey = format(month, 'MMM yyyy');
    return { 
      month: monthKey,
      'Leaves': 0,
      'Work From Home': 0,
      'Travel/Business': 0,
    };
  });

  // Store detailed breakdown for tooltip
  const monthlyBreakdown: Record<string, Record<string, number>> = {};
  months.forEach(month => {
    const monthKey = format(month, 'MMM yyyy');
    monthlyBreakdown[monthKey] = {};
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
        if (!selectedTypes.includes(employee.leaveType)) return;

        // Aggregate into categories
        if (leaveTypes.includes(employee.leaveType)) {
          monthData['Leaves'] = (monthData['Leaves'] || 0) + 1;
          // Store breakdown
          const breakdownKey = `leave_${employee.leaveType}`;
          monthlyBreakdown[monthKey][breakdownKey] = (monthlyBreakdown[monthKey][breakdownKey] || 0) + 1;
        } else if (employee.leaveType === 'Work From Home') {
          monthData['Work From Home'] = (monthData['Work From Home'] || 0) + 1;
        } else if (employee.leaveType === 'Attending Business Events' || employee.leaveType === 'Travelling for Work') {
          monthData['Travel/Business'] = (monthData['Travel/Business'] || 0) + 1;
          // Store breakdown
          const breakdownKey = `travel_${employee.leaveType}`;
          monthlyBreakdown[monthKey][breakdownKey] = (monthlyBreakdown[monthKey][breakdownKey] || 0) + 1;
        }
      });
    }
  });

  // Build chart config for aggregated categories
  const chartConfig: ChartConfig = {
    'Leaves': {
      label: 'Leaves',
      color: 'hsl(217, 91%, 60%)', // blue-500
    },
    'Work From Home': {
      label: 'Work From Home',
      color: 'hsl(25, 95%, 53%)', // orange-500
    },
    'Travel/Business': {
      label: 'Travel/Business',
      color: 'hsl(142, 71%, 45%)', // green-500
    },
  };

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
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis className="text-xs" />
          <Tooltip content={<CustomTooltip breakdown={monthlyBreakdown} />} />
          <ChartLegend content={<ChartLegendContent />} />
          
          <Line 
            type="monotone" 
            dataKey="Leaves" 
            stroke={chartConfig['Leaves'].color}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="Work From Home" 
            stroke={chartConfig['Work From Home'].color}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="Travel/Business" 
            stroke={chartConfig['Travel/Business'].color}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            strokeDasharray="5 5"
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};
