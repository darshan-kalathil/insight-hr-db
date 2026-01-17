import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ExecutiveSummaryTable } from '@/components/ExecutiveSummaryTable';
import { AdditionsExitsTable } from '@/components/AdditionsExitsTable';
import { HeadcountTrendChart } from '@/components/HeadcountTrendChart';
import { useExecutiveSummaryData } from '@/hooks/useExecutiveSummaryData';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const MONTHS = [
  { value: '0', label: 'January' },
  { value: '1', label: 'February' },
  { value: '2', label: 'March' },
  { value: '3', label: 'April' },
  { value: '4', label: 'May' },
  { value: '5', label: 'June' },
  { value: '6', label: 'July' },
  { value: '7', label: 'August' },
  { value: '8', label: 'September' },
  { value: '9', label: 'October' },
  { value: '10', label: 'November' },
  { value: '11', label: 'December' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => ({
  value: String(currentYear - 5 + i),
  label: String(currentYear - 5 + i),
}));

const ExecutiveSummary = () => {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  const { data: employees, isLoading } = useExecutiveSummaryData();

  const selectedDate = new Date(selectedYear, selectedMonth, 1);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="flex gap-4">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[200px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Executive Summary</h1>

        <div className="flex gap-4">
          <Select
            value={String(selectedMonth)}
            onValueChange={(value) => setSelectedMonth(parseInt(value))}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(selectedYear)}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year.value} value={year.value}>
                  {year.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ExecutiveSummaryTable
          employees={employees || []}
          selectedMonth={selectedDate}
        />

        <AdditionsExitsTable
          employees={employees || []}
          selectedMonth={selectedDate}
        />

        <HeadcountTrendChart
          employees={employees || []}
          selectedMonth={selectedDate}
        />
      </div>
    </DashboardLayout>
  );
};

export default ExecutiveSummary;
