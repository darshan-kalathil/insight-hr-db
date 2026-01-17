import { useState } from 'react';
import { lastDayOfMonth, differenceInDays, subMonths } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Employee, isActiveAtEndOfMonth } from '@/hooks/useExecutiveSummaryData';
import { Users, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface HeadcountStatsCardsProps {
  employees: Employee[];
  selectedMonth: Date;
}

type TenureMetric = 'median' | 'lessThanOneYear';

export const HeadcountStatsCards = ({
  employees,
  selectedMonth,
}: HeadcountStatsCardsProps) => {
  const [tenureMetric, setTenureMetric] = useState<TenureMetric>('lessThanOneYear');
  const lastDay = lastDayOfMonth(selectedMonth);
  
  // Get active employees at end of month
  const activeEmployees = employees.filter(emp => 
    isActiveAtEndOfMonth(emp, selectedMonth)
  );
  
  const totalActive = activeEmployees.length;

  // Gender split calculation (M = Men, F = Women)
  const femaleCount = activeEmployees.filter(
    emp => emp.gender?.toUpperCase() === 'F'
  ).length;
  const maleCount = activeEmployees.filter(
    emp => emp.gender?.toUpperCase() === 'M'
  ).length;
  
  const femalePercent = totalActive > 0 
    ? ((femaleCount / totalActive) * 100).toFixed(1) 
    : '0.0';
  const malePercent = totalActive > 0 
    ? ((maleCount / totalActive) * 100).toFixed(1) 
    : '0.0';

  // Median tenure calculation
  const tenures = activeEmployees.map(emp => {
    const doj = new Date(emp.doj);
    const endDate = lastDay;
    const days = differenceInDays(endDate, doj);
    return days / 365; // Convert to years
  });

  const getMedian = (values: number[]): number => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const medianTenure = getMedian(tenures);

  // Percentage with tenure less than 1 year
  const lessThanOneYearCount = tenures.filter(t => t < 1).length;
  const lessThanOneYearPercent = totalActive > 0
    ? ((lessThanOneYearCount / totalActive) * 100).toFixed(1)
    : '0.0';

  // Month-on-month growth calculation
  const previousMonth = subMonths(selectedMonth, 1);
  const previousMonthActive = employees.filter(emp => 
    isActiveAtEndOfMonth(emp, previousMonth)
  ).length;

  const momChange = totalActive - previousMonthActive;
  const momPercentChange = previousMonthActive > 0
    ? ((momChange / previousMonthActive) * 100).toFixed(1)
    : totalActive > 0 ? '100.0' : '0.0';

  const getMomIcon = () => {
    if (momChange > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (momChange < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getMomColor = () => {
    if (momChange > 0) return 'text-green-600';
    if (momChange < 0) return 'text-red-600';
    return 'text-muted-foreground';
  };

  return (
    <div className="flex flex-col gap-4">
      {/* MoM Growth Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            {getMomIcon()}
            MoM Growth
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getMomColor()}`}>
            {momChange > 0 ? '+' : ''}{momChange}
            <span className="text-base font-normal ml-2">
              ({momChange >= 0 ? '+' : ''}{momPercentChange}%)
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            vs {previousMonthActive} last month
          </div>
        </CardContent>
      </Card>

      {/* Gender Split Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Gender Split
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Women</span>
            <span className="font-medium">
              {femaleCount} <span className="text-muted-foreground text-sm">({femalePercent}%)</span>
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Men</span>
            <span className="font-medium">
              {maleCount} <span className="text-muted-foreground text-sm">({malePercent}%)</span>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Tenure Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <Select value={tenureMetric} onValueChange={(value: TenureMetric) => setTenureMetric(value)}>
              <SelectTrigger className="h-auto border-0 p-0 text-base font-semibold shadow-none focus:ring-0 w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="median">Median Tenure</SelectItem>
                <SelectItem value="lessThanOneYear">Tenure &lt; 1 Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {tenureMetric === 'median' ? (
            <div className="text-2xl font-bold">
              {medianTenure.toFixed(1)} <span className="text-base font-normal text-muted-foreground">years</span>
            </div>
          ) : (
            <div className="text-2xl font-bold">
              {lessThanOneYearPercent}%
              <span className="text-base font-normal text-muted-foreground ml-2">
                ({lessThanOneYearCount} of {totalActive})
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
