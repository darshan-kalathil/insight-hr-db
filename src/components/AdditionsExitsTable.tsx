import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Employee,
  getAdditionsInMonth,
  getExitsInMonth,
} from '@/hooks/useExecutiveSummaryData';

interface AdditionsExitsTableProps {
  employees: Employee[];
  selectedMonth: Date;
}

export const AdditionsExitsTable = ({
  employees,
  selectedMonth,
}: AdditionsExitsTableProps) => {
  const additions = getAdditionsInMonth(employees, selectedMonth);
  const exits = getExitsInMonth(employees, selectedMonth);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-green-600">New Additions</CardTitle>
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
          <CardTitle className="text-red-600">Exits</CardTitle>
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
