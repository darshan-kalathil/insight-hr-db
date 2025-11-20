import { useState } from 'react';
import { format, differenceInMonths } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
}

export const DateRangePicker = ({
  dateRange,
  onDateRangeChange,
}: DateRangePickerProps) => {
  const [open, setOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | undefined>(dateRange);

  const isRangeValid = (range: DateRange | undefined): boolean => {
    if (!range?.from || !range?.to) return true;
    const monthsDiff = Math.abs(differenceInMonths(range.to, range.from));
    return monthsDiff <= 12;
  };

  const handleSelect = (range: DateRange | undefined) => {
    setTempRange(range);
    if (range?.from && range?.to && isRangeValid(range)) {
      onDateRangeChange(range);
      setOpen(false);
    }
  };

  const rangeIsInvalid = tempRange?.from && tempRange?.to && !isRangeValid(tempRange);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-[280px] justify-start text-left font-normal',
            !dateRange && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateRange?.from ? (
            dateRange.to ? (
              <>
                {format(dateRange.from, 'MMM dd, yyyy')} -{' '}
                {format(dateRange.to, 'MMM dd, yyyy')}
              </>
            ) : (
              format(dateRange.from, 'MMM dd, yyyy')
            )
          ) : (
            <span>Pick a date range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={dateRange?.from}
          selected={tempRange}
          onSelect={handleSelect}
          numberOfMonths={2}
          className="pointer-events-auto"
        />
        {rangeIsInvalid && (
          <Alert variant="destructive" className="m-3 mt-0">
            <AlertDescription>
              Date range cannot exceed 12 months
            </AlertDescription>
          </Alert>
        )}
      </PopoverContent>
    </Popover>
  );
};
