import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatIndianCurrency } from '@/lib/utils';
import { z } from 'zod';

interface SalaryRange {
  id: string;
  level: string;
  min_salary: number;
  max_salary: number;
  variable_pay_percentage: number;
}

interface SalaryRangesTableProps {
  salaryRanges: SalaryRange[];
  onUpdate: () => void;
}

const salarySchema = z.object({
  min_salary: z.number().min(0, "Minimum salary must be positive").max(100000000, "Value too large"),
  max_salary: z.number().min(0, "Maximum salary must be positive").max(100000000, "Value too large"),
}).refine(data => data.max_salary > data.min_salary, {
  message: "Maximum salary must be greater than minimum salary",
  path: ["max_salary"],
});

export const SalaryRangesTable = ({ salaryRanges, onUpdate }: SalaryRangesTableProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ min_salary: string; max_salary: string }>({
    min_salary: '',
    max_salary: '',
  });
  const [saving, setSaving] = useState(false);

  const startEditing = (range: SalaryRange) => {
    setEditingId(range.id);
    setEditValues({
      min_salary: range.min_salary.toString(),
      max_salary: range.max_salary.toString(),
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValues({ min_salary: '', max_salary: '' });
  };

  const saveChanges = async (rangeId: string) => {
    try {
      setSaving(true);

      // Parse values
      const minSalary = parseFloat(editValues.min_salary);
      const maxSalary = parseFloat(editValues.max_salary);

      if (isNaN(minSalary) || isNaN(maxSalary)) {
        toast.error('Please enter valid numbers');
        return;
      }

      // Validate with zod
      const validation = salarySchema.safeParse({
        min_salary: minSalary,
        max_salary: maxSalary,
      });

      if (!validation.success) {
        const error = validation.error.errors[0];
        toast.error(error.message);
        return;
      }

      // Update in database
      const { error } = await supabase
        .from('salary_ranges')
        .update({
          min_salary: minSalary,
          max_salary: maxSalary,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rangeId);

      if (error) throw error;

      toast.success('Salary range updated successfully');
      setEditingId(null);
      onUpdate();
    } catch (error: any) {
      toast.error('Error updating salary range: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Salary Ranges by Level</CardTitle>
        <CardDescription>
          Board-mandated minimum and maximum salary ranges for each level
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Level</TableHead>
              <TableHead className="text-right">Min Salary</TableHead>
              <TableHead className="text-right">Max Salary</TableHead>
              <TableHead className="text-right">Variable Pay %</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {salaryRanges.map((range) => (
              <TableRow key={range.id}>
                <TableCell className="font-medium">{range.level.replace('N-', 'N+')}</TableCell>
                <TableCell className="text-right">
                  {editingId === range.id ? (
                    <Input
                      type="number"
                      value={editValues.min_salary}
                      onChange={(e) => setEditValues({ ...editValues, min_salary: e.target.value })}
                      className="text-right w-32 ml-auto"
                    />
                  ) : (
                    formatIndianCurrency(range.min_salary)
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {editingId === range.id ? (
                    <Input
                      type="number"
                      value={editValues.max_salary}
                      onChange={(e) => setEditValues({ ...editValues, max_salary: e.target.value })}
                      className="text-right w-32 ml-auto"
                    />
                  ) : (
                    formatIndianCurrency(range.max_salary)
                  )}
                </TableCell>
                <TableCell className="text-right">{range.variable_pay_percentage}%</TableCell>
                <TableCell className="text-right">
                  {editingId === range.id ? (
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        onClick={() => saveChanges(range.id)}
                        disabled={saving}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEditing}
                        disabled={saving}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEditing(range)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
