import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Employee,
  getAdditionsInMonth,
  getExitsInMonth,
  getAdditionsUpToDate,
  getExitsUpToDate,
} from '@/hooks/useExecutiveSummaryData';
import { ViewMode } from '@/pages/ExecutiveSummary';

interface AdditionsExitsTableProps {
  employees: Employee[];
  selectedMonth: Date;
  viewMode: ViewMode;
}

export const AdditionsExitsTable = ({
  employees,
  selectedMonth,
  viewMode,
}: AdditionsExitsTableProps) => {
  const today = new Date();
  const isEndOfMonth = viewMode === 'endOfMonth';

  const additions = isEndOfMonth
    ? getAdditionsInMonth(employees, selectedMonth)
    : getAdditionsUpToDate(employees, selectedMonth, today);

  const exits = isEndOfMonth
    ? getExitsInMonth(employees, selectedMonth)
    : getExitsUpToDate(employees, selectedMonth, today);

  const additionsTitle = isEndOfMonth ? 'New Additions' : 'New Additions (as of today)';
  const exitsTitle = isEndOfMonth ? 'Exits' : 'Exits (as of today)';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-green-600">{additionsTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {additions.length > 0 ? (
            <ul className="space-y-2">
              {additions.map(emp => (
                <li key={emp.id} className="flex items-start">
                  <span className="mr-2">•</span>
                  <div>
                    <span className="font-medium">{emp.name}</span>
                    <span className="text-muted-foreground ml-1">
                      ({emp.pod}, {emp.level})
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground italic">No additions this month</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">{exitsTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {exits.length > 0 ? (
            <ul className="space-y-2">
              {exits.map(emp => (
                <li key={emp.id} className="flex items-start">
                  <span className="mr-2">•</span>
                  <div>
                    <span className="font-medium">{emp.name}</span>
                    <span className="text-muted-foreground ml-1">
                      ({emp.pod}, {emp.level})
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground italic">No exits this month</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
