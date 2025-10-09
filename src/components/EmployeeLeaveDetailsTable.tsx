import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LeaveRecord {
  date: string;
  leaveType: string;
  reason: string | null;
  approvalStatus: string;
  totalDays: number;
}

interface EmployeeLeaveDetailsTableProps {
  records: LeaveRecord[];
  isLoading: boolean;
}

const getLeaveTypeBadgeVariant = (leaveType: string) => {
  const type = leaveType.toLowerCase();
  if (type.includes('casual')) return 'default';
  if (type.includes('sick')) return 'destructive';
  if (type.includes('earned')) return 'secondary';
  return 'outline';
};

const getStatusBadgeVariant = (status: string) => {
  const s = status.toLowerCase();
  if (s === 'approved') return 'secondary';
  if (s === 'pending') return 'outline';
  if (s === 'rejected') return 'destructive';
  return 'outline';
};

export const EmployeeLeaveDetailsTable = ({ records, isLoading }: EmployeeLeaveDetailsTableProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leave Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            Loading leave records...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (records.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leave Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No leave records found
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave Details ({records.length} days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border max-h-[400px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Leave Type</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record, index) => (
                <TableRow key={`${record.date}-${index}`}>
                  <TableCell className="font-medium">
                    {format(new Date(record.date), 'dd MMM yyyy')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getLeaveTypeBadgeVariant(record.leaveType)}>
                      {record.leaveType}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {record.reason || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(record.approvalStatus)}>
                      {record.approvalStatus}
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
