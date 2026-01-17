import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, isWithinInterval, lastDayOfMonth } from 'date-fns';

export const LEVELS = ['N', 'N+1', 'N+2', 'N+3', 'N+4', 'N+5', 'N+6'] as const;

export interface Employee {
  id: string;
  name: string;
  empl_no: string;
  level: string;
  pod: string;
  doj: string;
  date_of_exit: string | null;
  status: string;
}

export const useExecutiveSummaryData = () => {
  return useQuery({
    queryKey: ['executive-summary-employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, empl_no, level, pod, doj, date_of_exit, status')
        .order('name');

      if (error) throw error;
      return data as Employee[];
    },
  });
};

export const isActiveAtEndOfMonth = (employee: Employee, monthDate: Date): boolean => {
  const endOfMonthDate = lastDayOfMonth(monthDate);
  const doj = new Date(employee.doj);
  const exitDate = employee.date_of_exit ? new Date(employee.date_of_exit) : null;

  // Employee must have joined on or before the end of month
  if (doj > endOfMonthDate) return false;

  // If no exit date, employee is still active
  if (!exitDate) return true;

  // If exit date is after end of month, employee was active at end of month
  return exitDate > endOfMonthDate;
};

export const getAdditionsInMonth = (employees: Employee[], monthDate: Date): Employee[] => {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);

  return employees.filter(emp => {
    const doj = new Date(emp.doj);
    return isWithinInterval(doj, { start: monthStart, end: monthEnd });
  });
};

export const getExitsInMonth = (employees: Employee[], monthDate: Date): Employee[] => {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);

  return employees.filter(emp => {
    if (!emp.date_of_exit) return false;
    const exitDate = new Date(emp.date_of_exit);
    return isWithinInterval(exitDate, { start: monthStart, end: monthEnd });
  });
};

export const getLevelHeadcount = (
  employees: Employee[],
  monthDate: Date,
  level: string
): number => {
  return employees.filter(
    emp => emp.level === level && isActiveAtEndOfMonth(emp, monthDate)
  ).length;
};

export const getFYRange = (selectedDate: Date) => {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();

  if (month >= 3) {
    // April or later (0-indexed: 3 = April)
    return {
      start: new Date(year, 3, 1), // April 1 of current year
      end: new Date(year + 1, 2, 31), // March 31 of next year
      label: `FY ${year}-${(year + 1).toString().slice(-2)}`,
    };
  } else {
    return {
      start: new Date(year - 1, 3, 1), // April 1 of previous year
      end: new Date(year, 2, 31), // March 31 of current year
      label: `FY ${year - 1}-${year.toString().slice(-2)}`,
    };
  }
};

export const getHeadcountTrend = (
  employees: Employee[],
  fyStart: Date,
  fyEnd: Date,
  selectedLevels: string[]
) => {
  const months = [];
  const monthNames = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

  for (let i = 0; i < 12; i++) {
    const monthIndex = (3 + i) % 12; // Start from April (index 3)
    const year = i < 9 ? fyStart.getFullYear() : fyStart.getFullYear() + 1;
    const monthDate = new Date(year, monthIndex, 1);
    const endOfMonthDate = lastDayOfMonth(monthDate);

    // Only include months up to current date
    if (endOfMonthDate > new Date()) {
      break;
    }

    const headcount = employees.filter(emp => {
      if (!selectedLevels.includes(emp.level)) return false;
      return isActiveAtEndOfMonth(emp, monthDate);
    }).length;

    months.push({
      month: monthNames[i],
      headcount,
      fullDate: monthDate,
    });
  }

  return months;
};
