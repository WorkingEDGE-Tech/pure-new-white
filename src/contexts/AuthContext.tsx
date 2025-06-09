
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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

// Session cache with timestamp
interface CachedSession {
  profile: UserProfile | null;
  classes: ClassAssignment[];
  timestamp: number;
  userId: string;
}

const SESSION_CACHE_KEY = 'atlasone_session_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [assignedClasses, setAssignedClasses] = useState<ClassAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  
  // Refs to prevent duplicate requests and manage state
  const profileFetchInProgress = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const authInitialized = useRef(false);

  // Cache management
  const getCachedSession = (userId: string): CachedSession | null => {
    try {
      const cached = localStorage.getItem(SESSION_CACHE_KEY);
      if (!cached) return null;
      
      const parsedCache: CachedSession = JSON.parse(cached);
      const isExpired = Date.now() - parsedCache.timestamp > CACHE_DURATION;
      const isCorrectUser = parsedCache.userId === userId;
      
      if (isExpired || !isCorrectUser) {
        localStorage.removeItem(SESSION_CACHE_KEY);
        return null;
      }
      
      return parsedCache;
    } catch {
      localStorage.removeItem(SESSION_CACHE_KEY);
      return null;
    }
  };

  const setCachedSession = (userId: string, profile: UserProfile | null, classes: ClassAssignment[]) => {
    try {
      const cacheData: CachedSession = {
        profile,
        classes,
        timestamp: Date.now(),
        userId
      };
      localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to cache session:', error);
    }
  };

  const clearCachedSession = () => {
    localStorage.removeItem(SESSION_CACHE_KEY);
  };

  const fetchProfileWithTimeout = async (userId: string): Promise<{ profile: UserProfile | null, classes: ClassAssignment[] }> => {
    console.log('Starting profile fetch with timeout for user:', userId);
    
    // Check cache first
    const cachedData = getCachedSession(userId);
    if (cachedData) {
      console.log('Using cached profile data');
      return { profile: cachedData.profile, classes: cachedData.classes };
    }
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Profile fetch timeout')), 8000); // Reduced timeout
    });

    const fetchPromise = Promise.all([
      authService.getCurrentUserProfile(),
      authService.getUserAssignedClasses()
    ]).then(([profile, classes]) => ({ profile, classes }));

    const result = await Promise.race([fetchPromise, timeoutPromise]) as { profile: UserProfile | null, classes: ClassAssignment[] };
    
    // Cache the result
    setCachedSession(userId, result.profile, result.classes);
    
    return result;
  };

  const loadUserProfile = async (currentUser: User, force = false) => {
    // Prevent duplicate requests for the same user
    if (!force && profileFetchInProgress.current === currentUser.id) {
      console.log('Profile fetch already in progress for user:', currentUser.id);
      return;
    }

    profileFetchInProgress.current = currentUser.id;
    setProfileLoading(true);
    
    try {
      console.log('Loading profile for user:', currentUser.id);
      const { profile: userProfile, classes } = await fetchProfileWithTimeout(currentUser.id);
      
      if (!mountedRef.current) return;
      
      console.log('Profile loaded successfully:', userProfile);
      setProfile(userProfile);
      setAssignedClasses(classes);
    } catch (error) {
      console.error('Error loading profile:', error);
      if (!mountedRef.current) return;
      
      // On error, check if we have any cached data as fallback
      const cachedData = getCachedSession(currentUser.id);
      if (cachedData) {
        console.log('Using cached data as fallback');
        setProfile(cachedData.profile);
        setAssignedClasses(cachedData.classes);
      } else {
        setProfile(null);
        setAssignedClasses([]);
      }
    } finally {
      if (mountedRef.current) {
        setProfileLoading(false);
        profileFetchInProgress.current = null;
      }
    }
  };

  const refreshProfile = async () => {
    if (!user) {
      console.log('No user found, skipping profile refresh');
      setProfileLoading(false);
      return;
    }
    
    // Clear cache to force fresh data
    clearCachedSession();
    await loadUserProfile(user, true);
  };

  useEffect(() => {
    mountedRef.current = true;

    const initializeAuth = async () => {
      if (authInitialized.current) return;
      
      try {
        console.log('Initializing auth...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          throw error;
        }

        console.log('Initial session check:', session?.user?.email);
        
        if (!mountedRef.current) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        authInitialized.current = true;
        
        if (session?.user) {
          await loadUserProfile(session.user);
        } else {
          setProfileLoading(false);
          clearCachedSession();
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mountedRef.current) {
          setLoading(false);
          setProfileLoading(false);
          setUser(null);
          setSession(null);
          setProfile(null);
          setAssignedClasses([]);
          clearCachedSession();
          authInitialized.current = true;
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (!mountedRef.current) return;
        
        // Handle different auth events
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setAssignedClasses([]);
          setProfileLoading(false);
          clearCachedSession();
          profileFetchInProgress.current = null;
          return;
        }
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user && authInitialized.current) {
            // Only load profile if this is a new user or forced refresh
            const isNewUser = !user || user.id !== session.user.id;
            if (isNewUser) {
              await loadUserProfile(session.user);
            }
          }
        }
        
        // Don't process INITIAL_SESSION if we already initialized
        if (event === 'INITIAL_SESSION' && authInitialized.current) {
          return;
        }
      }
    );

    initializeAuth();

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('Attempting sign in for:', email);
    clearCachedSession(); // Clear any existing cache
    const { error } = await authService.signIn(email, password);
    if (error) {
      console.error('Sign in error:', error);
    }
    return { error };
  };

  const signOut = async () => {
    console.log('Signing out...');
    clearCachedSession();
    profileFetchInProgress.current = null;
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
