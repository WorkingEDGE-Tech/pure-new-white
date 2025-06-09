
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

  // Reduced maximum loading time and better handling
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading || profileLoading) {
        console.warn('Maximum loading time exceeded, forcing content display');
        setForceShow(true);
      }
    }, 10000); // Reduced to 10 seconds

    return () => clearTimeout(timeout);
  }, [loading, profileLoading]);

  // Show loading while auth is loading (unless forced or user is already loaded)
  if (loading && !forceShow) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Authenticating...</p>
        </div>
      </div>
    );
  }

  // Show profile loading only if user exists but profile is still loading
  if (user && profileLoading && !forceShow) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user && !forceShow) {
    return null;
  }

  return <>{children}</>;
};
