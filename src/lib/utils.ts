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

export function calculateDuration(inTime: string | null, outTime: string | null): string | null {
  // If no in time, no duration
  if (!inTime) return null;
  
  // If in time but no out time, use 7 hours
  if (!outTime) return "7:00:00";
  
  // Parse times
  const [inHours, inMinutes, inSeconds] = inTime.split(':').map(Number);
  const [outHours, outMinutes, outSeconds] = outTime.split(':').map(Number);
  
  // Convert to total minutes
  const inTotalMinutes = inHours * 60 + inMinutes + (inSeconds / 60);
  const outTotalMinutes = outHours * 60 + outMinutes + (outSeconds / 60);
  
  // Calculate difference
  let diffMinutes = outTotalMinutes - inTotalMinutes;
  
  // Handle negative difference (out time is next day)
  if (diffMinutes < 0) {
    diffMinutes += 24 * 60;
  }
  
  // Convert back to hours:minutes:seconds
  const hours = Math.floor(diffMinutes / 60);
  const minutes = Math.floor(diffMinutes % 60);
  const seconds = Math.floor((diffMinutes % 1) * 60);
  
  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
