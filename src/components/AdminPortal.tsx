import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { adminService, UserProfile, ClassAssignment, AuthUser } from '@/services/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, UserPlus, Settings, Trash2, UserCheck, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
const CLASS_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const SECTION_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
export const AdminPortal = () => {
  const {
    isAdmin,
    profile
  } = useAuth();
  const {
    toast
  } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [allAuthUsers, setAllAuthUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [signupUserOpen, setSignupUserOpen] = useState(false);
  const [assignClassOpen, setAssignClassOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userAssignments, setUserAssignments] = useState<ClassAssignment[]>([]);
  const [allAssignments, setAllAssignments] = useState<{
    user: UserProfile;
    assignments: ClassAssignment[];
  }[]>([]);

  // Create user profile form state (for existing auth users)
  const [newUserProfile, setNewUserProfile] = useState({
    userId: '',
    email: '',
    first_name: '',
    last_name: '',
    role: 'teacher' as 'admin' | 'teacher' | 'staff'
  });

  // Signup form state (for completely new users)
  const [signupUser, setSignupUser] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'teacher' as 'admin' | 'teacher' | 'staff'
  });

  // Class assignment state
  const [newAssignment, setNewAssignment] = useState({
    class: '',
    section: ''
  });

  // Edit user form state
  const [editUserForm, setEditUserForm] = useState({
    first_name: '',
    last_name: '',
    role: 'teacher' as 'admin' | 'teacher' | 'staff',
    password: ''
  });
  useEffect(() => {
    if (isAdmin()) {
      fetchData();
    }
  }, [isAdmin]);
  const fetchData = async () => {
    try {
      const [profiles, authUsers] = await Promise.all([adminService.getAllProfiles(), adminService.getAllAuthUsers()]);
      setUsers(profiles);
      setAllAuthUsers(authUsers);

      // Fetch all assignments for the assignments tab
      const assignmentsData = await Promise.all(profiles.map(async user => {
        const assignments = await adminService.getUserClassAssignments(user.id);
        return {
          user,
          assignments
        };
      }));
      setAllAssignments(assignmentsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  const handleCreateUserProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedAuthUser = allAuthUsers.find(u => u.id === newUserProfile.userId);
      if (!selectedAuthUser) {
        throw new Error('Please select a valid auth user');
      }
      const {
        error
      } = await adminService.createUserProfile(newUserProfile.userId, {
        email: selectedAuthUser.email,
        first_name: newUserProfile.first_name,
        last_name: newUserProfile.last_name,
        role: newUserProfile.role
      });
      if (error) throw error;
      toast({
        title: 'Success',
        description: 'User profile created successfully'
      });
      setNewUserProfile({
        userId: '',
        email: '',
        first_name: '',
        last_name: '',
        role: 'teacher'
      });
      setCreateUserOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user profile',
        variant: 'destructive'
      });
    }
  };
  const handleSignupUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('Attempting to sign up user:', signupUser.email);
      const {
        data,
        error
      } = await adminService.signUpUser(signupUser.email, signupUser.password, {
        first_name: signupUser.first_name,
        last_name: signupUser.last_name,
        role: signupUser.role
      });
      if (error) {
        console.error('Signup error:', error);
        throw new Error(error.message);
      }
      console.log('Signup successful:', data);
      toast({
        title: 'Success',
        description: 'User account created successfully! They may need to verify their email.'
      });
      setSignupUser({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        role: 'teacher'
      });
      setSignupUserOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Signup error details:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user account',
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
      await adminService.assignUserToClass(selectedUser.id, newAssignment.class, newAssignment.section);
      toast({
        title: 'Success',
        description: 'Class assigned successfully'
      });
      setNewAssignment({
        class: '',
        section: ''
      });
      fetchUserAssignments(selectedUser.id);
      fetchData(); // Refresh all data to update assignments tab
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
      fetchData(); // Refresh all data to update assignments tab
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove assignment',
        variant: 'destructive'
      });
    }
  };
  const handleAuthUserSelection = (userId: string) => {
    const selectedAuthUser = allAuthUsers.find(u => u.id === userId);
    if (selectedAuthUser) {
      setNewUserProfile({
        ...newUserProfile,
        userId: selectedAuthUser.id,
        email: selectedAuthUser.email
      });
    }
  };
  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setEditUserForm({
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      password: ''
    });
    setEditUserOpen(true);
  };
  const canEditUser = (user: UserProfile) => {
    if (!profile) return false;
    return profile.role === 'admin' || profile.id === user.id;
  };
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !profile) return;
    try {
      // Frontend validation - only admin can change roles
      if (editUserForm.role !== selectedUser.role && profile.role !== 'admin') {
        toast({
          title: 'Error',
          description: 'Only administrators can change user roles',
          variant: 'destructive'
        });
        return;
      }

      // Simulate user update (frontend only as requested)
      const updatedUsers = users.map(user => user.id === selectedUser.id ? {
        ...user,
        first_name: editUserForm.first_name,
        last_name: editUserForm.last_name,
        role: editUserForm.role
      } : user);
      setUsers(updatedUsers);
      toast({
        title: 'Success',
        description: 'User updated successfully (frontend only)'
      });
      setEditUserOpen(false);
      setSelectedUser(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user',
        variant: 'destructive'
      });
    }
  };
  if (!isAdmin()) {
    return <div className="flex items-center justify-center h-64">
        <Alert className="max-w-md">
          <AlertDescription>
            You don't have permission to access the admin portal.
          </AlertDescription>
        </Alert>
      </div>;
  }
  return <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Portal</h1>
          <p className="text-gray-600 mt-2">Manage users and permissions</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={signupUserOpen} onOpenChange={setSignupUserOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserCheck className="w-4 h-4 mr-2" />
                Sign Up User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Sign Up New User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSignupUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="signup_first_name">First Name</Label>
                    <Input id="signup_first_name" value={signupUser.first_name} onChange={e => setSignupUser({
                    ...signupUser,
                    first_name: e.target.value
                  })} required />
                  </div>
                  <div>
                    <Label htmlFor="signup_last_name">Last Name</Label>
                    <Input id="signup_last_name" value={signupUser.last_name} onChange={e => setSignupUser({
                    ...signupUser,
                    last_name: e.target.value
                  })} required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="signup_email">Email</Label>
                  <Input id="signup_email" type="email" value={signupUser.email} onChange={e => setSignupUser({
                  ...signupUser,
                  email: e.target.value
                })} required />
                </div>
                <div>
                  <Label htmlFor="signup_password">Password</Label>
                  <Input id="signup_password" type="password" value={signupUser.password} onChange={e => setSignupUser({
                  ...signupUser,
                  password: e.target.value
                })} required minLength={6} />
                </div>
                <div>
                  <Label htmlFor="signup_role">Role</Label>
                  <Select value={signupUser.role} onValueChange={(value: any) => setSignupUser({
                  ...signupUser,
                  role: value
                })}>
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
                <Button type="submit" className="w-full">Create Account</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
            <DialogTrigger asChild>
              
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create User Profile</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateUserProfile} className="space-y-4">
                <div>
                  <Label htmlFor="authUser">Select Auth User</Label>
                  <Select value={newUserProfile.userId} onValueChange={handleAuthUserSelection}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an existing auth user" />
                    </SelectTrigger>
                    <SelectContent>
                      {allAuthUsers.map(authUser => <SelectItem key={authUser.id} value={authUser.id}>
                          {authUser.email}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Select from all registered auth users (includes those with existing profiles)
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="profile_first_name">First Name</Label>
                    <Input id="profile_first_name" value={newUserProfile.first_name} onChange={e => setNewUserProfile({
                    ...newUserProfile,
                    first_name: e.target.value
                  })} required />
                  </div>
                  <div>
                    <Label htmlFor="profile_last_name">Last Name</Label>
                    <Input id="profile_last_name" value={newUserProfile.last_name} onChange={e => setNewUserProfile({
                    ...newUserProfile,
                    last_name: e.target.value
                  })} required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="profile_email">Email</Label>
                  <Input id="profile_email" type="email" value={newUserProfile.email} readOnly className="bg-gray-100" />
                  <p className="text-xs text-gray-500 mt-1">
                    Email is automatically filled from the selected auth user
                  </p>
                </div>
                <div>
                  <Label htmlFor="profile_role">Role</Label>
                  <Select value={newUserProfile.role} onValueChange={(value: any) => setNewUserProfile({
                  ...newUserProfile,
                  role: value
                })}>
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
                <Button type="submit" className="w-full" disabled={!newUserProfile.userId}>
                  Create User Profile
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
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
              {loading ? <div>Loading users...</div> : <div className="space-y-4">
                  {users.map(user => <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">
                          {user.first_name} {user.last_name}
                        </h3>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        {canEditUser(user) && <Button variant="outline" onClick={() => handleEditUser(user)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Account
                          </Button>}
                        <Button variant="outline" onClick={() => {
                    setSelectedUser(user);
                    fetchUserAssignments(user.id);
                    setAssignClassOpen(true);
                  }}>
                          <Settings className="w-4 h-4 mr-2" />
                          Manage Classes
                        </Button>
                      </div>
                    </div>)}
                </div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <CardTitle>Class Assignments Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <div>Loading assignments...</div> : <div className="space-y-4">
                  {allAssignments.map(({
                user,
                assignments
              }) => <div key={user.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-medium">
                            {user.first_name} {user.last_name}
                          </h3>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">Assigned Classes:</p>
                        {assignments.length === 0 ? <p className="text-sm text-gray-500">No class assignments</p> : <div className="flex flex-wrap gap-2">
                            {assignments.map(assignment => <Badge key={assignment.id} variant="outline">
                                Class {assignment.class}-{assignment.section}
                              </Badge>)}
                          </div>}
                      </div>
                    </div>)}
                </div>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit Account - {selectedUser?.first_name} {selectedUser?.last_name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_first_name">First Name</Label>
                <Input id="edit_first_name" value={editUserForm.first_name} onChange={e => setEditUserForm({
                ...editUserForm,
                first_name: e.target.value
              })} required />
              </div>
              <div>
                <Label htmlFor="edit_last_name">Last Name</Label>
                <Input id="edit_last_name" value={editUserForm.last_name} onChange={e => setEditUserForm({
                ...editUserForm,
                last_name: e.target.value
              })} required />
              </div>
            </div>
            
            {profile?.role === 'admin' && <div>
                <Label htmlFor="edit_role">Role</Label>
                <Select value={editUserForm.role} onValueChange={(value: any) => setEditUserForm({
              ...editUserForm,
              role: value
            })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>}
            
            <div>
              <Label htmlFor="edit_password">New Password (optional)</Label>
              <Input id="edit_password" type="password" value={editUserForm.password} onChange={e => setEditUserForm({
              ...editUserForm,
              password: e.target.value
            })} placeholder="Leave blank to keep current password" />
            </div>
            
            <Button type="submit" className="w-full">
              Update Account
            </Button>
          </form>
        </DialogContent>
      </Dialog>

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
              {userAssignments.length === 0 ? <p className="text-gray-500">No class assignments</p> : <div className="space-y-2">
                  {userAssignments.map(assignment => <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span>Class {assignment.class}-{assignment.section}</span>
                      <Button variant="destructive" size="sm" onClick={() => handleRemoveAssignment(assignment.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>)}
                </div>}
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3">Assign New Class</h3>
              <form onSubmit={handleAssignClass} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Class</Label>
                    <Select value={newAssignment.class} onValueChange={value => setNewAssignment({
                    ...newAssignment,
                    class: value
                  })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {CLASS_OPTIONS.map(cls => <SelectItem key={cls} value={cls}>{cls}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Section</Label>
                    <Select value={newAssignment.section} onValueChange={value => setNewAssignment({
                    ...newAssignment,
                    section: value
                  })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        {SECTION_OPTIONS.map(section => <SelectItem key={section} value={section}>{section}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" disabled={!newAssignment.class || !newAssignment.section}>
                  Assign Class
                </Button>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};