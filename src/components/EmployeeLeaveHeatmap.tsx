import { format, getDaysInMonth, getDay } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EmployeeDailyAbsence } from '@/hooks/useEmployeeAbsenceData';
import { useEmployeeLeaveCoverage } from '@/hooks/useEmployeeLeaveCoverage';

interface EmployeeLeaveHeatmapProps {
  data: EmployeeDailyAbsence[];
  attendanceData: { date: string; status: string }[];
  startDate: Date;
  endDate: Date;
  leaveTypes: string[];
  regularizationTypes: string[];
  employeeCode: string | null;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export const EmployeeLeaveHeatmap = ({ data, attendanceData, startDate, endDate, leaveTypes, regularizationTypes, employeeCode }: EmployeeLeaveHeatmapProps) => {
  // Fetch coverage data (all leaves/regularizations regardless of filter)
  const { data: coverageSet } = useEmployeeLeaveCoverage(employeeCode, startDate, endDate);
  
  // Create a map for quick lookup
  const dataMap = new Map(data.map(d => [d.date, d.absenceType]));
  
  // Create attendance map for quick lookup
  const attendanceMap = new Map(attendanceData.map(d => [d.date, d.status]));

  // Get color for absence based on type
  const getColorForAbsence = (absenceType: string | null) => {
    if (!absenceType) return 'bg-muted/20';
    
    // Check if it's a leave type (blue)
    if (leaveTypes.includes(absenceType)) {
      return 'bg-blue-500';
    }
    
    // Check for business travel/events (green) - must come before other regularization checks
    if (absenceType === 'Attending Business Events' || absenceType === 'Travelling for Work') {
      return 'bg-green-500';
    }
    
    // Check for Work From Home (orange)
    if (absenceType === 'Work From Home') {
      return 'bg-orange-500';
    }
    
    // Default for other regularization types (orange)
    if (regularizationTypes.includes(absenceType)) {
      return 'bg-orange-500';
    }
    
    return 'bg-muted/20';
  };

  // Check if a date is a weekend (Saturday = 6, Sunday = 0)
  const isWeekend = (dateStr: string): boolean => {
    const day = getDay(new Date(dateStr));
    return day === 0 || day === 6;
  };

  // Check if status represents an absence
  const isAbsentStatus = (status: string): boolean => {
    return status === 'Absent' || status === 'Unapproved Absence';
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
        <div className="flex items-center gap-4 mb-4 text-sm flex-wrap">
          <span className="text-muted-foreground">Not Absent</span>
          <div className="w-4 h-4 bg-muted/20 border border-border"></div>
          
          <span className="text-muted-foreground ml-2">Leave</span>
          <div className="w-4 h-4 bg-blue-500 border border-border"></div>
          
          <span className="text-muted-foreground ml-2">Work From Home</span>
          <div className="w-4 h-4 bg-orange-500 border border-border"></div>
          
          <span className="text-muted-foreground ml-2">Business Events / Travel</span>
          <div className="w-4 h-4 bg-green-500 border border-border"></div>
          
          <span className="text-muted-foreground ml-2">Absent (No Leave/Regularization)</span>
          <div className="w-4 h-4 bg-red-500 border border-border"></div>
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
                    const attendanceStatus = attendanceMap.get(dateStr);
                    const hasCoverage = coverageSet?.has(dateStr);
                    const showRedBox = !hasCoverage && attendanceStatus && isAbsentStatus(attendanceStatus);

                    return (
                      <TooltipProvider key={`${monthIdx}-${day}`}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="relative">
                              <div
                                className={`w-7 h-6 border border-border cursor-pointer transition-all hover:ring-2 hover:ring-primary hover:scale-110 ${showRedBox ? 'bg-red-500' : getColorForAbsence(absenceType)}`}
                              >
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-semibold">
                                {format(new Date(dateStr), 'MMM dd, yyyy')}
                              </p>
                              {absenceType ? (
                                <p className="text-sm">
                                  Absent: {absenceType}
                                </p>
                              ) : showRedBox ? (
                                <p className="text-sm text-red-500">Attendance: {attendanceStatus}</p>
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
