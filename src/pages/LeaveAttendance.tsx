import { DashboardLayout } from '@/components/DashboardLayout';
import { AttendanceUpload } from '@/components/AttendanceUpload';
import { LeaveUpload } from '@/components/LeaveUpload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

        <Tabs defaultValue="attendance" className="w-full">
          <TabsList>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="leave">Leave</TabsTrigger>
          </TabsList>
          <TabsContent value="attendance" className="space-y-4">
            <AttendanceUpload />
          </TabsContent>
          <TabsContent value="leave" className="space-y-4">
            <LeaveUpload />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default LeaveAttendance;
