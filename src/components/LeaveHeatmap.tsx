import { useState } from 'react';
import { format, getDaysInMonth } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DailyLeaveData {
  date: string;
  count: number;
  employees: { name: string; leaveType: string }[];
}

interface LeaveHeatmapProps {
  data: DailyLeaveData[];
  startDate: Date;
  endDate: Date;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export const LeaveHeatmap = ({ data, startDate, endDate }: LeaveHeatmapProps) => {
  // Create a map for quick lookup
  const dataMap = new Map(data.map(d => [d.date, d]));

  // Get max count for color scaling
  const maxCount = Math.max(...data.map(d => d.count), 1);

  // Get color intensity based on count
  const getColorIntensity = (count: number) => {
    if (count === 0) return 'bg-muted/20';
    const intensity = Math.min(count / maxCount, 1);
    
    if (intensity <= 0.2) return 'bg-primary/20';
    if (intensity <= 0.4) return 'bg-primary/40';
    if (intensity <= 0.6) return 'bg-primary/60';
    if (intensity <= 0.8) return 'bg-primary/80';
    return 'bg-primary';
  };

  // Generate year range
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  const startMonth = startDate.getMonth();
  const endMonth = endDate.getMonth();

  // Calculate which months to show
  const monthsToShow: { year: number; month: number; label: string }[] = [];
  for (let year = startYear; year <= endYear; year++) {
    const firstMonth = year === startYear ? startMonth : 0;
    const lastMonth = year === endYear ? endMonth : 11;
    
    for (let month = firstMonth; month <= lastMonth; month++) {
      monthsToShow.push({ 
        year, 
        month, 
        label: `${MONTHS[month]} ${year % 100}` 
      });
    }
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-max">
        {/* Legend */}
        <div className="flex items-center gap-2 mb-4 text-sm">
          <span className="text-muted-foreground">Less</span>
          <div className="flex gap-1">
            <div className="w-4 h-4 bg-muted/20 border border-border"></div>
            <div className="w-4 h-4 bg-primary/20 border border-border"></div>
            <div className="w-4 h-4 bg-primary/40 border border-border"></div>
            <div className="w-4 h-4 bg-primary/60 border border-border"></div>
            <div className="w-4 h-4 bg-primary/80 border border-border"></div>
            <div className="w-4 h-4 bg-primary border border-border"></div>
          </div>
          <span className="text-muted-foreground">More</span>
        </div>

        {/* Heatmap Grid */}
        <div className="inline-block">
          <div className="grid gap-px" style={{ gridTemplateColumns: `auto repeat(31, 1fr)` }}>
            {/* Header Row - Day numbers */}
            <div className="w-20"></div>
            {Array.from({ length: 31 }, (_, dayIndex) => {
              const day = dayIndex + 1;
              return (
                <div key={`header-day-${day}`} className="text-xs font-medium text-center py-2 min-w-[28px]">
                  {day}
                </div>
              );
            })}

            {/* Month rows */}
            {monthsToShow.map((monthInfo, monthIdx) => {
              const daysInMonth = getDaysInMonth(new Date(monthInfo.year, monthInfo.month));
              
              return (
                <>
                  {/* Month label */}
                  <div key={`month-label-${monthIdx}`} className="text-xs font-medium text-right pr-3 py-1 leading-6">
                    {monthInfo.label}
                  </div>
                  
                  {/* Cells for each day */}
                  {Array.from({ length: 31 }, (_, dayIndex) => {
                    const day = dayIndex + 1;
                    const dateStr = day <= daysInMonth 
                      ? format(new Date(monthInfo.year, monthInfo.month, day), 'yyyy-MM-dd')
                      : null;
                    
                    const cellData = dateStr ? dataMap.get(dateStr) : null;
                    const count = cellData?.count || 0;
                    const employees = cellData?.employees || [];

                    // If day doesn't exist in this month, render empty cell
                    if (!dateStr || day > daysInMonth) {
                      return (
                        <div 
                          key={`empty-${monthIdx}-${day}`} 
                          className="w-7 h-6"
                        ></div>
                      );
                    }

                    return (
                      <TooltipProvider key={`${monthIdx}-${day}`}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`w-7 h-6 border border-border cursor-pointer transition-all hover:ring-2 hover:ring-primary hover:scale-110 ${getColorIntensity(count)}`}
                            ></div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-semibold">
                                {format(new Date(dateStr), 'MMM dd, yyyy')}
                              </p>
                              <p className="text-sm">
                                {count} {count === 1 ? 'person' : 'people'} on leave
                              </p>
                              {employees.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-border">
                                  <p className="text-xs font-medium mb-1">Employees:</p>
                                  <ul className="text-xs space-y-0.5">
                                    {employees.map((emp, idx) => (
                                      <li key={idx}>
                                        {emp.name} ({emp.leaveType})
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};