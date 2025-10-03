import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

type ParseResult = {
  total: number;
  valid: number;
  skipped: number;
  errors: number;
  errorDetails: string[];
  data: any[];
};

const LeaveAttendance = () => {
  const [leaveResult, setLeaveResult] = useState<ParseResult | null>(null);
  const [attendanceResult, setAttendanceResult] = useState<ParseResult | null>(null);
  const [parsingLeave, setParsingLeave] = useState(false);
  const [parsingAttendance, setParsingAttendance] = useState(false);
  const { toast } = useToast();

  const parseDate = (dateValue: any): string | null => {
    if (!dateValue) return null;

    // Handle Excel date serial numbers
    if (typeof dateValue === 'number') {
      const date = XLSX.SSF.parse_date_code(dateValue);
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }

    // Handle string dates (e.g., "22-Oct-2025")
    if (typeof dateValue === 'string') {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    return null;
  };

  const parseTime = (timeValue: any): string | null => {
    if (!timeValue) return null;
    
    if (typeof timeValue === 'string') {
      // Handle "08:35 AM" format
      const match = timeValue.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (match) {
        let hours = parseInt(match[1]);
        const minutes = match[2];
        const period = match[3].toUpperCase();
        
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        
        return `${String(hours).padStart(2, '0')}:${minutes}:00`;
      }
    }
    return null;
  };

  const handleLeaveUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setParsingLeave(true);
    setLeaveResult(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const results: ParseResult = {
        total: jsonData.length,
        valid: 0,
        skipped: 0,
        errors: 0,
        errorDetails: [],
        data: []
      };

      for (const row of jsonData as any[]) {
        try {
          const approvalStatus = row['Approval Status']?.toString().trim();
          
          // Skip cancelled leaves
          if (approvalStatus === 'Cancelled') {
            results.skipped++;
            continue;
          }

          // Extract employee number from "Name ONDC-E-XXX" format
          const employeeIdRaw = row['Employee ID']?.toString();
          const employeeMatch = employeeIdRaw?.match(/ONDC-E-\d+/);
          
          if (!employeeMatch) {
            results.errors++;
            results.errorDetails.push(`Could not extract employee number from: ${employeeIdRaw}`);
            continue;
          }

          const leaveRecord = {
            employee_number: employeeMatch[0],
            leave_type: row['Leave Type'],
            from_date: parseDate(row['From Date']),
            to_date: parseDate(row['To Date']),
            days_taken: parseFloat(row['No. of Days/Hours taken']) || 0,
            reason: row['Reason']?.toString() || null,
            approval_status: approvalStatus,
            approver_name: row['Approver Name']?.toString() || null,
            approval_time: row['Approval time'] ? parseDate(row['Approval time']) : null,
            unit: row['Unit']?.toString() || 'Day',
            session_details: row['Session Details'] || null,
            added_by: row['Added By']?.toString() || null
          };

          results.data.push(leaveRecord);
          results.valid++;
        } catch (error: any) {
          results.errors++;
          results.errorDetails.push(`Error parsing row: ${error.message}`);
        }
      }

      setLeaveResult(results);
      toast({
        title: 'Leave Data Parsed',
        description: `Valid: ${results.valid}, Skipped (Cancelled): ${results.skipped}, Errors: ${results.errors}`
      });

      console.log('Parsed Leave Records:', results.data);
    } catch (error: any) {
      toast({
        title: 'Parse Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setParsingLeave(false);
      event.target.value = '';
    }
  };

  const handleAttendanceUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setParsingAttendance(true);
    setAttendanceResult(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const results: ParseResult = {
        total: jsonData.length,
        valid: 0,
        skipped: 0,
        errors: 0,
        errorDetails: [],
        data: []
      };

      for (const row of jsonData as any[]) {
        try {
          const approvalStatus = row['Approval Status']?.toString().trim();
          
          // Skip cancelled regularizations
          if (approvalStatus === 'Cancelled') {
            results.skipped++;
            continue;
          }

          // Extract employee number directly (already in "ONDC-E-XXX" format)
          const employeeNumber = row['Employee ID']?.toString().trim();
          
          if (!employeeNumber || !employeeNumber.startsWith('ONDC-E-')) {
            results.errors++;
            results.errorDetails.push(`Invalid employee number: ${employeeNumber}`);
            continue;
          }

          const attendanceRecord = {
            employee_number: employeeNumber,
            attendance_date: parseDate(row['Attendance Date']),
            old_check_in: parseTime(row['Old Check in']),
            new_check_in: parseTime(row['New Check in']),
            old_check_out: parseTime(row['Old Check out']),
            new_check_out: parseTime(row['New Check out']),
            old_hours: parseFloat(row['Old Hours']) || 0,
            new_hours: parseFloat(row['New Hours']) || 0,
            old_status: row['Old Status']?.toString() || 'Absent',
            new_status: row['New Status']?.toString() || 'Present',
            reason: row['Reason']?.toString(),
            description: row['Description']?.toString() || null,
            approval_status: approvalStatus,
            approver_name: row['Approver Name']?.toString() || null,
            approval_time: row['Approval time'] ? parseDate(row['Approval time']) : null
          };

          results.data.push(attendanceRecord);
          results.valid++;
        } catch (error: any) {
          results.errors++;
          results.errorDetails.push(`Error parsing row: ${error.message}`);
        }
      }

      setAttendanceResult(results);
      toast({
        title: 'Attendance Data Parsed',
        description: `Valid: ${results.valid}, Skipped (Cancelled): ${results.skipped}, Errors: ${results.errors}`
      });

      console.log('Parsed Attendance Records:', results.data);
    } catch (error: any) {
      toast({
        title: 'Parse Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setParsingAttendance(false);
      event.target.value = '';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Leave & Attendance Analysis</h1>
          <p className="text-muted-foreground mt-2">
            Upload and analyze leave records and attendance regularization data
          </p>
        </div>

        <Tabs defaultValue="leave" className="space-y-4">
          <TabsList>
            <TabsTrigger value="leave">Leave Records</TabsTrigger>
            <TabsTrigger value="attendance">Attendance Regularization</TabsTrigger>
          </TabsList>

          <TabsContent value="leave" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upload Leave Data</CardTitle>
                <CardDescription>
                  Upload the Leave_View Excel file. Cancelled leaves will be automatically skipped.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleLeaveUpload}
                    disabled={parsingLeave}
                    className="hidden"
                    id="leave-upload"
                  />
                  <label htmlFor="leave-upload">
                    <Button asChild disabled={parsingLeave}>
                      <span className="cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" />
                        {parsingLeave ? 'Parsing...' : 'Upload Leave Data'}
                      </span>
                    </Button>
                  </label>
                </div>

                {leaveResult && (
                  <div className="space-y-3 mt-4">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium">{leaveResult.valid} valid records parsed</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium">{leaveResult.skipped} cancelled records skipped</span>
                    </div>
                    {leaveResult.errors > 0 && (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span className="font-medium">{leaveResult.errors} errors</span>
                        </div>
                        {leaveResult.errorDetails.length > 0 && (
                          <div className="mt-2 p-3 bg-destructive/10 rounded-md">
                            <p className="text-sm font-medium mb-2">Error Details:</p>
                            <ul className="text-xs space-y-1">
                              {leaveResult.errorDetails.slice(0, 5).map((error, index) => (
                                <li key={index} className="text-muted-foreground">{error}</li>
                              ))}
                              {leaveResult.errorDetails.length > 5 && (
                                <li className="text-muted-foreground">
                                  ... and {leaveResult.errorDetails.length - 5} more errors
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upload Attendance Regularization Data</CardTitle>
                <CardDescription>
                  Upload the Attendance_Regularization_Request Excel file. Cancelled requests will be automatically skipped.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleAttendanceUpload}
                    disabled={parsingAttendance}
                    className="hidden"
                    id="attendance-upload"
                  />
                  <label htmlFor="attendance-upload">
                    <Button asChild disabled={parsingAttendance}>
                      <span className="cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" />
                        {parsingAttendance ? 'Parsing...' : 'Upload Attendance Data'}
                      </span>
                    </Button>
                  </label>
                </div>

                {attendanceResult && (
                  <div className="space-y-3 mt-4">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium">{attendanceResult.valid} valid records parsed</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium">{attendanceResult.skipped} cancelled records skipped</span>
                    </div>
                    {attendanceResult.errors > 0 && (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span className="font-medium">{attendanceResult.errors} errors</span>
                        </div>
                        {attendanceResult.errorDetails.length > 0 && (
                          <div className="mt-2 p-3 bg-destructive/10 rounded-md">
                            <p className="text-sm font-medium mb-2">Error Details:</p>
                            <ul className="text-xs space-y-1">
                              {attendanceResult.errorDetails.slice(0, 5).map((error, index) => (
                                <li key={index} className="text-muted-foreground">{error}</li>
                              ))}
                              {attendanceResult.errorDetails.length > 5 && (
                                <li className="text-muted-foreground">
                                  ... and {attendanceResult.errorDetails.length - 5} more errors
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default LeaveAttendance;
