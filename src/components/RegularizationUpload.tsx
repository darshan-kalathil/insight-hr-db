import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

type ImportResult = {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
};

type RegularizationUploadProps = {
  onImportComplete?: () => void;
};

export const RegularizationUpload = ({ onImportComplete }: RegularizationUploadProps) => {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const parseDate = (dateValue: any): string | null => {
    if (!dateValue) return null;

    // If it's already a Date object
    if (dateValue instanceof Date) {
      const year = dateValue.getFullYear();
      const month = (dateValue.getMonth() + 1).toString().padStart(2, '0');
      const day = dateValue.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // If it's a number (Excel serial date)
    if (typeof dateValue === 'number') {
      const excelEpoch = new Date(1900, 0, 1);
      const daysOffset = dateValue - 2;
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

    // Try DD-MMM-YYYY format
    const match = dateStr.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
    if (match) {
      const [, day, monthStr, year] = match;
      const monthMap: { [key: string]: string } = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
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
      
      // Convert to JSON, skipping first 2 rows (header starts at row 3)
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        range: 2, // Start from row 3 (0-indexed, so 2 means row 3)
        defval: null 
      });

      console.log('Parsed data:', jsonData);

      const importResult: ImportResult = {
        total: jsonData.length,
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: []
      };

      // Validate employee codes against employees table
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('empl_no');

      if (employeesError) {
        throw new Error(`Failed to fetch employees: ${employeesError.message}`);
      }

      const validEmployeeCodes = new Set(employees?.map(emp => emp.empl_no) || []);

      // Process records - use Map to deduplicate by employee_code + date
      const recordsMap = new Map<string, any>();

      for (const row of jsonData as any[]) {
        try {
          const employeeId = row['Employee Id']?.trim();
          const attendanceDay = row['Attendance Day'];
          const reason = row['Reason']?.trim();
          const description = row['Description']?.trim();
          const approvalStatus = row['Approval Status']?.trim();

          // Skip rejected records
          if (approvalStatus?.toLowerCase() === 'rejected') {
            importResult.skipped++;
            continue;
          }

          if (!employeeId || !attendanceDay || !approvalStatus) {
            importResult.errors.push(`Missing required fields for row`);
            continue;
          }

          // Validate employee code exists
          if (!validEmployeeCodes.has(employeeId)) {
            importResult.errors.push(`Invalid employee code: ${employeeId}`);
            continue;
          }

          const parsedDate = parseDate(attendanceDay);
          if (!parsedDate) {
            importResult.errors.push(`Invalid date for employee ${employeeId}: ${attendanceDay}`);
            continue;
          }

          // Use unique key to deduplicate (keep last occurrence)
          const key = `${employeeId}_${parsedDate}`;
          recordsMap.set(key, {
            employee_code: employeeId,
            attendance_day: parsedDate,
            reason: reason || null,
            description: (description && description !== '-') ? description : null,
            approval_status: approvalStatus
          });

        } catch (error) {
          importResult.errors.push(`Error processing row: ${error}`);
        }
      }

      // Convert map to array for upsert
      const recordsToUpsert = Array.from(recordsMap.values());

      // Batch upsert
      if (recordsToUpsert.length > 0) {
        const { error: upsertError } = await supabase
          .from('attendance_regularization')
          .upsert(recordsToUpsert, {
            onConflict: 'employee_code,attendance_day'
          });

        if (upsertError) {
          throw new Error(`Failed to import records: ${upsertError.message}`);
        }

        importResult.inserted = recordsToUpsert.length;
      }

      setResult(importResult);

      toast({
        title: 'Import Complete',
        description: `Processed ${importResult.inserted} regularization records successfully.`,
      });

      onImportComplete?.();

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Regularization Requests</CardTitle>
        <CardDescription>
          Upload Excel file with attendance regularization requests (first 2 rows will be skipped)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={importing}
              className="flex-1"
            />
            <Button disabled={importing}>
              {importing ? 'Importing...' : 'Import'}
            </Button>
          </div>

          {result && (
            <div className="space-y-2 text-sm">
              <p className="font-semibold">Import Results:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Total rows: {result.total}</li>
                <li>Processed: {result.inserted}</li>
                <li>Skipped: {result.skipped}</li>
                {result.errors.length > 0 && (
                  <li className="text-destructive">
                    Errors: {result.errors.length}
                    <ul className="list-disc list-inside ml-4 mt-1">
                      {result.errors.slice(0, 5).map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                      {result.errors.length > 5 && (
                        <li>...and {result.errors.length - 5} more</li>
                      )}
                    </ul>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
