import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, LabelList } from 'recharts';
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
  const chartData = LEVELS.map(level => {
    const active = isEndOfMonth
      ? getLevelHeadcount(employees, selectedMonth, level)
      : getLevelHeadcountAsOfDate(employees, today, level);

    const levelAdditions = additions.filter(emp => emp.level === level).length;
    const levelExits = exits.filter(emp => emp.level === level).length;
    const netChange = levelAdditions - levelExits;

    return {
      level,
      // Base headcount (without the net change visual)
      base: active,
      // For stacking: we show positive change as green cap, negative as red cap
      positiveChange: netChange > 0 ? netChange : 0,
      negativeChange: netChange < 0 ? Math.abs(netChange) : 0,
      netChange,
      total: active,
    };
  }).filter(item => item.base > 0 || item.positiveChange > 0 || item.negativeChange > 0);

  if (chartData.length === 0) {
    return null;
  }

  // Custom bar with cap
  const renderCustomBar = (props: any) => {
    const { x, y, width, height, payload } = props;
    const netChange = payload.netChange;
    const capHeight = Math.min(8, height * 0.15); // Cap is 15% of bar or max 8px
    
    if (netChange === 0) {
      // No change - just render the base bar
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

    // Render bar with colored cap
    const capColor = netChange > 0 ? 'hsl(142, 76%, 36%)' : 'hsl(0, 84%, 60%)';
    
    return (
      <g>
        {/* Main bar */}
        <rect
          x={x}
          y={y + capHeight}
          width={width}
          height={height - capHeight}
          fill="hsl(var(--primary))"
          rx={2}
        />
        {/* Cap */}
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
    <div className="mb-6">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="level" 
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Bar 
            dataKey="total" 
            shape={renderCustomBar}
            isAnimationActive={false}
          >
            <LabelList 
              dataKey="total" 
              position="bottom" 
              offset={-20}
              fill="hsl(var(--foreground))"
              fontSize={12}
              fontWeight={600}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
