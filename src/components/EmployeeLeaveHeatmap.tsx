import { format, getDaysInMonth, getDay } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EmployeeDailyAbsence } from '@/hooks/useEmployeeAbsenceData';

interface EmployeeLeaveHeatmapProps {
  data: EmployeeDailyAbsence[];
  startDate: Date;
  endDate: Date;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export const EmployeeLeaveHeatmap = ({ data, startDate, endDate }: EmployeeLeaveHeatmapProps) => {
  // Create a map for quick lookup
  const dataMap = new Map(data.map(d => [d.date, d.absenceType]));

  // Get color for absence (single color since it's one employee)
  const getColorForAbsence = (hasAbsence: boolean) => {
    return hasAbsence ? 'bg-primary' : 'bg-muted/20';
  };

  // Check if a date is a weekend (Saturday = 6, Sunday = 0)
  const isWeekend = (dateStr: string): boolean => {
    const day = getDay(new Date(dateStr));
    return day === 0 || day === 6;
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
          <span className="text-muted-foreground">Not Absent</span>
          <div className="flex gap-1">
            <div className="w-4 h-4 bg-muted/20 border border-border"></div>
            <div className="w-4 h-4 bg-primary border border-border"></div>
          </div>
          <span className="text-muted-foreground">Absent</span>
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

                    // If day doesn't exist in this month, render empty cell
                    if (!dateStr || day > daysInMonth) {
                      return (
                        <div 
                          key={`empty-${monthIdx}-${day}`} 
                          className="w-7 h-6"
                        ></div>
                      );
                    }

                    // If weekend, render black cell with no interaction
                    if (isWeekend(dateStr)) {
                      return (
                        <div 
                          key={`weekend-${monthIdx}-${day}`} 
                          className="w-7 h-6 bg-black border border-border"
                        ></div>
                      );
                    }
                    
                    const absenceType = dataMap.get(dateStr);
                    const hasAbsence = !!absenceType;

                    return (
                      <TooltipProvider key={`${monthIdx}-${day}`}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`w-7 h-6 border border-border cursor-pointer transition-all hover:ring-2 hover:ring-primary hover:scale-110 ${getColorForAbsence(hasAbsence)}`}
                            ></div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-semibold">
                                {format(new Date(dateStr), 'MMM dd, yyyy')}
                              </p>
                              {hasAbsence ? (
                                <p className="text-sm">
                                  Absent: {absenceType}
                                </p>
                              ) : (
                                <p className="text-sm">Present</p>
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
