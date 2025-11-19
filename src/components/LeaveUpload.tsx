import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

type ImportResult = {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
};

type LeaveUploadProps = {
  onImportComplete?: () => void;
};

export const LeaveUpload = ({ onImportComplete }: LeaveUploadProps) => {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const extractEmployeeCode = (employeeId: string): string | null => {
    // Extract ONDC-E-XXX or ONDC-C-XXX from strings like "Neeraj Adhithya K S ONDC-E-087" or "ONDC-E-033 Santosh Adsul"
    const match = String(employeeId).match(/(ONDC-[EC]-\d+)/);
    return match ? match[1] : null;
  };

  const parseDate = (dateValue: any): string | null => {
    if (!dateValue) return null;

    // If it's already a Date object
    if (dateValue instanceof Date) {
      const day = dateValue.getDate().toString().padStart(2, '0');
      const month = (dateValue.getMonth() + 1).toString().padStart(2, '0');
      const year = dateValue.getFullYear();
      return `${year}-${month}-${day}`;
    }

    // If it's a string in DD-MMM-YYYY format (e.g., "17-Nov-2025")
    const dateStr = String(dateValue);
    const match = dateStr.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
    if (match) {
      const [, day, monthStr, year] = match;
      const monthMap: { [key: string]: string } = {
        Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
        Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
      };
      const month = monthMap[monthStr];
      if (month) {
        return `${year}-${month}-${day.padStart(2, '0')}`;
      }
    }

    return null;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const importResult: ImportResult = {
        total: jsonData.length,
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: [],
      };

      // Track unique records by ZOHO_LINK_ID
      const recordsMap = new Map<string, any>();

      for (const row of jsonData as any[]) {
        const zohoLinkId = row['ZOHO_LINK_ID'];
        const rawEmployeeId = row['Employee ID'];
        const approvalStatus = row['Approval Status'];

        // Skip if essential fields are missing
        if (!zohoLinkId || !rawEmployeeId || !approvalStatus) {
          importResult.skipped++;
          continue;
        }

        const employeeCode = extractEmployeeCode(String(rawEmployeeId));
        if (!employeeCode) {
          importResult.errors.push(`Could not extract employee code from: ${rawEmployeeId}`);
          importResult.skipped++;
          continue;
        }

        const fromDate = parseDate(row['From']);
        const toDate = parseDate(row['To']);

        if (!fromDate || !toDate) {
          importResult.errors.push(`Invalid date format for ${employeeCode}: From=${row['From']}, To=${row['To']}`);
          importResult.skipped++;
          continue;
        }

        const daysHoursTaken = parseFloat(row['Days/Hours Taken']);
        if (isNaN(daysHoursTaken)) {
          importResult.errors.push(`Invalid Days/Hours Taken for ${employeeCode}: ${row['Days/Hours Taken']}`);
          importResult.skipped++;
          continue;
        }

        const leaveType = row['Leave type'] || '';

        recordsMap.set(zohoLinkId, {
          zoho_link_id: zohoLinkId,
          employee_code: employeeCode,
          leave_type: leaveType,
          from_date: fromDate,
          to_date: toDate,
          days_hours_taken: daysHoursTaken,
          approval_status: approvalStatus,
        });
      }

      // Validate employee codes against employees table
      const employeeCodes = Array.from(new Set(Array.from(recordsMap.values()).map(r => r.employee_code)));
      const { data: validEmployees } = await supabase
        .from('employees')
        .select('empl_no')
        .in('empl_no', employeeCodes);

      const validEmployeeCodes = new Set(validEmployees?.map(e => e.empl_no) || []);

      // Filter valid records
      const validRecords = Array.from(recordsMap.values()).filter(record => {
        if (!validEmployeeCodes.has(record.employee_code)) {
          importResult.errors.push(`Employee code ${record.employee_code} not found in employees table`);
          importResult.skipped++;
          return false;
        }
        return true;
      });

      // Batch upsert all valid records at once
      if (validRecords.length > 0) {
        const { error } = await supabase
          .from('leave_records')
          .upsert(validRecords, { onConflict: 'zoho_link_id' });

        if (error) {
          importResult.errors.push(`Batch upsert error: ${error.message}`);
        } else {
          importResult.inserted = validRecords.length;
        }
      }

      setResult(importResult);

      if (importResult.errors.length === 0) {
        toast.success(`Import complete: ${importResult.inserted} records processed, ${importResult.skipped} skipped`);
      } else {
        toast.error(`Import completed with errors. Check the results below.`);
      }

      if (onImportComplete) {
        onImportComplete();
      }
    } catch (error) {
      console.error('Error importing leave records:', error);
      toast.error('Failed to import leave data');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Leave Data</CardTitle>
        <CardDescription>
          Upload an Excel file with leave records. All records (Approved, Pending, Cancelled) will be stored.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            disabled={importing}
            className="max-w-md"
          />
          <Button disabled={importing} variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            {importing ? 'Importing...' : 'Select File'}
          </Button>
        </div>

        {result && (
          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold">Import Results</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Total rows processed:</div>
              <div className="font-medium">{result.total}</div>
              <div>Records processed:</div>
              <div className="font-medium text-green-600">{result.inserted}</div>
              <div>Records skipped:</div>
              <div className="font-medium text-yellow-600">{result.skipped}</div>
            </div>

            {result.errors.length > 0 && (
              <div className="mt-4 space-y-1">
                <h4 className="font-semibold text-sm text-destructive">Errors:</h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {result.errors.map((error, index) => (
                    <div key={index} className="text-xs text-muted-foreground">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
