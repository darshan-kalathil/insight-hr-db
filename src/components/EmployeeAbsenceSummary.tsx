import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmployeeDailyAbsence } from '@/hooks/useEmployeeAbsenceData';
import { useEmployeeLeaveCoverage } from '@/hooks/useEmployeeLeaveCoverage';

interface EmployeeAbsenceSummaryProps {
  data: EmployeeDailyAbsence[];
  leaveTypes: string[];
  regularizationTypes: string[];
  attendanceData: { date: string; status: string }[];
  employeeCode: string | null;
  startDate: Date;
  endDate: Date;
}

export const EmployeeAbsenceSummary = ({ 
  data, 
  leaveTypes, 
  regularizationTypes,
  attendanceData,
  employeeCode,
  startDate,
  endDate
}: EmployeeAbsenceSummaryProps) => {
  // Fetch coverage data (all leaves/regularizations regardless of filter)
  const { data: coverageSet } = useEmployeeLeaveCoverage(employeeCode, startDate, endDate);

  // Count occurrences of each type
  const leaveCounts = new Map<string, number>();
  const regularizationCounts = new Map<string, number>();

  data.forEach((item) => {
    if (item.absenceType) {
      if (leaveTypes.includes(item.absenceType)) {
        leaveCounts.set(item.absenceType, (leaveCounts.get(item.absenceType) || 0) + 1);
      } else if (regularizationTypes.includes(item.absenceType)) {
        regularizationCounts.set(item.absenceType, (regularizationCounts.get(item.absenceType) || 0) + 1);
      }
    }
  });

  // Calculate unapproved absences (red boxes)
  const isAbsentStatus = (status: string): boolean => {
    return status === 'Absent' || status === 'Unapproved Absence';
  };

  const unapprovedAbsencesCount = attendanceData.filter(({ date, status }) => {
    const hasCoverage = coverageSet?.has(date);
    return !hasCoverage && isAbsentStatus(status);
  }).length;

  // Convert to sorted arrays
  const leaveEntries = Array.from(leaveCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const regularizationEntries = Array.from(regularizationCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  // Calculate totals
  const totalLeaves = leaveEntries.reduce((sum, [, count]) => sum + count, 0);
  const totalRegularizations = regularizationEntries.reduce((sum, [, count]) => sum + count, 0);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Absence Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Leaves Column */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Leaves</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leave Type</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveEntries.length > 0 ? (
                  leaveEntries.map(([type, count]) => (
                    <TableRow key={type}>
                      <TableCell>{type}</TableCell>
                      <TableCell className="text-right font-medium">{count}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      No leaves recorded
                    </TableCell>
                  </TableRow>
                )}
                {leaveEntries.length > 0 && (
                  <TableRow className="border-t-2 font-semibold bg-muted/50">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{totalLeaves}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Regularizations Column */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Regularizations</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Regularization Type</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regularizationEntries.length > 0 ? (
                  regularizationEntries.map(([type, count]) => (
                    <TableRow key={type}>
                      <TableCell>{type}</TableCell>
                      <TableCell className="text-right font-medium">{count}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      No regularizations recorded
                    </TableCell>
                  </TableRow>
                )}
                {regularizationEntries.length > 0 && (
                  <TableRow className="border-t-2 font-semibold bg-muted/50">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{totalRegularizations}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Unapproved Absences */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Unapproved Absences</span>
            <span className="text-2xl font-bold text-red-500">{unapprovedAbsencesCount}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Days marked absent without leave or regularization coverage
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
