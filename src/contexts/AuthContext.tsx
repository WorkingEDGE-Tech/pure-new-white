
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { authService, UserProfile, ClassAssignment } from '@/services/auth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  assignedClasses: ClassAssignment[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: () => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  assignedClasses: [],
  loading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  isAdmin: () => false,
  refreshProfile: async () => {}
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [assignedClasses, setAssignedClasses] = useState<ClassAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!user) {
      console.log('No user found, skipping profile refresh');
      return;
    }
    
    try {
      console.log('Refreshing profile for user:', user.id);
      const [userProfile, classes] = await Promise.all([
        authService.getCurrentUserProfile(),
        authService.getUserAssignedClasses()
      ]);
      console.log('Profile refreshed successfully:', userProfile);
      setProfile(userProfile);
      setAssignedClasses(classes);
    } catch (error) {
      console.error('Error refreshing profile:', error);
      // Set profile to null on error to prevent stale data
      setProfile(null);
      setAssignedClasses([]);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (session?.user) {
          // Immediately try to refresh profile when user is set
          try {
            console.log('Fetching profile for user:', session.user.id);
            const [userProfile, classes] = await Promise.all([
              authService.getCurrentUserProfile(),
              authService.getUserAssignedClasses()
            ]);
            console.log('Profile fetched:', userProfile);
            setProfile(userProfile);
            setAssignedClasses(classes);
          } catch (error) {
            console.error('Error fetching profile on auth change:', error);
            setProfile(null);
            setAssignedClasses([]);
          }
        } else {
          setProfile(null);
          setAssignedClasses([]);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        refreshProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('Attempting sign in for:', email);
    const { error } = await authService.signIn(email, password);
    if (error) {
      console.error('Sign in error:', error);
    }
    return { error };
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setAssignedClasses([]);
  };

  const isAdmin = () => {
    console.log('Checking admin status for profile:', profile);
    const adminStatus = profile?.role === 'admin';
    console.log('Admin status result:', adminStatus);
    return adminStatus;
  };

  const value = {
    user,
    session,
    profile,
    assignedClasses,
    loading,
    signIn,
    signOut,
    isAdmin,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
