import { DashboardLayout } from '@/components/DashboardLayout';
import { AttendanceUpload } from '@/components/AttendanceUpload';
import { LeaveUpload } from '@/components/LeaveUpload';
import { RegularizationUpload } from '@/components/RegularizationUpload';

const LeaveAttendance = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Leave & Attendance</h1>
          <p className="text-muted-foreground mt-2">
            Upload and manage employee leave and attendance records.
          </p>
        </div>

        <div className="space-y-6">
          <AttendanceUpload />
          <LeaveUpload />
          <RegularizationUpload />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LeaveAttendance;
