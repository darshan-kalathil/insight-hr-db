import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RegularizationRecord {
  attendance_date: string;
  reason: string;
  in_time: string | null;
  out_time: string | null;
  approval_status: string;
}

interface EmployeeRegularizationDetailsTableProps {
  records: RegularizationRecord[];
  isLoading: boolean;
}

const getRegTypeBadgeVariant = (reason: string) => {
  const r = reason.toLowerCase();
  if (r.includes('forgot')) return 'default';
  if (r.includes('work from home') || r.includes('wfh')) return 'secondary';
  if (r.includes('meeting')) return 'outline';
  return 'outline';
};

const getStatusBadgeVariant = (status: string) => {
  const s = status.toLowerCase();
  if (s === 'approved') return 'secondary';
  if (s === 'pending') return 'outline';
  if (s === 'rejected') return 'destructive';
  return 'outline';
};

export const EmployeeRegularizationDetailsTable = ({ records, isLoading }: EmployeeRegularizationDetailsTableProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Regularization Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            Loading regularization records...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (records.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Regularization Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No regularization records found
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Regularization Details ({records.length} days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border max-h-[400px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>In Time</TableHead>
                <TableHead>Out Time</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record, index) => (
                <TableRow key={`${record.attendance_date}-${index}`}>
                  <TableCell className="font-medium">
                    {format(new Date(record.attendance_date), 'dd MMM yyyy')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRegTypeBadgeVariant(record.reason)}>
                      {record.reason}
                    </Badge>
                  </TableCell>
                  <TableCell>{record.in_time || '-'}</TableCell>
                  <TableCell>{record.out_time || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(record.approval_status)}>
                      {record.approval_status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
