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

type AttendanceUploadProps = {
  onImportComplete?: () => void;
};

export const AttendanceUpload = ({ onImportComplete }: AttendanceUploadProps) => {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const formatEmployeeCode = (code: string): string | null => {
    // Only process codes starting with ONDCE
    if (!code.startsWith('ONDCE')) {
      return null;
    }

    // Extract the number part
    const numberPart = code.substring(5); // Remove 'ONDCE'
    const num = parseInt(numberPart, 10);

    if (isNaN(num)) {
      return null;
    }

    // Format with leading zeros to 3 digits
    const paddedNum = num.toString().padStart(3, '0');
    return `ONDC-E-${paddedNum}`;
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

    // If it's a number (Excel serial date)
    if (typeof dateValue === 'number') {
      // Excel stores dates as days since 1900-01-01 (with a leap year bug)
      // JavaScript Date starts from 1970-01-01
      const excelEpoch = new Date(1900, 0, 1);
      const daysOffset = dateValue - 2; // -2 to account for Excel's 1900 leap year bug and 0-indexing
      const date = new Date(excelEpoch.getTime() + daysOffset * 24 * 60 * 60 * 1000);
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${year}-${month}-${day}`;
    }

    // If it's a string
    const dateStr = String(dateValue);

    // Try numeric string (Excel serial as string)
    const numericValue = parseFloat(dateStr);
    if (!isNaN(numericValue) && numericValue > 1000) {
      const excelEpoch = new Date(1900, 0, 1);
      const daysOffset = numericValue - 2;
      const date = new Date(excelEpoch.getTime() + daysOffset * 24 * 60 * 60 * 1000);
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${year}-${month}-${day}`;
    }

    // Try DD/MM/YYYY format
    const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      const [, day, month, year] = slashMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Try DD-MM-YYYY format
    const dashMatch = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dashMatch) {
      const [, day, month, year] = dashMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return null;
  };

  const parseTime = (timeValue: any): string | null => {
    if (timeValue === null || timeValue === undefined || timeValue === '') return null;

    // If it's already a Date object (Excel sometimes gives Date for time cells)
    if (timeValue instanceof Date) {
      const hours = timeValue.getHours().toString().padStart(2, '0');
      const minutes = timeValue.getMinutes().toString().padStart(2, '0');
      const seconds = timeValue.getSeconds().toString().padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }

    // If it's a number (Excel stores time as fraction of a day)
    if (typeof timeValue === 'number') {
      const totalSeconds = Math.round(timeValue * 24 * 60 * 60);
      const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
      const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
      const seconds = (totalSeconds % 60).toString().padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }

    const timeStr = String(timeValue).trim();
    
    // Try HH:MM:SS format first
    const timeWithSecondsMatch = timeStr.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
    if (timeWithSecondsMatch) {
      const [, hours, minutes, seconds] = timeWithSecondsMatch;
      return `${hours.padStart(2, '0')}:${minutes}:${seconds}`;
    }

    // Try HH:MM format (without seconds)
    const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (timeMatch) {
      const [, hours, minutes] = timeMatch;
      return `${hours.padStart(2, '0')}:${minutes}:00`;
    }

    return null;
  };

  const calculateDuration = (inTime: string | null, outTime: string | null): string | null => {
    if (!inTime || !outTime) return null;

    const [inHours, inMinutes] = inTime.split(':').map(Number);
    const [outHours, outMinutes] = outTime.split(':').map(Number);

    let totalMinutes = (outHours * 60 + outMinutes) - (inHours * 60 + inMinutes);

    // Handle cases where out time is on the next day
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
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

      // Track unique records (last one wins for duplicates in same upload)
      const recordsMap = new Map<string, any>();

      for (const row of jsonData as any[]) {
        const rawEmployeeCode = row['Employee Code'];
        const rawDate = row['Date'];

        // Skip if employee code or date is missing
        if (!rawEmployeeCode || !rawDate) {
          importResult.skipped++;
          continue;
        }

        const formattedCode = formatEmployeeCode(String(rawEmployeeCode));

        // Skip non-ONDCE codes
        if (!formattedCode) {
          importResult.skipped++;
          continue;
        }

        const parsedDate = parseDate(rawDate);
        if (!parsedDate) {
          importResult.errors.push(`Invalid date format for ${rawEmployeeCode}: ${rawDate}`);
          importResult.skipped++;
          continue;
        }

        const inTime = parseTime(row['In Time']);
        const outTime = parseTime(row['Out Time']);
        const duration = calculateDuration(inTime, outTime);
        const status = row['Attendance'] || '';

        const key = `${parsedDate}_${formattedCode}`;
        recordsMap.set(key, {
          date: parsedDate,
          employee_code: formattedCode,
          in_time: inTime,
          out_time: outTime,
          duration: duration,
          status: status,
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
          .from('attendance_records')
          .upsert(validRecords, { onConflict: 'date,employee_code' });

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
      console.error('Error importing attendance:', error);
      toast.error('Failed to import attendance data');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Attendance Data</CardTitle>
        <CardDescription>
          Upload an Excel file with attendance records. Only ONDCE employee codes will be processed.
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
