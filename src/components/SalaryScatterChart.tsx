import { useState, useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Employee {
  id: string;
  name: string;
  level: string;
  salary: number;
}

interface SalaryRange {
  level: string;
  min_salary: number;
  max_salary: number;
  variable_pay_percentage: number;
}

interface SalaryScatterChartProps {
  employees: Employee[];
  salaryRanges: SalaryRange[];
}

const LEVEL_COLORS: Record<string, string> = {
  'N+1': '#F59E0B', // Yellow
  'N+2': '#A855F7', // Purple
  'N+3': '#000000', // Black
  'N+4': '#10B981', // Green
  'N+5': '#3B82F6', // Blue
  'N+6': '#EF4444', // Red
};

export const SalaryScatterChart = ({ employees, salaryRanges }: SalaryScatterChartProps) => {
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [salaryMode, setSalaryMode] = useState<'fixed' | 'fixed-epf'>('fixed-epf');

  // Helper to normalize level format (N-1 -> N+1)
  const normalizeLevel = (level: string) => {
    return level.replace('N-', 'N+');
  };

  const chartData = useMemo(() => {
    // Filter employees with salary data and sort by salary descending
    const employeesWithSalary = employees
      .filter(emp => emp.salary && emp.salary > 0)
      .sort((a, b) => b.salary - a.salary);

    // Convert to chart format with index and salary in lakhs
    return employeesWithSalary.map((emp, index) => {
      const displaySalary = salaryMode === 'fixed-epf' 
        ? emp.salary + (emp.salary * 0.06) // Fixed + EPF
        : emp.salary; // Fixed only
      const normalizedLevel = normalizeLevel(emp.level);
      return {
        index: index,
        salary: displaySalary / 100000, // Convert to lakhs
        name: emp.name,
        level: normalizedLevel,
        originalSalary: emp.salary,
        fill: LEVEL_COLORS[normalizedLevel] || '#6B7280',
      };
    });
  }, [employees, salaryMode]);

  // Group data by level for separate scatter series
  const dataByLevel = useMemo(() => {
    const grouped: Record<string, typeof chartData> = {};
    chartData.forEach(point => {
      if (!grouped[point.level]) {
        grouped[point.level] = [];
      }
      grouped[point.level].push(point);
    });
    return grouped;
  }, [chartData]);

  // Calculate statistics for selected level
  const levelStats = useMemo(() => {
    if (!selectedLevel) return null;

    // Find range by normalizing the level format (database has N-1, we display N+1)
    const range = salaryRanges.find(r => normalizeLevel(r.level) === selectedLevel);
    if (!range) return null;

    const levelEmployees = chartData.filter(emp => emp.level === selectedLevel);
    if (levelEmployees.length === 0) return null;

    // Calculate median
    const salaries = levelEmployees.map(e => e.salary).sort((a, b) => a - b);
    const median = salaries.length % 2 === 0
      ? (salaries[salaries.length / 2 - 1] + salaries[salaries.length / 2]) / 2
      : salaries[Math.floor(salaries.length / 2)];

    const minSalary = salaryMode === 'fixed-epf'
      ? (range.min_salary + (range.min_salary * 0.06)) / 100000
      : range.min_salary / 100000;
    const maxSalary = salaryMode === 'fixed-epf'
      ? (range.max_salary + (range.max_salary * 0.06)) / 100000
      : range.max_salary / 100000;

    return {
      min: minSalary,
      max: maxSalary,
      median: median,
    };
  }, [selectedLevel, salaryRanges, chartData, salaryMode]);

  // Get level positions for labels
  const levelPositions = useMemo(() => {
    const positions: Record<string, number> = {};
    Object.keys(dataByLevel).forEach(level => {
      const levelData = dataByLevel[level];
      if (levelData.length > 0) {
        // Position at the start of each level group
        positions[level] = levelData[0].index;
      }
    });
    return positions;
  }, [dataByLevel]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const fixedSalary = data.originalSalary;
      
      // Get variable pay percentage for this level
      const levelRange = salaryRanges.find(r => normalizeLevel(r.level) === data.level);
      const variablePercentage = levelRange?.variable_pay_percentage || 0;
      
      // Calculate components
      const epf = Math.round(fixedSalary * 0.06);
      const variable = Math.round(fixedSalary * (variablePercentage / 100));
      const ctc = fixedSalary + epf + variable;
      
      const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 0
        }).format(amount);
      };
      
      return (
        <div className="bg-black text-white px-4 py-3 rounded-md shadow-lg space-y-1">
          <p className="font-bold text-lg">{data.name}</p>
          <p className="text-sm">Level: {data.level}</p>
          <div className="border-t border-gray-600 my-2 pt-2 space-y-1">
            <p className="text-sm font-bold">Fixed Salary: {formatCurrency(fixedSalary)}</p>
            <p className="text-sm">EPF: {formatCurrency(epf)}</p>
            <p className="text-sm">Variable ({variablePercentage}%): {formatCurrency(variable)}</p>
            <p className="text-sm border-t border-gray-600 pt-1 mt-1">CTC: {formatCurrency(ctc)}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  const handleLegendClick = (level: string) => {
    setSelectedLevel(selectedLevel === level ? null : level);
  };

  return (
    <Card className="p-6">
      <div className="mb-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Levels (Click dots to show ranges):</h3>
          <Select value={salaryMode} onValueChange={(value: 'fixed' | 'fixed-epf') => setSalaryMode(value)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Fixed Salary</SelectItem>
              <SelectItem value="fixed-epf">Fixed Salary w/ EPF</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-4 justify-center">
          {Object.entries(LEVEL_COLORS).map(([level, color]) => (
            <button
              key={level}
              onClick={() => handleLegendClick(level)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${
                selectedLevel === level ? 'ring-2 ring-offset-2' : 'hover:bg-gray-100'
              }`}
              style={{ borderColor: selectedLevel === level ? color : 'transparent' }}
            >
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="font-medium" style={{ color: color }}>
                {level}
              </span>
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={600}>
        <ScatterChart margin={{ top: 40, right: 100, bottom: 20, left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="index"
            name="Employees"
            domain={[0, chartData.length + 5]}
            label={{ value: 'Employees', position: 'insideBottom', offset: -10 }}
          />
          <YAxis
            type="number"
            dataKey="salary"
            name={salaryMode === 'fixed-epf' ? 'Fixed Salary w/ EPF' : 'Fixed Salary'}
            domain={[0, 'auto']}
            label={{ 
              value: salaryMode === 'fixed-epf' ? 'Fixed Salary w/ EPF' : 'Fixed Salary', 
              angle: -90, 
              position: 'insideLeft' 
            }}
            tickFormatter={(value) => `${value}L`}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Reference lines for selected level */}
          {levelStats && (
            <>
              <ReferenceLine
                y={levelStats.min}
                stroke={LEVEL_COLORS[selectedLevel!]}
                strokeWidth={2}
                label={{ 
                  value: `Min: ${levelStats.min.toFixed(1)}L`, 
                  position: 'insideTopRight',
                  fill: LEVEL_COLORS[selectedLevel!],
                  fontSize: 12,
                  fontWeight: 'bold'
                }}
              />
              <ReferenceLine
                y={levelStats.max}
                stroke={LEVEL_COLORS[selectedLevel!]}
                strokeWidth={2}
                label={{ 
                  value: `Max: ${levelStats.max.toFixed(1)}L`, 
                  position: 'insideBottomRight',
                  fill: LEVEL_COLORS[selectedLevel!],
                  fontSize: 12,
                  fontWeight: 'bold'
                }}
              />
              <ReferenceLine
                y={levelStats.median}
                stroke={LEVEL_COLORS[selectedLevel!]}
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{ 
                  value: `Median: ${levelStats.median.toFixed(1)}L`, 
                  position: 'insideTopRight',
                  fill: LEVEL_COLORS[selectedLevel!],
                  fontSize: 12,
                  fontWeight: 'bold',
                  offset: 15
                }}
              />
            </>
          )}

          {/* Scatter series for each level */}
          {Object.entries(dataByLevel).map(([level, data]) => (
            <Scatter
              key={level}
              name={level}
              data={data}
              fill={LEVEL_COLORS[level] || '#6B7280'}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </Card>
  );
};
