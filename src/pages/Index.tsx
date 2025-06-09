
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Sidebar } from '@/components/Sidebar';
import { Dashboard } from '@/components/Dashboard';
import { StudentsModule } from '@/components/StudentsModule';
import { GradesModule } from '@/components/GradesModule';
import { AttendanceModule } from '@/components/AttendanceModule';
import { FeesModule } from '@/components/FeesModule';
import { ReportsModule } from '@/components/ReportsModule';
import { SettingsModule } from '@/components/SettingsModule';
import { AdminPortal } from '@/components/AdminPortal';
import { ChatPanel } from '@/components/ChatPanel';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Menu, MessageSquare } from 'lucide-react';

const Index = () => {
  const { profile } = useAuth();
  const [activeModule, setActiveModule] = useState('dashboard');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const renderActiveModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <Dashboard />;
      case 'students':
        return <StudentsModule />;
      case 'grades':
        return <GradesModule />;
      case 'attendance':
        return <AttendanceModule />;
      case 'fees':
        return <FeesModule />;
      case 'reports':
        return <ReportsModule />;
      case 'settings':
        return <SettingsModule />;
      case 'admin':
        return <AdminPortal />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ProtectedRoute>
      <ThemeProvider>
        <TooltipProvider>
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex transition-colors duration-300 w-full relative overflow-hidden">
            {/* Mobile Menu Button */}
            <div className="md:hidden fixed top-4 left-4 z-50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="bg-white dark:bg-slate-800 shadow-lg transition-all duration-200 hover:scale-105"
              >
                <Menu className="w-4 h-4" />
              </Button>
            </div>

            {/* Mobile Chat Button */}
            <div className="md:hidden fixed top-4 right-4 z-50">
              <Button
                variant={isChatOpen ? "default" : "outline"}
                size="sm"
                onClick={() => setIsChatOpen(!isChatOpen)}
                className="bg-white dark:bg-slate-800 shadow-lg transition-all duration-200 hover:scale-105"
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
            </div>

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
              <div 
                className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
                onClick={() => setIsSidebarOpen(false)}
              />
            )}

            {/* Sidebar */}
            <div className={`
              fixed md:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out
              ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
              <Sidebar 
                activeModule={activeModule} 
                setActiveModule={(module) => {
                  setActiveModule(module);
                  setIsSidebarOpen(false);
                }}
                isChatOpen={isChatOpen}
                setIsChatOpen={setIsChatOpen}
              />
            </div>
            
            <div className="flex-1 flex min-w-0 md:ml-0 relative">
              <main className="flex-1 transition-all duration-300 min-w-0 overflow-y-auto h-screen">
                <div className="p-3 md:p-6 pt-16 md:pt-6">
                  {renderActiveModule()}
                </div>
              </main>
              
              {/* Chat Panel - positioned absolutely to avoid affecting main content */}
              <div className={`
                fixed right-0 top-0 h-full w-80 transform transition-transform duration-300 ease-in-out z-30
                ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}
              `}>
                <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
              </div>
            </div>
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </ProtectedRoute>
  );
};

export default Index;
