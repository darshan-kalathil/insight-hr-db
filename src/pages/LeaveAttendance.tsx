import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useAbsenceTypes } from '@/hooks/useAbsenceTypes';
import { useOrgAbsenceData } from '@/hooks/useOrgAbsenceData';
import { useActiveEmployees } from '@/hooks/useActiveEmployees';
import { useEmployeeAbsenceData } from '@/hooks/useEmployeeAbsenceData';
import { AbsenceTypeSelect } from '@/components/AbsenceTypeSelect';
import { DateRangePicker } from '@/components/DateRangePicker';
import { OrgAbsenceLineChart } from '@/components/OrgAbsenceLineChart';
import { EmployeeSelect } from '@/components/EmployeeSelect';
import { EmployeeAbsenceLineChart } from '@/components/EmployeeAbsenceLineChart';
import { EmployeeAbsenceSummary } from '@/components/EmployeeAbsenceSummary';
import { getCurrentFinancialYear } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { toast } from 'sonner';

const LeaveAttendance = () => {
  const financialYear = getCurrentFinancialYear();
  
  // Org tab state
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: financialYear.startDate,
    to: financialYear.endDate,
  });

  // Employee tab state
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [employeeSelectedTypes, setEmployeeSelectedTypes] = useState<string[]>([]);
  const [employeeDateRange, setEmployeeDateRange] = useState<DateRange | undefined>({
    from: financialYear.startDate,
    to: financialYear.endDate,
  });

  // Fetch absence types
  const { data: absenceTypes, isLoading: isLoadingTypes, error: typesError } = useAbsenceTypes();

  // Fetch active employees
  const { data: employees, isLoading: isLoadingEmployees, error: employeesError } = useActiveEmployees();

  // Set default selection to all leave types for Org tab
  useEffect(() => {
    if (absenceTypes?.leaveTypes && absenceTypes.leaveTypes.length > 0 && selectedTypes.length === 0) {
      setSelectedTypes(absenceTypes.leaveTypes);
    }
  }, [absenceTypes]);

  // Set default selection to all leave types + all regularization types for Employee tab
  useEffect(() => {
    if (absenceTypes && employeeSelectedTypes.length === 0) {
      const allTypes = [...(absenceTypes.leaveTypes || []), ...(absenceTypes.regularizationTypes || [])];
      if (allTypes.length > 0) {
        setEmployeeSelectedTypes(allTypes);
      }
    }
  }, [absenceTypes]);

  // Set default employee selection
  useEffect(() => {
    if (employees && employees.length > 0 && !selectedEmployee) {
      setSelectedEmployee(employees[0].empl_no);
    }
  }, [employees]);

  // Fetch org absence data
  const { data: orgData, isLoading: isLoadingData, error: dataError } = useOrgAbsenceData({
    selectedTypes,
    startDate: dateRange?.from || financialYear.startDate,
    endDate: dateRange?.to || financialYear.endDate,
  });

  // Fetch employee absence data
  const { data: employeeData, isLoading: isLoadingEmployeeData, error: employeeDataError } = useEmployeeAbsenceData(
    selectedEmployee,
    employeeSelectedTypes,
    employeeDateRange?.from || financialYear.startDate,
    employeeDateRange?.to || financialYear.endDate
  );

  // Handle errors
  useEffect(() => {
    if (typesError) {
      toast.error('Failed to load absence types');
      console.error(typesError);
    }
    if (dataError) {
      toast.error('Failed to load org absence data');
      console.error(dataError);
    }
    if (employeesError) {
      toast.error('Failed to load employees');
      console.error(employeesError);
    }
    if (employeeDataError) {
      toast.error('Failed to load employee absence data');
      console.error(employeeDataError);
    }
  }, [typesError, dataError, employeesError, employeeDataError]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Leave & Regularization</h1>
          <p className="text-muted-foreground mt-2">
            View employee leave and regularization trends.
          </p>
        </div>

        <Tabs defaultValue="org" className="w-full">
          <TabsList>
            <TabsTrigger value="org">Org</TabsTrigger>
            <TabsTrigger value="employee">Employee</TabsTrigger>
          </TabsList>

          <TabsContent value="org" className="space-y-4">
            {/* Filters Section */}
            <Card>
              <CardHeader>
                <CardTitle>Filters</CardTitle>
                <CardDescription>
                  Select absence types and date range to view organizational absence patterns
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                {isLoadingTypes ? (
                  <>
                    <Skeleton className="h-10 w-[280px]" />
                    <Skeleton className="h-10 w-[280px]" />
                  </>
                ) : absenceTypes ? (
                  <>
                    <AbsenceTypeSelect
                      leaveTypes={absenceTypes.leaveTypes}
                      regularizationTypes={absenceTypes.regularizationTypes}
                      selectedTypes={selectedTypes}
                      onSelectedTypesChange={setSelectedTypes}
                    />
                    <DateRangePicker
                      dateRange={dateRange}
                      onDateRangeChange={setDateRange}
                    />
                  </>
                ) : null}
              </CardContent>
            </Card>

            {/* Trends Section */}
            <Card>
              <CardHeader>
                <CardTitle>Organizational Absence Trends</CardTitle>
                <CardDescription>
                  Monthly trends showing the total number of instances for each selected absence type across the organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingData ? (
                  <div className="flex items-center justify-center py-12">
                    <Skeleton className="h-[300px] w-full" />
                  </div>
                ) : selectedTypes.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    Please select at least one absence type to view trends
                  </div>
                ) : orgData && orgData.length > 0 ? (
                  <OrgAbsenceLineChart
                    data={orgData}
                    selectedTypes={selectedTypes}
                    leaveTypes={absenceTypes?.leaveTypes || []}
                    regularizationTypes={absenceTypes?.regularizationTypes || []}
                    startDate={dateRange?.from || financialYear.startDate}
                    endDate={dateRange?.to || financialYear.endDate}
                  />
                ) : (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    No data available for selected filters
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employee" className="space-y-4">
            {/* Filters Section */}
            <Card>
              <CardHeader>
                <CardTitle>Filters</CardTitle>
                <CardDescription>
                  Select an employee, absence types, and date range to view individual absence patterns
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                {isLoadingEmployees || isLoadingTypes ? (
                  <>
                    <Skeleton className="h-10 w-[300px]" />
                    <Skeleton className="h-10 w-[280px]" />
                    <Skeleton className="h-10 w-[280px]" />
                  </>
                ) : employees && absenceTypes ? (
                  <>
                    <EmployeeSelect
                      employees={employees}
                      value={selectedEmployee}
                      onChange={setSelectedEmployee}
                    />
                    <AbsenceTypeSelect
                      leaveTypes={absenceTypes.leaveTypes}
                      regularizationTypes={absenceTypes.regularizationTypes}
                      selectedTypes={employeeSelectedTypes}
                      onSelectedTypesChange={setEmployeeSelectedTypes}
                    />
                    <DateRangePicker
                      dateRange={employeeDateRange}
                      onDateRangeChange={setEmployeeDateRange}
                    />
                  </>
                ) : null}
              </CardContent>
            </Card>

            {/* Absence Summary */}
            {selectedEmployee && employeeData && (
              <EmployeeAbsenceSummary
                data={employeeData}
                leaveTypes={absenceTypes?.leaveTypes || []}
                regularizationTypes={absenceTypes?.regularizationTypes || []}
              />
            )}

            {/* Trends Section */}
            <Card>
              <CardHeader>
                <CardTitle>Employee Absence Trends</CardTitle>
                <CardDescription>
                  Monthly trends showing the number of instances for each selected absence type
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingEmployeeData ? (
                  <div className="flex items-center justify-center py-12">
                    <Skeleton className="h-[300px] w-full" />
                  </div>
                ) : !selectedEmployee ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    Please select an employee to view trends
                  </div>
                ) : employeeSelectedTypes.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    Please select at least one absence type to view trends
                  </div>
                ) : employeeData ? (
                  <EmployeeAbsenceLineChart
                    data={employeeData}
                    selectedTypes={employeeSelectedTypes}
                    leaveTypes={absenceTypes?.leaveTypes || []}
                    regularizationTypes={absenceTypes?.regularizationTypes || []}
                    startDate={employeeDateRange?.from || financialYear.startDate}
                    endDate={employeeDateRange?.to || financialYear.endDate}
                  />
                ) : (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    No data available for selected filters
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default LeaveAttendance;
