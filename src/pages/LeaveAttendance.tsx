import { DashboardLayout } from '@/components/DashboardLayout';

const LeaveAttendance = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Leave & Attendance</h1>
          <p className="text-muted-foreground mt-2">
            View and manage employee leave and attendance records.
          </p>
        </div>

        <div className="text-muted-foreground">
          <p>Leave and attendance management features coming soon.</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LeaveAttendance;
