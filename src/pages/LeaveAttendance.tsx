import { DashboardLayout } from '@/components/DashboardLayout';
import { AttendanceUpload } from '@/components/AttendanceUpload';

const LeaveAttendance = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Leave & Attendance</h1>
          <p className="text-muted-foreground mt-2">
            Upload and manage employee attendance records.
          </p>
        </div>

        <AttendanceUpload />
      </div>
    </DashboardLayout>
  );
};

export default LeaveAttendance;
