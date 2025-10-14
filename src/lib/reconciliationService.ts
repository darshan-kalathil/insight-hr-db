import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface ReconciliationResult {
  totalProcessed: number;
  unapprovedCount: number;
  updatedAt: Date;
  delhiEmployeesOnly: number;
}

/**
 * Calculate reconciliation for biometric attendance records using consolidated table
 * Only processes Delhi-based employees
 */
export async function calculateReconciliation(
  startDate: Date,
  endDate: Date
): Promise<ReconciliationResult> {
  console.log('🔄 Starting reconciliation...', { startDate, endDate });
  const startTime = Date.now();
  
  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');

  // Step 1: Get all Delhi-based employees
  console.log('📋 Step 1: Fetching Delhi employees...');
  const { data: delhiEmployees, error: empError } = await supabase
    .from('employees')
    .select('id, empl_no, name, location')
    .eq('location', 'Delhi');

  if (empError) throw empError;
  console.log(`✅ Found ${delhiEmployees?.length || 0} Delhi employees`);
  
  if (!delhiEmployees || delhiEmployees.length === 0) {
    return {
      totalProcessed: 0,
      unapprovedCount: 0,
      updatedAt: new Date(),
      delhiEmployeesOnly: 0
    };
  }

  const delhiEmployeeIds = delhiEmployees.map(e => e.id);

  // Step 2: Get biometric attendance records with "Absent" status for Delhi employees
  console.log('📋 Step 2: Fetching absent biometric attendance records...');
  const { data: absenceRecords, error: bioError } = await supabase
    .from('biometric_attendance')
    .select('employee_id, attendance_date, status')
    .in('employee_id', delhiEmployeeIds)
    .eq('status', 'Absent')
    .gte('attendance_date', startDateStr)
    .lte('attendance_date', endDateStr);

  if (bioError) throw bioError;
  console.log(`✅ Found ${absenceRecords?.length || 0} absence records`);

  // Step 3: Batch-load approved absences from consolidated table (excluding rejected)
  console.log('📋 Step 3: Batch-loading approved absences from consolidated table...');
  const { data: approvedAbsences, error: approvedError } = await supabase
    .from('approved_absences_consolidated')
    .select('employee_id, coverage_date, coverage_type, leave_type, regularization_reason, approval_status')
    .in('employee_id', delhiEmployeeIds)
    .gte('coverage_date', startDateStr)
    .lte('coverage_date', endDateStr)
    .neq('approval_status', 'Rejected');

  if (approvedError) throw approvedError;
  console.log(`✅ Loaded ${approvedAbsences?.length || 0} approved/pending absence records (rejected excluded)`);

  // Create Map for O(1) lookups: "employeeId|date" -> array of coverages
  console.log('🗺️ Step 4: Building lookup map...');
  const coverageMap = new Map<string, typeof approvedAbsences>();
  approvedAbsences?.forEach(coverage => {
    const key = `${coverage.employee_id}|${coverage.coverage_date}`;
    const existing = coverageMap.get(key) || [];
    coverageMap.set(key, [...existing, coverage]);
  });

  let totalProcessed = 0;
  let unapprovedCount = 0;

  // Step 5: Process each absence record and update statuses
  console.log('⚡ Step 5: Processing absence records with consolidated table lookups...');
  for (const record of absenceRecords || []) {
    totalProcessed++;

    // Check for coverage using consolidated table
    const coverageKey = `${record.employee_id}|${record.attendance_date}`;
    const coverages = coverageMap.get(coverageKey) || [];

    const leaveCoverage = coverages.find(c => c.coverage_type === 'Leave');
    const regCoverage = coverages.find(c => c.coverage_type === 'Regularization');

    // Determine new status based on coverage
    let newStatus = 'Absent'; // Default if no coverage found
    
    if (leaveCoverage) {
      newStatus = leaveCoverage.leave_type; // e.g., "Work From Home", "Sick Leave"
    } else if (regCoverage) {
      newStatus = regCoverage.regularization_reason; // e.g., "Forgot to Punch"
    } else {
      unapprovedCount++; // No coverage = unapproved absence
    }

    // Update the status if it changed
    if (record.status !== newStatus) {
      const { error: updateError } = await supabase
        .from('biometric_attendance')
        .update({ status: newStatus })
        .eq('employee_id', record.employee_id)
        .eq('attendance_date', record.attendance_date);

      if (updateError) {
        console.error('Failed to update status:', updateError);
      }
    }
  }

  console.log(`✅ Processed ${totalProcessed} records, found ${unapprovedCount} unapproved absences`);

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`🎉 Reconciliation completed in ${totalTime}s`);

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
