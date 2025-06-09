
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

  const fetchProfileWithTimeout = async (userId: string): Promise<{ profile: UserProfile | null, classes: ClassAssignment[] }> => {
    console.log('Starting profile fetch with timeout for user:', userId);
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Profile fetch timeout')), 10000); // 10 second timeout
    });

    const fetchPromise = Promise.all([
      authService.getCurrentUserProfile(),
      authService.getUserAssignedClasses()
    ]).then(([profile, classes]) => ({ profile, classes }));

    return Promise.race([fetchPromise, timeoutPromise]) as Promise<{ profile: UserProfile | null, classes: ClassAssignment[] }>;
  };

  const refreshProfile = async () => {
    if (!user) {
      console.log('No user found, skipping profile refresh');
      setProfileLoading(false);
      return;
    }
    
    setProfileLoading(true);
    try {
      console.log('Refreshing profile for user:', user.id);
      const { profile: userProfile, classes } = await fetchProfileWithTimeout(user.id);
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

  const loadUserProfile = async (currentUser: User) => {
    setProfileLoading(true);
    try {
      console.log('Loading profile for user:', currentUser.id);
      const { profile: userProfile, classes } = await fetchProfileWithTimeout(currentUser.id);
      console.log('Profile loaded successfully:', userProfile);
      setProfile(userProfile);
      setAssignedClasses(classes);
    } catch (error) {
      console.error('Error loading profile:', error);
      // Set default profile data to prevent infinite loading
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
          // Load profile when user is authenticated
          await loadUserProfile(session.user);
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
        console.log('Initializing auth...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          throw error;
        }

        console.log('Initial session check:', session?.user?.email);
        
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (session?.user) {
          await loadUserProfile(session.user);
        } else {
          setProfileLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (isMounted) {
          setLoading(false);
          setProfileLoading(false);
          // Force sign out on error to prevent infinite loading
          setUser(null);
          setSession(null);
          setProfile(null);
          setAssignedClasses([]);
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
    console.log('Signing out...');
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
