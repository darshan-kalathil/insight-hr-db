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
import { LevelHeadcountBarChart } from './LevelHeadcountBarChart';

interface ExecutiveSummaryTableProps {
  employees: Employee[];
  selectedMonth: Date;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const ExecutiveSummaryTable = ({
  employees,
  selectedMonth,
  viewMode,
  onViewModeChange,
}: ExecutiveSummaryTableProps) => {
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

  const levelData = LEVELS.map(level => ({
    level,
    active: isEndOfMonth
      ? getLevelHeadcount(employees, selectedMonth, level)
      : getLevelHeadcountAsOfDate(employees, today, level),
    additions: additions.filter(emp => emp.level === level).length,
    exits: exits.filter(emp => emp.level === level).length,
  }));

  const totals = levelData.reduce(
    (acc, row) => ({
      active: acc.active + row.active,
      additions: acc.additions + row.additions,
      exits: acc.exits + row.exits,
    }),
    { active: 0, additions: 0, exits: 0 }
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Level-wise Headcount</CardTitle>
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
        <LevelHeadcountBarChart
          employees={employees}
          selectedMonth={selectedMonth}
          viewMode={viewMode}
        />
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
  );
};
