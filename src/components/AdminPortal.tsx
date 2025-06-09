import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { adminService, UserProfile, ClassAssignment } from '@/services/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, UserPlus, Settings, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CLASS_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const SECTION_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

export const AdminPortal = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [assignClassOpen, setAssignClassOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userAssignments, setUserAssignments] = useState<ClassAssignment[]>([]);

  // Create user form state
  const [newUser, setNewUser] = useState({
    userId: '',
    email: '',
    first_name: '',
    last_name: '',
    role: 'teacher' as 'admin' | 'teacher' | 'staff'
  });

  // Class assignment state
  const [newAssignment, setNewAssignment] = useState({
    class: '',
    section: ''
  });

  useEffect(() => {
    if (isAdmin()) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      const profiles = await adminService.getAllProfiles();
      setUsers(profiles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await adminService.createUserProfile(newUser.userId, {
        email: newUser.email,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        role: newUser.role
      });
      
      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User profile created successfully'
      });

      setNewUser({
        userId: '',
        email: '',
        first_name: '',
        last_name: '',
        role: 'teacher'
      });
      setCreateUserOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user profile',
        variant: 'destructive'
      });
    }
  };

  const fetchUserAssignments = async (userId: string) => {
    try {
      const assignments = await adminService.getUserClassAssignments(userId);
      setUserAssignments(assignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const handleAssignClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      await adminService.assignUserToClass(
        selectedUser.id,
        newAssignment.class,
        newAssignment.section
      );

      toast({
        title: 'Success',
        description: 'Class assigned successfully'
      });

      setNewAssignment({ class: '', section: '' });
      fetchUserAssignments(selectedUser.id);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign class',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      await adminService.removeUserFromClass(assignmentId);
      toast({
        title: 'Success',
        description: 'Assignment removed successfully'
      });
      if (selectedUser) {
        fetchUserAssignments(selectedUser.id);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove assignment',
        variant: 'destructive'
      });
    }
  };

  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert className="max-w-md">
          <AlertDescription>
            You don't have permission to access the admin portal.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Portal</h1>
          <p className="text-gray-600 mt-2">Manage users and permissions</p>
        </div>
        <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Create User Profile
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create User Profile</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  placeholder="Enter the Supabase Auth User ID"
                  value={newUser.userId}
                  onChange={(e) => setNewUser({...newUser, userId: e.target.value})}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  The user must already exist in Supabase Auth. Get the ID from the Supabase dashboard.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={newUser.first_name}
                    onChange={(e) => setNewUser({...newUser, first_name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={newUser.last_name}
                    onChange={(e) => setNewUser({...newUser, last_name: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={newUser.role} onValueChange={(value: any) => setNewUser({...newUser, role: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">Create User Profile</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="assignments">Class Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                All Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div>Loading users...</div>
              ) : (
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">
                          {user.first_name} {user.last_name}
                        </h3>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedUser(user);
                          fetchUserAssignments(user.id);
                          setAssignClassOpen(true);
                        }}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Manage Classes
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <CardTitle>Class Assignments Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Select a user from the Users tab to manage their class assignments.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={assignClassOpen} onOpenChange={setAssignClassOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Manage Classes for {selectedUser?.first_name} {selectedUser?.last_name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-3">Current Assignments</h3>
              {userAssignments.length === 0 ? (
                <p className="text-gray-500">No class assignments</p>
              ) : (
                <div className="space-y-2">
                  {userAssignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span>Class {assignment.class}-{assignment.section}</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveAssignment(assignment.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3">Assign New Class</h3>
              <form onSubmit={handleAssignClass} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Class</Label>
                    <Select 
                      value={newAssignment.class} 
                      onValueChange={(value) => setNewAssignment({...newAssignment, class: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {CLASS_OPTIONS.map(cls => (
                          <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Section</Label>
                    <Select 
                      value={newAssignment.section} 
                      onValueChange={(value) => setNewAssignment({...newAssignment, section: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        {SECTION_OPTIONS.map(section => (
                          <SelectItem key={section} value={section}>{section}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  disabled={!newAssignment.class || !newAssignment.section}
                >
                  Assign Class
                </Button>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
