import { lastDayOfMonth, differenceInDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Employee, isActiveAtEndOfMonth } from '@/hooks/useExecutiveSummaryData';
import { Users, Clock } from 'lucide-react';

interface HeadcountStatsCardsProps {
  employees: Employee[];
  selectedMonth: Date;
}

export const HeadcountStatsCards = ({
  employees,
  selectedMonth,
}: HeadcountStatsCardsProps) => {
  const lastDay = lastDayOfMonth(selectedMonth);
  
  // Get active employees at end of month
  const activeEmployees = employees.filter(emp => 
    isActiveAtEndOfMonth(emp, selectedMonth)
  );
  
  const totalActive = activeEmployees.length;

  // Gender split calculation
  const femaleCount = activeEmployees.filter(
    emp => emp.gender?.toLowerCase() === 'female'
  ).length;
  const maleCount = activeEmployees.filter(
    emp => emp.gender?.toLowerCase() === 'male'
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

  return (
    <div className="flex flex-col gap-4">
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

      {/* Median Tenure Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Median Tenure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {medianTenure.toFixed(1)} <span className="text-base font-normal text-muted-foreground">years</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
