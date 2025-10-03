import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatIndianCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Math.round(amount));
}

export function getCurrentFinancialYear(): { startDate: Date; endDate: Date } {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed (0 = January)

  let fyStartYear: number;
  let fyEndYear: number;

  if (currentMonth < 3) {
    // Before April (Jan, Feb, Mar) - use previous year April to current year March
    fyStartYear = currentYear - 1;
    fyEndYear = currentYear;
  } else {
    // April onwards - use current year April to next year March
    fyStartYear = currentYear;
    fyEndYear = currentYear + 1;
  }

  return {
    startDate: new Date(fyStartYear, 3, 1), // April 1
    endDate: new Date(fyEndYear, 2, 31), // March 31
  };
}
