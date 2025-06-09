import { Home, Users, BookOpen, UserCheck, CreditCard, MessageSquare, Moon, Sun, Shield, LogOut, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
interface SidebarProps {
  activeModule: string;
  setActiveModule: (module: string) => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
}
const menuItems = [{
  id: 'dashboard',
  label: 'Dashboard',
  icon: Home
}, {
  id: 'students',
  label: 'Students',
  icon: Users
}, {
  id: 'grades',
  label: 'Grades & Exams',
  icon: BookOpen
}, {
  id: 'attendance',
  label: 'Attendance',
  icon: UserCheck
}, {
  id: 'fees',
  label: 'Fees Management',
  icon: CreditCard
}, {
  id: 'reports',
  label: 'Reports',
  icon: BarChart3
}];
export const Sidebar = ({
  activeModule,
  setActiveModule,
  isChatOpen,
  setIsChatOpen
}: SidebarProps) => {
  const {
    theme,
    toggleTheme
  } = useTheme();
  const {
    profile,
    isAdmin,
    signOut,
    signIn
  } = useAuth();
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const handleAdminAccess = () => {
    console.log('Admin access requested, current profile:', profile);
    if (isAdmin()) {
      console.log('User is admin, navigating to admin portal');
      setActiveModule('admin');
    } else {
      console.log('User is not admin, opening login dialog');
      setAdminLoginOpen(true);
    }
  };
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoading(true);
    setAdminError('');
    const {
      error
    } = await signIn(adminEmail, adminPassword);
    if (error) {
      setAdminError(error.message);
      setAdminLoading(false);
      return;
    }

    // Wait a bit for the profile to be loaded, then check admin status
    setTimeout(() => {
      console.log('Checking admin status after login...');
      if (isAdmin()) {
        console.log('User is now admin, navigating to admin portal');
        setActiveModule('admin');
        setAdminLoginOpen(false);
        setAdminEmail('');
        setAdminPassword('');
      } else {
        console.log('User is still not admin after login');
        setAdminError('You do not have admin privileges');
      }
      setAdminLoading(false);
    }, 2000); // Give more time for profile to load
  };
  const handleSignOut = async () => {
    await signOut();
  };
  return <div className="w-64 h-screen fixed top-0 left-0 overflow-hidden flex flex-col bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 transition-colors duration-300 z-30">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-slate-700">
        {isAdmin() ? <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 p-2 rounded-lg transition-colors">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center overflow-hidden">
                  <img src="/placeholder.svg" alt="AtlasOne Logo" className="w-6 h-6 object-contain" />
                </div>
                <div className="flex-1">
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">AtlasOne</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">School Management</p>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={handleAdminAccess}>
                <Shield className="w-4 h-4 mr-2" />
                Admin Portal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu> : <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center overflow-hidden">
              <img alt="AtlasOne Logo" className="w-6 h-6 object-contain" src="/lovable-uploads/6fdcf63c-6386-4d61-a156-2860f86609a1.png" />
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">AtlasOne</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">School Management</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <LogOut className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleAdminAccess}>
                  <Shield className="w-4 h-4 mr-2" />
                  Admin Access
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>}
      </div>

      {/* User Info */}
      {profile && <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {profile.first_name} {profile.last_name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
            {profile.role}
          </p>
        </div>}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map(item => {
        const Icon = item.icon;
        return <button key={item.id} onClick={() => setActiveModule(item.id)} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeModule === item.id ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 scale-105' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white hover:scale-105'}`}>
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>;
      })}
      </nav>

      {/* Theme Toggle and Chat */}
      <div className="p-4 border-t border-gray-200 dark:border-slate-700 space-y-2">
        <Button onClick={toggleTheme} variant="outline" className="w-full flex items-center space-x-2 transition-all duration-200 hover:scale-105">
          {theme === 'dark' ? <>
              <Sun className="w-4 h-4" />
              <span>Light Mode</span>
            </> : <>
              <Moon className="w-4 h-4" />
              <span>Dark Mode</span>
            </>}
        </Button>
        
        <Button onClick={() => setIsChatOpen(!isChatOpen)} variant={isChatOpen ? "default" : "outline"} className="w-full flex items-center space-x-2 transition-all duration-200 hover:scale-105">
          <MessageSquare className="w-4 h-4" />
          <span>Staff Chat</span>
        </Button>
      </div>

      {/* Admin Login Dialog */}
      <Dialog open={adminLoginOpen} onOpenChange={setAdminLoginOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Admin Login Required</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdminLogin} className="space-y-6">
            {adminError && <Alert variant="destructive">
                <AlertDescription>{adminError}</AlertDescription>
              </Alert>}
            <div className="space-y-2">
              <Label htmlFor="admin-email">Admin Email</Label>
              <Input id="admin-email" type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Admin Password</Label>
              <Input id="admin-password" type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={adminLoading}>
              {adminLoading ? 'Signing in...' : 'Sign In as Admin'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>;
};