
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, profileLoading } = useAuth();
  const navigate = useNavigate();
  const [forceShow, setForceShow] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      console.log('No user found, redirecting to login');
      navigate('/login');
    }
  }, [user, loading, navigate]);

  // Force show content after maximum loading time to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading || profileLoading) {
        console.warn('Maximum loading time exceeded, forcing content display');
        setForceShow(true);
      }
    }, 15000); // 15 second maximum loading time

    return () => clearTimeout(timeout);
  }, [loading, profileLoading]);

  // Show loading while auth or profile is loading (unless forced)
  if ((loading || profileLoading) && !forceShow) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
          <p className="text-sm text-gray-500 mt-2">
            {loading ? 'Authenticating...' : 'Loading profile...'}
          </p>
        </div>
      </div>
    );
  }

  if (!user && !forceShow) {
    return null;
  }

  return <>{children}</>;
};
