import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
type ImportResult = {
  total: number;
  inserted: number;
  updated: number;
  errors: number;
  errorDetails: string[];
};
type EmployeeImportProps = {
  onImportComplete?: () => void;
};
export const EmployeeImport = ({
  onImportComplete
}: EmployeeImportProps) => {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const {
    toast
  } = useToast();
  const parseDate = (dateValue: any): string | null => {
    if (!dateValue) return null;

    // Handle Excel date serial numbers
    if (typeof dateValue === 'number') {
      const date = XLSX.SSF.parse_date_code(dateValue);
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }

    // Handle string dates
    if (typeof dateValue === 'string') {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
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
      const results: ImportResult = {
        total: jsonData.length,
        inserted: 0,
        updated: 0,
        errors: 0,
        errorDetails: []
      };
      for (const row of jsonData as any[]) {
        try {
          const employeeData = {
            empl_no: row['Empl No']?.toString(),
            name: row['Name'],
            official_email: row['Official Email ID'],
            mobile_number: row['Mobile Number']?.toString() || null,
            personal_email: row['Personal Email ID'] || null,
            status: row['Status'] || 'Active',
            pod: row['POD'],
            pod_lead: row['POD Lead'] || null,
            reporting_manager: row['Reporting Manager'] || null,
            secondary_reporting: row['Secondary Reporting'] || null,
            final_travel_approval: row['Final Travel Approval'] || null,
            level: row['Level'],
            location: row['Location'],
            gender: row['Gender'] || null,
            type: row['Type'] || 'EMP',
            doj: parseDate(row['DOJ']),
            date_of_exit: parseDate(row['Date of Exit']),
            birthday: parseDate(row['Birthday'])
          };

          // Check if employee exists
          const {
            data: existing
          } = await supabase.from('employees').select('id').eq('empl_no', employeeData.empl_no).single();
          if (existing) {
            // Update existing employee
            const {
              error
            } = await supabase.from('employees').update(employeeData).eq('empl_no', employeeData.empl_no);
            if (error) throw error;
            results.updated++;
          } else {
            // Insert new employee
            const {
              error
            } = await supabase.from('employees').insert([employeeData]);
            if (error) throw error;
            results.inserted++;
          }
        } catch (error: any) {
          results.errors++;
          results.errorDetails.push(`Row with Empl No ${row['Empl No']}: ${error.message}`);
        }
      }
      setResult(results);
      toast({
        title: 'Import Complete',
        description: `Inserted: ${results.inserted}, Updated: ${results.updated}, Errors: ${results.errors}`
      });

      // Trigger refresh of employee list
      if (onImportComplete) {
        onImportComplete();
      }
    } catch (error: any) {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };
  return <Card>
      <CardHeader>
        <CardTitle>Import Employees from Excel</CardTitle>
        <CardDescription>Upload an Excel file to add or update employee records. 
Existing employees will be updated.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} disabled={importing} className="hidden" id="excel-upload" />
          <label htmlFor="excel-upload">
            <Button asChild disabled={importing}>
              <span className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                {importing ? 'Importing...' : 'Choose Excel File'}
              </span>
            </Button>
          </label>
        </div>

        {result && <div className="space-y-3 mt-4">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="font-medium">{result.inserted} employees added</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <span className="font-medium">{result.updated} employees updated</span>
            </div>
            {result.errors > 0 && <>
                <div className="flex items-center gap-2 text-sm">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="font-medium">{result.errors} errors</span>
                </div>
                {result.errorDetails.length > 0 && <div className="mt-2 p-3 bg-destructive/10 rounded-md">
                    <p className="text-sm font-medium mb-2">Error Details:</p>
                    <ul className="text-xs space-y-1">
                      {result.errorDetails.slice(0, 5).map((error, index) => <li key={index} className="text-muted-foreground">{error}</li>)}
                      {result.errorDetails.length > 5 && <li className="text-muted-foreground">
                          ... and {result.errorDetails.length - 5} more errors
                        </li>}
                    </ul>
                  </div>}
              </>}
          </div>}

        <div className="text-sm text-muted-foreground mt-4">
          
          <ul className="list-disc list-inside space-y-1 text-xs">
            
            
            
            
            
            
            
            
          </ul>
        </div>
      </CardContent>
    </Card>;
};