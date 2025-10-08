import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/lib/activityLogger';
import { LeaveAnalytics } from '@/components/LeaveAnalytics';
import { RegularizationAnalytics } from '@/components/RegularizationAnalytics';
import { EmployeeLeaveRegularizationChart } from '@/components/EmployeeLeaveRegularizationChart';
import { UnapprovedAbsences } from '@/components/UnapprovedAbsences';
import { calculateReconciliation } from '@/lib/reconciliationService';
import { startOfYear, endOfYear, subMonths } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { calculateDuration } from '@/lib/utils';

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
  const [biometricResult, setBiometricResult] = useState<ParseResult | null>(null);
  const [parsingLeave, setParsingLeave] = useState(false);
  const [parsingAttendance, setParsingAttendance] = useState(false);
  const [parsingBiometric, setParsingBiometric] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const parseDate = (dateValue: any): string | null => {
    if (!dateValue) return null;

    // Handle Excel date serial numbers
    if (typeof dateValue === 'number') {
      const date = XLSX.SSF.parse_date_code(dateValue);
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }

    // Handle string dates
    if (typeof dateValue === 'string') {
      const dateOnly = dateValue.split(' ')[0].trim();
      
      // Try DD-MM-YYYY format first (e.g., "01-10-2025")
      const ddmmyyyyMatch = dateOnly.match(/^(\d{2})-(\d{2})-(\d{4})$/);
      if (ddmmyyyyMatch) {
        const [_, day, month, year] = ddmmyyyyMatch;
        return `${year}-${month}-${day}`;
      }
      
      // Fall back to standard date parsing (e.g., "22-Oct-2025")
      const date = new Date(dateOnly);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    return null;
  };

  const parseTime = (timeValue: any): string | null => {
    if (!timeValue) return null;
    
    if (typeof timeValue === 'string') {
      const trimmed = timeValue.trim();
      
      // Handle "08:35 AM" or "08:35 PM" format
      const ampmMatch = trimmed.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (ampmMatch) {
        let hours = parseInt(ampmMatch[1]);
        const minutes = ampmMatch[2];
        const period = ampmMatch[3].toUpperCase();
        
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        
        return `${String(hours).padStart(2, '0')}:${minutes}:00`;
      }
      
      // Handle 24-hour format "08:35" or "17:45"
      const time24Match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
      if (time24Match) {
        const hours = String(parseInt(time24Match[1])).padStart(2, '0');
        const minutes = time24Match[2];
        return `${hours}:${minutes}:00`;
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

      // Log available columns for debugging
      if (jsonData.length > 0) {
        const sampleRow = jsonData[0] as any;
        console.log('Available columns in Leave file:', Object.keys(sampleRow));
      }

      for (const row of jsonData as any[]) {
        try {
          const approvalStatus = row['Approval Status']?.toString().trim();
          
          // Skip cancelled leaves
          if (approvalStatus === 'Cancelled') {
            results.skipped++;
            continue;
          }

          // Try multiple possible column names for Employee ID
          const employeeIdRaw = row['Employee ID'] || row['Employee Id'] || row['employee_id'] || row['EmployeeID'];
          
          if (!employeeIdRaw) {
            results.errors++;
            results.errorDetails.push(`Missing Employee ID field. Available fields: ${Object.keys(row).join(', ')}`);
            continue;
          }

          // Extract employee number from "Name ONDC-E-XXX" format or direct "ONDC-E-XXX" format
          const employeeIdStr = employeeIdRaw.toString();
          const employeeMatch = employeeIdStr.match(/ONDC-E-\d+/);
          
          if (!employeeMatch) {
            results.errors++;
            results.errorDetails.push(`Could not extract employee number from: ${employeeIdStr}`);
            continue;
          }

          const leaveRecord = {
            employee_number: employeeMatch[0],
            leave_type: row['Leave type'],
            from_date: parseDate(row['From']),
            to_date: parseDate(row['To']),
            days_taken: parseFloat(row['Days/Hours Taken']) || 0,
            reason: row['Reason for leave']?.toString() || null,
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

      // Insert data into database using upsert
      if (results.data.length > 0) {
        for (const record of results.data) {
          // Get employee UUID from employee number
          const { data: employee, error: employeeError } = await supabase
            .from('employees')
            .select('id')
            .eq('empl_no', record.employee_number)
            .maybeSingle();

          if (employeeError || !employee) {
            results.errors++;
            results.errorDetails.push(`Employee ${record.employee_number} not found in database`);
            continue;
          }

          // Upsert leave record
          const { error: upsertError } = await supabase
            .from('leave_records')
            .upsert({
              employee_id: employee.id,
              from_date: record.from_date,
              to_date: record.to_date,
              leave_type: record.leave_type,
              number_of_days: record.days_taken,
              reason: record.reason,
              approval_status: record.approval_status
            }, {
              onConflict: 'employee_id,from_date,to_date,leave_type'
            });

          if (upsertError) {
            results.errors++;
            results.errorDetails.push(`Failed to save record for ${record.employee_number}: ${upsertError.message}`);
          }
        }

        await logActivity({
          actionType: 'create',
          entityType: 'employee',
          description: `Imported ${results.valid} leave records`
        });
      }

      setLeaveResult(results);
      toast({
        title: 'Leave Data Imported',
        description: `Valid: ${results.valid}, Skipped: ${results.skipped}, Errors: ${results.errors}`
      });
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
      // Skip first 2 rows, headers are on row 3 (range starts from 2)
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: 2 });

      const results: ParseResult = {
        total: jsonData.length,
        valid: 0,
        skipped: 0,
        errors: 0,
        errorDetails: [],
        data: []
      };

      // Log available columns for debugging
      if (jsonData.length > 0) {
        const sampleRow = jsonData[0] as any;
        console.log('Available columns in Attendance file:', Object.keys(sampleRow));
      }

      for (const row of jsonData as any[]) {
        try {
          const approvalStatus = row['Approval Status']?.toString().trim();
          
          // Skip cancelled regularizations
          if (approvalStatus === 'Cancelled') {
            results.skipped++;
            continue;
          }

          // Try multiple possible column names for Employee ID
          const employeeIdRaw = row['Employee ID'] || row['Employee Id'] || row['employee_id'] || row['EmployeeID'];
          
          if (!employeeIdRaw) {
            results.errors++;
            results.errorDetails.push(`Missing Employee ID field. Available fields: ${Object.keys(row).join(', ')}`);
            continue;
          }

          const employeeIdStr = employeeIdRaw.toString().trim();
          const employeeMatch = employeeIdStr.match(/ONDC-E-\d+/);
          
          if (!employeeMatch) {
            results.errors++;
            results.errorDetails.push(`Could not extract employee number from: ${employeeIdStr}`);
            continue;
          }
          
          const employeeNumber = employeeMatch[0];

          const attendanceRecord = {
            employee_number: employeeNumber,
            attendance_date: parseDate(row['Attendance Day']),
            old_check_in: parseTime(row['Old Check-In']),
            new_check_in: parseTime(row['New Check-In']),
            old_check_out: parseTime(row['Old Check-Out']),
            new_check_out: parseTime(row['New Check-Out']),
            old_hours: parseFloat(row['Old Hours']) || 0,
            new_hours: parseFloat(row['New Hours']) || 0,
            old_status: row['Old Status']?.toString() || 'Absent',
            new_status: row['New Status']?.toString() || 'Present',
            reason: row['Reason']?.toString(),
            description: row['Description']?.toString() || null,
            approval_status: approvalStatus,
            approver_name: row['Approver']?.toString() || null,
            approval_time: row['Approval Time'] ? parseDate(row['Approval Time']) : null
          };

          results.data.push(attendanceRecord);
          results.valid++;
        } catch (error: any) {
          results.errors++;
          results.errorDetails.push(`Error parsing row: ${error.message}`);
        }
      }

      // Insert data into database using upsert
      if (results.data.length > 0) {
        for (const record of results.data) {
          // Get employee UUID from employee number
          const { data: employee, error: employeeError } = await supabase
            .from('employees')
            .select('id')
            .eq('empl_no', record.employee_number)
            .maybeSingle();

          if (employeeError || !employee) {
            results.errors++;
            results.errorDetails.push(`Employee ${record.employee_number} not found in database`);
            continue;
          }

          // Upsert attendance record
          const { error: upsertError } = await supabase
            .from('attendance_regularization')
            .upsert({
              employee_id: employee.id,
              attendance_date: record.attendance_date,
              in_time: record.new_check_in,
              out_time: record.new_check_out,
              reason: record.reason,
              approval_status: record.approval_status
            }, {
              onConflict: 'employee_id,attendance_date,reason'
            });

          if (upsertError) {
            results.errors++;
            results.errorDetails.push(`Failed to save record for ${record.employee_number}: ${upsertError.message}`);
          }
        }

        await logActivity({
          actionType: 'create',
          entityType: 'employee',
          entityId: 'bulk',
          description: `Imported ${results.valid} attendance records`
        });
      }

      setAttendanceResult(results);
      toast({
        title: 'Attendance Data Imported',
        description: `Valid: ${results.valid}, Skipped: ${results.skipped}, Errors: ${results.errors}`
      });
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

  const handleBiometricUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setParsingBiometric(true);
    setBiometricResult(null);

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

      // Batch-load all employees for fast in-memory lookups
      const { data: allEmployees, error: employeesError } = await supabase
        .from('employees')
        .select('id, empl_no, location');

      if (employeesError) {
        throw new Error(`Failed to load employees: ${employeesError.message}`);
      }

      // Create a Map for O(1) lookups by employee code
      const employeeMap = new Map(
        allEmployees?.map(emp => [emp.empl_no, { id: emp.id, location: emp.location }]) || []
      );

      for (const row of jsonData as any[]) {
        try {
          // Normalize column names by creating a case-insensitive lookup
          const normalizedRow: Record<string, any> = {};
          for (const [key, value] of Object.entries(row)) {
            normalizedRow[key.toLowerCase().trim().replace(/\s+/g, '')] = value;
          }

          const status = (normalizedRow['status'] || normalizedRow['attendance'])?.toString().trim();
          
          // Skip Weekly Off and Holiday rows
          if (status === 'Weekly Off' || status === 'Holiday') {
            results.skipped++;
            continue;
          }

          // Try multiple possible column names for employee code (normalized)
          const employeeCodeRaw = (
            normalizedRow['employeecode'] || 
            normalizedRow['empcode'] || 
            normalizedRow['emp.code'] || 
            normalizedRow['employeeid'] || 
            normalizedRow['emplno'] ||
            normalizedRow['employee_code'] ||
            normalizedRow['emp_code']
          )?.toString().trim();
          
          if (!employeeCodeRaw) {
            results.errors++;
            const availableColumns = Object.keys(row).join(', ');
            results.errorDetails.push(`Missing Employee Code field. Available columns: ${availableColumns}`);
            continue;
          }

          // Transform ONDCExxx to ONDC-E-xxx format
          const match = employeeCodeRaw.match(/^ONDCE(\d{3})$/);
          if (!match) {
            results.skipped++;
            continue; // Skip non-ONDCE format codes
          }

          const employeeCode = `ONDC-E-${match[1]}`;

          // Look up employee from in-memory map
          const employee = employeeMap.get(employeeCode);

          if (!employee) {
            results.errors++;
            results.errorDetails.push(`Employee ${employeeCode} not found in database`);
            continue;
          }

          const inTime = parseTime(normalizedRow['intime']);
          const outTime = parseTime(normalizedRow['outtime']);
          
          // Read duration from Excel (e.g., "05:54")
          const excelDuration = normalizedRow['duration'];
          const duration = excelDuration && typeof excelDuration === 'string' && excelDuration !== '00:00'
            ? `${excelDuration}:00`
            : null;
          
          const biometricRecord = {
            employee_id: employee.id,
            employee_code: employeeCode,
            attendance_date: parseDate(normalizedRow['date'] || row['Date']),
            in_time: inTime,
            out_time: outTime,
            duration: duration,
            status: status || 'Present'
          };

          results.data.push(biometricRecord);
          results.valid++;
        } catch (error: any) {
          results.errors++;
          results.errorDetails.push(`Error parsing row: ${error.message}`);
        }
      }

      // Insert data into database
      if (results.data.length > 0) {
        for (const record of results.data) {
          const { error: upsertError } = await supabase
            .from('biometric_attendance')
            .upsert(record, {
              onConflict: 'employee_id,attendance_date'
            });

          if (upsertError) {
            results.errors++;
            results.errorDetails.push(`Failed to save biometric record: ${upsertError.message}`);
          }
        }

        // Trigger reconciliation calculation
        const dateRange = results.data.reduce(
          (acc, record) => {
            const date = new Date(record.attendance_date);
            return {
              min: !acc.min || date < acc.min ? date : acc.min,
              max: !acc.max || date > acc.max ? date : acc.max
            };
          },
          { min: null as Date | null, max: null as Date | null }
        );

        if (dateRange.min && dateRange.max) {
          await calculateReconciliation(dateRange.min, dateRange.max);
          // Invalidate unapproved absences queries to refresh the UI
          queryClient.invalidateQueries({ queryKey: ['unapproved-absences'] });
        }

        await logActivity({
          actionType: 'create',
          entityType: 'employee',
          description: `Imported ${results.valid} biometric attendance records`
        });
      }

      setBiometricResult(results);
      toast({
        title: 'Biometric Data Imported',
        description: `Valid: ${results.valid}, Skipped: ${results.skipped}, Errors: ${results.errors}`
      });
    } catch (error: any) {
      toast({
        title: 'Parse Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setParsingBiometric(false);
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

        <Tabs defaultValue="uploads" className="space-y-4">
          <TabsList>
            <TabsTrigger value="uploads">Uploads</TabsTrigger>
            <TabsTrigger value="leave-analytics">Leave Analytics</TabsTrigger>
            <TabsTrigger value="regularization-analytics">Regularization Analytics</TabsTrigger>
            <TabsTrigger value="unapproved-absences">Unapproved Absences</TabsTrigger>
          </TabsList>

          <TabsContent value="uploads" className="space-y-4">
            {/* Employee Search and Chart */}
            <EmployeeLeaveRegularizationChart />

            {/* Upload Buttons at Bottom */}
            <div className="grid gap-4 md:grid-cols-3 mt-8">
              {/* Leave Records Upload */}
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

              {/* Attendance Regularization Upload */}
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

              {/* Biometric Attendance Upload */}
              <Card>
                <CardHeader>
                  <CardTitle>Upload Biometric Attendance Data</CardTitle>
                  <CardDescription>
                    Upload the daily attendance Excel file. Weekly offs and holidays will be automatically excluded. Only Delhi-based employees will be processed.
                  </CardDescription>
                </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleBiometricUpload}
                    disabled={parsingBiometric}
                    className="hidden"
                    id="biometric-upload"
                  />
                  <label htmlFor="biometric-upload">
                    <Button asChild disabled={parsingBiometric}>
                      <span className="cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" />
                        {parsingBiometric ? 'Parsing...' : 'Upload Biometric Data'}
                      </span>
                    </Button>
                  </label>
                </div>

                {biometricResult && (
                  <div className="space-y-3 mt-4">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium">{biometricResult.valid} valid records parsed (Delhi employees)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium">{biometricResult.skipped} records skipped (weekly offs, holidays, non-Delhi)</span>
                    </div>
                    {biometricResult.errors > 0 && (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span className="font-medium">{biometricResult.errors} errors</span>
                        </div>
                        {biometricResult.errorDetails.length > 0 && (
                          <div className="mt-2 p-3 bg-destructive/10 rounded-md">
                            <p className="text-sm font-medium mb-2">Error Details:</p>
                            <ul className="text-xs space-y-1">
                              {biometricResult.errorDetails.slice(0, 5).map((error, index) => (
                                <li key={index} className="text-muted-foreground">{error}</li>
                              ))}
                              {biometricResult.errorDetails.length > 5 && (
                                <li className="text-muted-foreground">
                                  ... and {biometricResult.errorDetails.length - 5} more errors
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
            </div>
          </TabsContent>

          <TabsContent value="leave-analytics">
            <LeaveAnalytics />
          </TabsContent>

          <TabsContent value="regularization-analytics">
            <RegularizationAnalytics />
          </TabsContent>

          <TabsContent value="unapproved-absences">
            <UnapprovedAbsences />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default LeaveAttendance;
