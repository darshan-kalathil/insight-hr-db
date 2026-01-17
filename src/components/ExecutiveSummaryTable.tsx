import { useState } from 'react';
import { format, lastDayOfMonth } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  LEVELS,
  Employee,
  getLevelHeadcount,
  getLevelHeadcountAsOfDate,
  getAdditionsInMonth,
  getExitsInMonth,
  getAdditionsUpToDate,
  getExitsUpToDate,
  getLevelHeadcountPreviousMonth,
} from '@/hooks/useExecutiveSummaryData';
import { ViewMode } from '@/pages/ExecutiveSummary';
import { RotateCcw } from 'lucide-react';

interface ExecutiveSummaryTableProps {
  employees: Employee[];
  selectedMonth: Date;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

// Custom shape for outlined exit bars
const OutlinedBar = (props: any) => {
  const { x, y, width, height, fill } = props;
  if (!height || height <= 0) return null;
  
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill="transparent"
      stroke={fill}
      strokeWidth={2}
      strokeDasharray="4 2"
    />
  );
};

export const ExecutiveSummaryTable = ({
  employees,
  selectedMonth,
  viewMode,
  onViewModeChange,
}: ExecutiveSummaryTableProps) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const today = new Date();
  
  const lastDay = lastDayOfMonth(selectedMonth);
  const isEndOfMonth = viewMode === 'endOfMonth';
  
  const dateHeader = isEndOfMonth
    ? `Active as on ${format(lastDay, 'do MMMM')}`
    : `Active as on ${format(today, 'do MMMM')}`;

  // Calculate additions and exits based on view mode
  const additions = isEndOfMonth
    ? getAdditionsInMonth(employees, selectedMonth)
    : getAdditionsUpToDate(employees, selectedMonth, today);
  
  const exits = isEndOfMonth
    ? getExitsInMonth(employees, selectedMonth)
    : getExitsUpToDate(employees, selectedMonth, today);

  const levelData = LEVELS.map(level => {
    const previousMonthHeadcount = getLevelHeadcountPreviousMonth(employees, selectedMonth, level);
    const levelAdditions = additions.filter(emp => emp.level === level).length;
    const levelExits = exits.filter(emp => emp.level === level).length;
    const retained = previousMonthHeadcount - levelExits;
    const active = isEndOfMonth
      ? getLevelHeadcount(employees, selectedMonth, level)
      : getLevelHeadcountAsOfDate(employees, today, level);
    
    return {
      level,
      active,
      additions: levelAdditions,
      exits: levelExits,
      retained: Math.max(0, retained),
      previousMonthHeadcount,
    };
  });

  const totals = levelData.reduce(
    (acc, row) => ({
      active: acc.active + row.active,
      additions: acc.additions + row.additions,
      exits: acc.exits + row.exits,
    }),
    { active: 0, additions: 0, exits: 0 }
  );

  // Chart data: bar height = retained + additions (= active employees)
  // Exits shown as outlined bars below the main bar to show attrition
  const chartData = levelData.map(row => ({
    level: row.level,
    retained: row.retained,
    additions: row.additions,
    negativeExits: row.exits > 0 ? -row.exits : 0, // Negative value for exits below zero line
    exits: row.exits,
    active: row.active,
  }));

  // Calculate domain for Y axis to accommodate negative exits
  const maxActive = Math.max(...chartData.map(d => d.retained + d.additions));
  const minExits = Math.min(...chartData.map(d => d.negativeExits));

  return (
    <div className="flip-card" style={{ perspective: '1000px' }}>
      <div
        className="flip-card-inner transition-transform duration-500"
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front - Stacked Bar Chart (Default) */}
        <Card
          className="flip-card-front"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle
              className="cursor-pointer hover:text-primary transition-colors flex items-center gap-2"
              onClick={() => setIsFlipped(true)}
            >
              Level-wise Headcount
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
            <Select value={viewMode} onValueChange={(value: ViewMode) => onViewModeChange(value)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="endOfMonth">End of Month</SelectItem>
                <SelectItem value="asOfToday">As of Today</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={chartData} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="level" className="text-xs" />
                  <YAxis 
                    className="text-xs" 
                    domain={[minExits - 1, maxActive + 2]}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = {
                        retained: 'Retained',
                        negativeExits: 'Exits',
                        additions: 'Additions',
                      };
                      // Show absolute value for exits
                      const displayValue = name === 'negativeExits' ? Math.abs(value) : value;
                      return [displayValue, labels[name] || name];
                    }}
                  />
                  <Legend
                    formatter={(value: string) => {
                      const labels: Record<string, string> = {
                        retained: 'Retained',
                        negativeExits: 'Exits',
                        additions: 'Additions',
                      };
                      return labels[value] || value;
                    }}
                  />
                  {/* Main bar: retained (bottom) + additions (green cap on top) */}
                  <Bar dataKey="retained" stackId="main" fill="#93C5FD" name="retained" />
                  <Bar dataKey="additions" stackId="main" fill="#22C55E" name="additions" />
                  {/* Exits shown as outlined bars below the zero line */}
                  <Bar 
                    dataKey="negativeExits" 
                    fill="transparent"
                    stroke="#EF4444"
                    strokeWidth={2}
                    name="negativeExits"
                    shape={OutlinedBar}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Back - Table View */}
        <Card
          className="flip-card-back absolute inset-0"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle
              className="cursor-pointer hover:text-primary transition-colors flex items-center gap-2"
              onClick={() => setIsFlipped(false)}
            >
              Level-wise Headcount
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
            <Select value={viewMode} onValueChange={(value: ViewMode) => onViewModeChange(value)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="endOfMonth">End of Month</SelectItem>
                <SelectItem value="asOfToday">As of Today</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-right">{dateHeader}</TableHead>
                  <TableHead className="text-right">Additions</TableHead>
                  <TableHead className="text-right">Exits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {levelData.map(row => (
                  <TableRow key={row.level}>
                    <TableCell className="font-medium">{row.level}</TableCell>
                    <TableCell className="text-right">{row.active}</TableCell>
                    <TableCell className="text-right text-green-600">
                      {row.additions > 0 ? `+${row.additions}` : row.additions}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {row.exits > 0 ? `-${row.exits}` : row.exits}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/50">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{totals.active}</TableCell>
                  <TableCell className="text-right text-green-600">
                    {totals.additions > 0 ? `+${totals.additions}` : totals.additions}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {totals.exits > 0 ? `-${totals.exits}` : totals.exits}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
