

## Simplify Leave & Attendance Panel

Remove attendance-related components (heatmaps, unapproved absences, reconciliation) and keep only leave/regularization trend visualizations.

### Changes

**1. `src/pages/LeaveAttendance.tsx`**
- Remove the entire "Absence Heatmap" card from the Org tab (lines 161-190)
- Remove the "Employee Absence Heatmap" card from the Employee tab (lines 265-313), but keep the `EmployeeAbsenceSummary` component -- move it to render directly after filters
- Remove the `useEmployeeAttendanceData` hook import and usage (lines 10, 87-91)
- Remove imports: `LeaveHeatmap`, `EmployeeLeaveHeatmap`
- Remove `attendanceData` prop passed to `EmployeeAbsenceSummary`
- Update page title/description to "Leave & Regularization" to reflect the new scope

**2. `src/components/EmployeeAbsenceSummary.tsx`**
- Remove the "Unapproved Absences" section at the bottom (the red count block)
- Remove `attendanceData`, `employeeCode`, `startDate`, `endDate` props (no longer needed)
- Remove the `useEmployeeLeaveCoverage` hook import and usage
- Remove the `isAbsentStatus` helper and unapproved absences calculation
- Keep only the Leaves and Regularizations summary tables

### Technical Details

- Components that become unused and can be cleaned up later: `LeaveHeatmap`, `EmployeeLeaveHeatmap`, `useEmployeeAttendanceData`, `useEmployeeLeaveCoverage`, `useReconciliation`, `reconciliationService`, `AttendanceRecords`, `AttendanceUpload`, `RegularizationUpload` (if not used elsewhere)
- No database or backend changes required

