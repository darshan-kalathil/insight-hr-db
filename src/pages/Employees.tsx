import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { EmployeeImport } from '@/components/EmployeeImport';

type Employee = {
  id: string;
  empl_no: string;
  name: string;
  status: string;
  official_email: string;
  pod: string;
  reporting_manager: string;
  level: string;
  doj: string;
  location: string;
};

const Employees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchEmployees();
    checkSuperAdmin();
  }, [user]);

  const checkSuperAdmin = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .single();

    setIsSuperAdmin(!!data);
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const employeeData = {
      empl_no: formData.get('empl_no') as string,
      name: formData.get('name') as string,
      status: formData.get('status') as string,
      official_email: formData.get('official_email') as string,
      personal_email: formData.get('personal_email') as string || null,
      mobile_number: formData.get('mobile_number') as string,
      pod: formData.get('pod') as string,
      pod_lead: formData.get('pod_lead') as string,
      reporting_manager: formData.get('reporting_manager') as string,
      level: formData.get('level') as string,
      doj: formData.get('doj') as string,
      location: formData.get('location') as string,
      gender: formData.get('gender') as string,
      birthday: formData.get('birthday') as string
    };

    try {
      if (editingEmployee) {
        const { error } = await supabase
          .from('employees')
          .update(employeeData)
          .eq('id', editingEmployee.id);

        if (error) throw error;
        
        toast({
          title: 'Success',
          description: 'Employee updated successfully'
        });
      } else {
        const { error } = await supabase
          .from('employees')
          .insert([employeeData]);

        if (error) throw error;
        
        toast({
          title: 'Success',
          description: 'Employee added successfully'
        });
      }

      setIsDialogOpen(false);
      setEditingEmployee(null);
      fetchEmployees();
      e.currentTarget.reset();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.empl_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.official_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Employee Management</h1>
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingEmployee(null)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddEmployee} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="empl_no">Employee No*</Label>
                      <Input id="empl_no" name="empl_no" defaultValue={editingEmployee?.empl_no} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Name*</Label>
                      <Input id="name" name="name" defaultValue={editingEmployee?.name} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status*</Label>
                      <Select name="status" defaultValue={editingEmployee?.status || 'Active'} required>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                          <SelectItem value="Serving Notice Period">Serving Notice Period</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="official_email">Official Email*</Label>
                      <Input id="official_email" name="official_email" type="email" defaultValue={editingEmployee?.official_email} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="personal_email">Personal Email</Label>
                      <Input id="personal_email" name="personal_email" type="email" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mobile_number">Mobile Number</Label>
                      <Input id="mobile_number" name="mobile_number" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pod">POD/Department*</Label>
                      <Input id="pod" name="pod" defaultValue={editingEmployee?.pod} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pod_lead">POD Lead</Label>
                      <Input id="pod_lead" name="pod_lead" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reporting_manager">Reporting Manager*</Label>
                      <Input id="reporting_manager" name="reporting_manager" defaultValue={editingEmployee?.reporting_manager} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="level">Level*</Label>
                      <Input id="level" name="level" placeholder="N+1, N+2, etc." defaultValue={editingEmployee?.level} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="doj">Date of Joining*</Label>
                      <Input id="doj" name="doj" type="date" defaultValue={editingEmployee?.doj} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location*</Label>
                      <Input id="location" name="location" defaultValue={editingEmployee?.location} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select name="gender">
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Male</SelectItem>
                          <SelectItem value="F">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="birthday">Birthday</Label>
                      <Input id="birthday" name="birthday" type="date" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full">
                    {editingEmployee ? 'Update Employee' : 'Add Employee'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Emp No</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>POD</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>DOJ</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center">
                    No employees found
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.empl_no}</TableCell>
                    <TableCell>{employee.name}</TableCell>
                    <TableCell>{employee.status}</TableCell>
                    <TableCell>{employee.official_email}</TableCell>
                    <TableCell>{employee.pod}</TableCell>
                    <TableCell>{employee.reporting_manager}</TableCell>
                    <TableCell>{employee.level}</TableCell>
                    <TableCell>{format(new Date(employee.doj), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{employee.location}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingEmployee(employee);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {isSuperAdmin && (
          <EmployeeImport onImportComplete={fetchEmployees} />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Employees;
