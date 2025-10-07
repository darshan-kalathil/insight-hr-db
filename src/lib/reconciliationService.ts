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

  // Step 3: Batch-load all leaves for Delhi employees in date range
  const { data: allLeaves, error: leaveError } = await supabase
    .from('leave_records')
    .select('employee_id, leave_type, approval_status, from_date, to_date')
    .in('employee_id', delhiEmployeeIds)
    .lte('from_date', endDateStr)
    .gte('to_date', startDateStr)
    .in('approval_status', ['Approved', 'Pending']);

  if (leaveError) throw leaveError;

  // Step 4: Batch-load all regularizations for Delhi employees in date range
  const { data: allRegularizations, error: regError } = await supabase
    .from('attendance_regularization')
    .select('employee_id, attendance_date, reason')
    .in('employee_id', delhiEmployeeIds)
    .gte('attendance_date', startDateStr)
    .lte('attendance_date', endDateStr);

  if (regError) throw regError;

  // Create Maps for O(1) lookups
  // Map: employeeId -> array of leave records
  const leaveMap = new Map<string, typeof allLeaves>();
  allLeaves?.forEach(leave => {
    const existing = leaveMap.get(leave.employee_id) || [];
    leaveMap.set(leave.employee_id, [...existing, leave]);
  });

  // Map: "employeeId|date" -> regularization record
  const regMap = new Map<string, typeof allRegularizations[0]>();
  allRegularizations?.forEach(reg => {
    const key = `${reg.employee_id}|${reg.attendance_date}`;
    regMap.set(key, reg);
  });

  let totalProcessed = 0;
  let unapprovedCount = 0;
  const reconciliationRecords = [];

  // Step 5: Process each absence record with in-memory lookups
  for (const record of biometricRecords || []) {
    totalProcessed++;

    // Check for leave coverage using in-memory map
    const employeeLeaves = leaveMap.get(record.employee_id) || [];
    const matchingLeave = employeeLeaves.find(leave => 
      leave.from_date <= record.attendance_date && 
      leave.to_date >= record.attendance_date
    );

    const hasLeave = !!matchingLeave;
    const leaveType = matchingLeave?.leave_type || null;

    // Check for regularization using in-memory map
    const regKey = `${record.employee_id}|${record.attendance_date}`;
    const regularization = regMap.get(regKey);

    const hasRegularization = !!regularization;
    const regularizationReason = regularization?.reason || null;

    const isUnapproved = !hasLeave && !hasRegularization;
    if (isUnapproved) {
      unapprovedCount++;
    }

    // Collect reconciliation record for batch upsert
    reconciliationRecords.push({
      employee_id: record.employee_id,
      attendance_date: record.attendance_date,
      is_unapproved_absence: isUnapproved,
      biometric_status: record.status,
      has_leave: hasLeave,
      has_regularization: hasRegularization,
      leave_type: leaveType,
      regularization_reason: regularizationReason,
      calculated_at: new Date().toISOString()
    });
  }

  // Step 6: Batch upsert all reconciliation records
  if (reconciliationRecords.length > 0) {
    const { error: upsertError } = await supabase
      .from('attendance_reconciliation')
      .upsert(reconciliationRecords, {
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
