import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface ReconciliationResult {
  totalProcessed: number;
  unapprovedCount: number;
  updatedAt: Date;
  delhiEmployeesOnly: number;
}

/**
 * Calculate reconciliation for biometric attendance records
 * Only processes Delhi-based employees
 */
export async function calculateReconciliation(
  startDate: Date,
  endDate: Date
): Promise<ReconciliationResult> {
  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');

  // Step 1: Get all Delhi-based employees
  const { data: delhiEmployees, error: empError } = await supabase
    .from('employees')
    .select('id, empl_no, name, location')
    .eq('location', 'Delhi');

  if (empError) throw empError;
  if (!delhiEmployees || delhiEmployees.length === 0) {
    return {
      totalProcessed: 0,
      unapprovedCount: 0,
      updatedAt: new Date(),
      delhiEmployeesOnly: 0
    };
  }

  const delhiEmployeeIds = delhiEmployees.map(e => e.id);

  // Step 2: Get biometric attendance records for Delhi employees with "Absent" status
  const { data: biometricRecords, error: bioError } = await supabase
    .from('biometric_attendance')
    .select('*')
    .in('employee_id', delhiEmployeeIds)
    .eq('status', 'Absent')
    .gte('attendance_date', startDateStr)
    .lte('attendance_date', endDateStr);

  if (bioError) throw bioError;

  let totalProcessed = 0;
  let unapprovedCount = 0;

  // Step 3: For each absent record, check leave/regularization coverage
  for (const record of biometricRecords || []) {
    totalProcessed++;

    // Check for approved or pending leave
    const { data: leaves, error: leaveError } = await supabase
      .from('leave_records')
      .select('leave_type, approval_status')
      .eq('employee_id', record.employee_id)
      .lte('from_date', record.attendance_date)
      .gte('to_date', record.attendance_date)
      .in('approval_status', ['Approved', 'Pending']);

    if (leaveError) throw leaveError;

    const hasLeave = leaves && leaves.length > 0;
    const leaveType = hasLeave ? leaves[0].leave_type : null;

    // Check for regularization
    const { data: regularizations, error: regError } = await supabase
      .from('attendance_regularization')
      .select('reason')
      .eq('employee_id', record.employee_id)
      .eq('attendance_date', record.attendance_date);

    if (regError) throw regError;

    const hasRegularization = regularizations && regularizations.length > 0;
    const regularizationReason = hasRegularization ? regularizations[0].reason : null;

    const isUnapproved = !hasLeave && !hasRegularization;
    if (isUnapproved) {
      unapprovedCount++;
    }

    // Upsert reconciliation result
    const { error: upsertError } = await supabase
      .from('attendance_reconciliation')
      .upsert({
        employee_id: record.employee_id,
        attendance_date: record.attendance_date,
        is_unapproved_absence: isUnapproved,
        biometric_status: record.status,
        has_leave: hasLeave,
        has_regularization: hasRegularization,
        leave_type: leaveType,
        regularization_reason: regularizationReason,
        calculated_at: new Date().toISOString()
      }, {
        onConflict: 'employee_id,attendance_date'
      });

    if (upsertError) throw upsertError;
  }

  return {
    totalProcessed,
    unapprovedCount,
    updatedAt: new Date(),
    delhiEmployeesOnly: delhiEmployees.length
  };
}

/**
 * Recalculate reconciliation for specific employee and date range
 * Used when leaves or regularizations are updated
 */
export async function recalculateForEmployee(
  employeeId: string,
  startDate: Date,
  endDate: Date
): Promise<void> {
  // Check if employee is from Delhi
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('location')
    .eq('id', employeeId)
    .single();

  if (empError || !employee || employee.location !== 'Delhi') {
    // Skip non-Delhi employees
    return;
  }

  await calculateReconciliation(startDate, endDate);
}
