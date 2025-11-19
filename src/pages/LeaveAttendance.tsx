import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const LeaveAttendance = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Leave & Attendance</h1>
          <p className="text-muted-foreground mt-2">
            This module is under reconstruction. New features coming soon.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              The Leave & Attendance module is being rebuilt from scratch.
              This is a blank slate ready for new features.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default LeaveAttendance;
