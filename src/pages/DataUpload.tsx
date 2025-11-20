import { DashboardLayout } from '@/components/DashboardLayout';
import { EmployeeImport } from '@/components/EmployeeImport';
import { AttendanceUpload } from '@/components/AttendanceUpload';
import { LeaveUpload } from '@/components/LeaveUpload';
import { RegularizationUpload } from '@/components/RegularizationUpload';

const DataUpload = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Data Upload</h1>
          <p className="text-muted-foreground mt-2">
            Upload and manage employee, attendance, leave, and regularization data.
          </p>
        </div>

        <div className="space-y-6">
          <EmployeeImport onImportComplete={() => {}} />
          <AttendanceUpload />
          <LeaveUpload />
          <RegularizationUpload />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DataUpload;
