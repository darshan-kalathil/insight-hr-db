import { format, lastDayOfMonth } from 'date-fns';
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
  const isEndOfMonth = viewMode === 'endOfMonth';

  // Calculate total active headcount
  const totalActive = LEVELS.reduce((sum, level) => {
    const count = isEndOfMonth
      ? getLevelHeadcount(employees, selectedMonth, level)
      : getLevelHeadcountAsOfDate(employees, today, level);
    return sum + count;
  }, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <CardTitle>Level-wise Headcount</CardTitle>
          <span className="text-2xl font-bold text-primary">{totalActive}</span>
        </div>
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
      </CardContent>
    </Card>
  );
};
