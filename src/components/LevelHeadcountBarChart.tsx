import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { lastDayOfMonth } from 'date-fns';
import {
  LEVELS,
  Employee,
  getLevelHeadcount,
  getLevelHeadcountAsOfDate,
  getAdditionsInMonth,
  getExitsInMonth,
  getAdditionsUpToDate,
  getExitsUpToDate,
} from '@/hooks/useExecutiveSummaryData';
import { ViewMode } from '@/pages/ExecutiveSummary';

interface LevelHeadcountBarChartProps {
  employees: Employee[];
  selectedMonth: Date;
  viewMode: ViewMode;
}

interface ChartDataItem {
  level: string;
  base: number;
  additions: number;
  exits: number;
  netChange: number;
  total: number;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ChartDataItem;
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold mb-1">{data.level}</p>
        <p>Headcount: <span className="font-medium">{data.total}</span></p>
        <p className="text-green-600">Additions: <span className="font-medium">{data.additions > 0 ? `+${data.additions}` : data.additions}</span></p>
        <p className="text-red-600">Exits: <span className="font-medium">{data.exits > 0 ? `-${data.exits}` : data.exits}</span></p>
      </div>
    );
  }
  return null;
};

export const LevelHeadcountBarChart = ({
  employees,
  selectedMonth,
  viewMode,
}: LevelHeadcountBarChartProps) => {
  const today = new Date();
  const isEndOfMonth = viewMode === 'endOfMonth';

  // Calculate additions and exits based on view mode
  const additions = isEndOfMonth
    ? getAdditionsInMonth(employees, selectedMonth)
    : getAdditionsUpToDate(employees, selectedMonth, today);

  const exits = isEndOfMonth
    ? getExitsInMonth(employees, selectedMonth)
    : getExitsUpToDate(employees, selectedMonth, today);

  // Build chart data for each level
  const chartData: ChartDataItem[] = LEVELS.map(level => {
    const active = isEndOfMonth
      ? getLevelHeadcount(employees, selectedMonth, level)
      : getLevelHeadcountAsOfDate(employees, today, level);

    const levelAdditions = additions.filter(emp => emp.level === level).length;
    const levelExits = exits.filter(emp => emp.level === level).length;
    const netChange = levelAdditions - levelExits;

    return {
      level,
      base: active,
      additions: levelAdditions,
      exits: levelExits,
      netChange,
      total: active,
    };
  }).filter(item => item.base > 0 || item.additions > 0);

  if (chartData.length === 0) {
    return null;
  }

  // Calculate max value for dynamic tick configuration
  const maxValue = Math.max(...chartData.map(item => item.total));
  const tickInterval = 2;
  const tickCount = Math.ceil(maxValue / tickInterval) + 1;

  // Custom bar with cap
  const renderCustomBar = (props: any) => {
    const { x, y, width, height, payload } = props;
    const netChange = payload.netChange;
    const capHeight = Math.min(8, height * 0.15);
    
    if (netChange === 0) {
      return (
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="hsl(var(--primary))"
          rx={2}
        />
      );
    }

    const capColor = netChange > 0 ? 'hsl(142, 76%, 36%)' : 'hsl(0, 84%, 60%)';
    
    return (
      <g>
        <rect
          x={x}
          y={y + capHeight}
          width={width}
          height={height - capHeight}
          fill="hsl(var(--primary))"
          rx={2}
        />
        <rect
          x={x}
          y={y}
          width={width}
          height={capHeight}
          fill={capColor}
          rx={2}
        />
      </g>
    );
  };

  return (
    <div className="mb-4">
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="level" 
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            width={30}
            tickCount={tickCount}
            domain={[0, 'auto']}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
          <Bar 
            dataKey="total" 
            shape={renderCustomBar}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};