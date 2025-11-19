import { DashboardLayout } from '@/components/DashboardLayout';
import { AttendanceUpload } from '@/components/AttendanceUpload';
import { LeaveUpload } from '@/components/LeaveUpload';
import { RegularizationUpload } from '@/components/RegularizationUpload';
import { AttendanceRecords } from '@/components/AttendanceRecords';
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

        <Tabs defaultValue="upload" className="w-full">
          <TabsList>
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="space-y-6">
            <AttendanceUpload />
            <LeaveUpload />
            <RegularizationUpload />
          </TabsContent>
          
          <TabsContent value="attendance">
            <AttendanceRecords />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default LeaveAttendance;
