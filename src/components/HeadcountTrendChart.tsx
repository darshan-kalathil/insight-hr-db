import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ChevronDown } from 'lucide-react';
import {
  LEVELS,
  Employee,
  getFYRange,
  getHeadcountTrend,
} from '@/hooks/useExecutiveSummaryData';

interface HeadcountTrendChartProps {
  employees: Employee[];
  selectedMonth: Date;
}

export const HeadcountTrendChart = ({
  employees,
  selectedMonth,
}: HeadcountTrendChartProps) => {
  const [selectedLevels, setSelectedLevels] = useState<string[]>([...LEVELS]);

  const fyRange = getFYRange(selectedMonth);
  const trendData = getHeadcountTrend(
    employees,
    fyRange.start,
    fyRange.end,
    selectedLevels
  );

  const handleLevelToggle = (level: string) => {
    setSelectedLevels(prev =>
      prev.includes(level)
        ? prev.filter(l => l !== level)
        : [...prev, level]
    );
  };

  const handleSelectAll = () => {
    setSelectedLevels([...LEVELS]);
  };

  const handleClearAll = () => {
    setSelectedLevels([]);
  };

  const getLevelFilterLabel = () => {
    if (selectedLevels.length === LEVELS.length) return 'All Levels';
    if (selectedLevels.length === 0) return 'No Levels';
    if (selectedLevels.length <= 2) return selectedLevels.join(', ');
    return `${selectedLevels.length} Levels`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Headcount Trend ({fyRange.label})</CardTitle>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[150px] justify-between">
              {getLevelFilterLabel()}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-4">
            <div className="space-y-4">
              <div className="flex justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="text-xs"
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="text-xs"
                >
                  Clear All
                </Button>
              </div>
              <div className="space-y-2">
                {LEVELS.map(level => (
                  <div key={level} className="flex items-center space-x-2">
                    <Checkbox
                      id={`level-${level}`}
                      checked={selectedLevels.includes(level)}
                      onCheckedChange={() => handleLevelToggle(level)}
                    />
                    <label
                      htmlFor={`level-${level}`}
                      className="text-sm cursor-pointer"
                    >
                      {level}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </CardHeader>
      <CardContent>
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip
                formatter={(value: number) => [value, 'Headcount']}
                labelFormatter={(label) => `Month: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="headcount"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">
            No data available for the selected period
          </div>
        )}
      </CardContent>
    </Card>
  );
};
