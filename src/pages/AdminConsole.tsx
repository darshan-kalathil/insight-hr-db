import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Shield, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { logActivity } from '@/lib/activityLogger';
import { ActivityLogs } from '@/components/ActivityLogs';

type UserWithRole = {
  id: string;
  email: string;
  full_name: string;
  roles: string[];
};

const AdminConsole = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    checkSuperAdmin();
    fetchUsers();
  }, [user]);

  const checkSuperAdmin = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .single();

    setIsSuperAdmin(!!data);
  };

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError && rolesError.code !== 'PGRST116') throw rolesError;

      const usersWithRoles = profiles.map((profile: any) => ({
        ...profile,
        roles: roles?.filter((r: any) => r.user_id === profile.id).map((r: any) => r.role) || []
      }));

      setUsers(usersWithRoles);
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

  const handleInviteUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const fullName = formData.get('fullName') as string;
    const password = formData.get('password') as string;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { email, fullName, password },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      // Log the invite activity
      await logActivity({
        actionType: 'create',
        entityType: 'user',
        entityId: data.userId,
        description: `Invited user: ${email}`
      });

      toast({
        title: 'Success',
        description: 'User invited successfully. They can now log in with the provided credentials.'
      });

      setIsDialogOpen(false);
      e.currentTarget.reset();
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleMakeSuperAdmin = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert([{ user_id: userId, role: 'super_admin' }]);

      if (error) throw error;

      // Get user email for logging
      const user = users.find(u => u.id === userId);
      await logActivity({
        actionType: 'update',
        entityType: 'user',
        entityId: userId,
        description: `Assigned super_admin role to user: ${user?.email}`
      });

      toast({
        title: 'Success',
        description: 'Super admin privileges granted'
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleRevokeRole = async (userId: string, role: 'super_admin' | 'user') => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      // Get user email for logging
      const user = users.find(u => u.id === userId);
      await logActivity({
        actionType: 'update',
        entityType: 'user',
        entityId: userId,
        description: `Revoked ${role} role from user: ${user?.email}`
      });

      toast({
        title: 'Success',
        description: 'Role revoked successfully'
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleDeleteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToDelete || !deletePassword || !user) return;

    setIsDeleting(true);
    try {
      // Verify password by attempting to sign in
      const { error: passwordError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: deletePassword
      });

      if (passwordError) {
        throw new Error('Incorrect password');
      }

      // Password verified, proceed with deletion
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId: userToDelete },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      // Get user email for logging
      const deletedUser = users.find(u => u.id === userToDelete);
      await logActivity({
        actionType: 'delete',
        entityType: 'user',
        entityId: userToDelete,
        description: `Deleted user: ${deletedUser?.email}`
      });

      toast({
        title: 'Success',
        description: 'User permanently deleted. The email can now be reused.'
      });

      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      setDeletePassword('');
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isSuperAdmin && !loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You need super admin privileges to access this page.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Admin Console</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite New User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleInviteUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="user@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Temporary Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="text"
                    placeholder="Create a temporary password"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Share this password with the user securely
                  </p>
                </div>
                <Button type="submit" className="w-full">
                  Send Invite
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.full_name}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {user.roles.length === 0 ? (
                          <Badge variant="outline">No Access</Badge>
                        ) : (
                          user.roles.map((role) => (
                            <Badge
                              key={role}
                              variant={role === 'super_admin' ? 'default' : 'secondary'}
                            >
                              {role === 'super_admin' ? 'Super Admin' : 'User'}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {!user.roles.includes('super_admin') && user.roles.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMakeSuperAdmin(user.id)}
                          >
                            <Shield className="h-4 w-4 mr-1" />
                            Make Super Admin
                          </Button>
                        )}
                        {user.roles.length > 0 && user.roles.map((role) => (
                          <Button
                            key={role}
                            variant="outline"
                            size="sm"
                            onClick={() => handleRevokeRole(user.id, role as 'super_admin' | 'user')}
                          >
                            Revoke {role === 'super_admin' ? 'Admin' : 'User'}
                          </Button>
                        ))}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setUserToDelete(user.id);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm User Deletion</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleDeleteUser} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This will permanently delete the user. The email address will be freed and can be reused.
              </p>
              <div className="space-y-2">
                <Label htmlFor="deletePassword">Enter your password to confirm</Label>
                <Input
                  id="deletePassword"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Your password"
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setIsDeleteDialogOpen(false);
                    setUserToDelete(null);
                    setDeletePassword('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  className="flex-1"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete User'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Activity Logs Section */}
        <div className="mt-8 pt-8 border-t">
          <ActivityLogs />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminConsole;
