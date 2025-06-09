
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
  profileLoading: boolean;
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
  profileLoading: true,
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
  const [profileLoading, setProfileLoading] = useState(true);

  const refreshProfile = async () => {
    if (!user) {
      console.log('No user found, skipping profile refresh');
      setProfileLoading(false);
      return;
    }
    
    setProfileLoading(true);
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
      setProfile(null);
      setAssignedClasses([]);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (session?.user) {
          // Fetch profile when user is authenticated
          setProfileLoading(true);
          try {
            console.log('Fetching profile for user:', session.user.id);
            const [userProfile, classes] = await Promise.all([
              authService.getCurrentUserProfile(),
              authService.getUserAssignedClasses()
            ]);
            
            if (isMounted) {
              console.log('Profile fetched:', userProfile);
              setProfile(userProfile);
              setAssignedClasses(classes);
            }
          } catch (error) {
            console.error('Error fetching profile on auth change:', error);
            if (isMounted) {
              setProfile(null);
              setAssignedClasses([]);
            }
          } finally {
            if (isMounted) {
              setProfileLoading(false);
            }
          }
        } else {
          setProfile(null);
          setAssignedClasses([]);
          setProfileLoading(false);
        }
      }
    );

    // Check for existing session on mount
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Initial session check:', session?.user?.email);
        
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (session?.user) {
          setProfileLoading(true);
          try {
            const [userProfile, classes] = await Promise.all([
              authService.getCurrentUserProfile(),
              authService.getUserAssignedClasses()
            ]);
            
            if (isMounted) {
              console.log('Initial profile loaded:', userProfile);
              setProfile(userProfile);
              setAssignedClasses(classes);
            }
          } catch (error) {
            console.error('Error loading initial profile:', error);
            if (isMounted) {
              setProfile(null);
              setAssignedClasses([]);
            }
          } finally {
            if (isMounted) {
              setProfileLoading(false);
            }
          }
        } else {
          setProfileLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (isMounted) {
          setLoading(false);
          setProfileLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
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
    setProfileLoading(false);
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
    profileLoading,
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
