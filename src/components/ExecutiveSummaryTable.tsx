import { format, lastDayOfMonth } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LEVELS,
  Employee,
  getLevelHeadcount,
  getAdditionsInMonth,
  getExitsInMonth,
} from '@/hooks/useExecutiveSummaryData';

interface ExecutiveSummaryTableProps {
  employees: Employee[];
  selectedMonth: Date;
}

export const ExecutiveSummaryTable = ({
  employees,
  selectedMonth,
}: ExecutiveSummaryTableProps) => {
  const lastDay = lastDayOfMonth(selectedMonth);
  const dateHeader = `Active as on ${format(lastDay, 'do MMMM')}`;

  const additions = getAdditionsInMonth(employees, selectedMonth);
  const exits = getExitsInMonth(employees, selectedMonth);

  const levelData = LEVELS.map(level => ({
    level,
    active: getLevelHeadcount(employees, selectedMonth, level),
    additions: additions.filter(emp => emp.level === level).length,
    exits: exits.filter(emp => emp.level === level).length,
  }));

  const totals = levelData.reduce(
    (acc, row) => ({
      active: acc.active + row.active,
      additions: acc.additions + row.additions,
      exits: acc.exits + row.exits,
    }),
    { active: 0, additions: 0, exits: 0 }
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Level-wise Headcount</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Level</TableHead>
              <TableHead className="text-right">{dateHeader}</TableHead>
              <TableHead className="text-right">Additions</TableHead>
              <TableHead className="text-right">Exits</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {levelData.map(row => (
              <TableRow key={row.level}>
                <TableCell className="font-medium">{row.level}</TableCell>
                <TableCell className="text-right">{row.active}</TableCell>
                <TableCell className="text-right text-green-600">
                  {row.additions > 0 ? `+${row.additions}` : row.additions}
                </TableCell>
                <TableCell className="text-right text-red-600">
                  {row.exits > 0 ? `-${row.exits}` : row.exits}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold bg-muted/50">
              <TableCell>Total</TableCell>
              <TableCell className="text-right">{totals.active}</TableCell>
              <TableCell className="text-right text-green-600">
                {totals.additions > 0 ? `+${totals.additions}` : totals.additions}
              </TableCell>
              <TableCell className="text-right text-red-600">
                {totals.exits > 0 ? `-${totals.exits}` : totals.exits}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
