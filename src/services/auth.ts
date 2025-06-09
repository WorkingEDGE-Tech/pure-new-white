
import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: 'admin' | 'teacher' | 'staff';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassAssignment {
  id: string;
  user_id: string;
  class: string;
  section: string;
  created_at: string;
}

export const authService = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  async getCurrentUserProfile(): Promise<UserProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Try to fetch by user ID first, then by email as fallback
    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // If no profile found by ID, try by email
    if (error && error.code === 'PGRST116') {
      console.log('Profile not found by ID, trying by email:', user.email);
      const { data: emailData, error: emailError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', user.email)
        .single();
      
      if (emailError) throw emailError;
      data = emailData;
    } else if (error) {
      throw error;
    }

    return data;
  },

  async getUserAssignedClasses(): Promise<ClassAssignment[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('class_assignments')
      .select('*')
      .eq('user_id', user.id);

    if (error) throw error;
    return data || [];
  }
};

export const adminService = {
  async getAllProfiles(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createCompleteUser(userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: 'admin' | 'teacher' | 'staff';
  }) {
    try {
      console.log('Creating complete user:', { ...userData, password: '[REDACTED]' });
      
      // Step 1: Create user in auth.users
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true
      });

      if (authError) {
        console.error('Auth user creation failed:', authError);
        throw authError;
      }

      if (!authData.user) {
        throw new Error('No user data returned from auth creation');
      }

      console.log('Auth user created successfully:', authData.user.id);

      // Step 2: Create profile in public.profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          role: userData.role,
          is_active: true
        })
        .select()
        .single();

      if (profileError) {
        console.error('Profile creation failed:', profileError);
        // If profile creation fails, we should clean up the auth user
        // Note: In production, you might want to handle this differently
        throw profileError;
      }

      console.log('Profile created successfully:', profileData);

      return { 
        data: { 
          user: authData.user, 
          profile: profileData 
        }, 
        error: null 
      };
    } catch (error: any) {
      console.error('Complete user creation failed:', error);
      return { 
        data: null, 
        error: { 
          message: error.message || 'Failed to create user and profile.' 
        } 
      };
    }
  },

  async createUserProfile(userId: string, userData: {
    email: string;
    first_name: string;
    last_name: string;
    role: 'admin' | 'teacher' | 'staff';
  }) {
    try {
      // Create a profile entry for an existing auth user
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          role: userData.role,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return { 
            data: null, 
            error: { 
              message: 'A profile for this user already exists.' 
            } 
          };
        }
        throw error;
      }

      return { data, error: null };
    } catch (error: any) {
      return { 
        data: null, 
        error: { 
          message: error.message || 'Failed to create user profile.' 
        } 
      };
    }
  },

  async updateUserProfile(userId: string, updates: Partial<UserProfile>) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getUserClassAssignments(userId: string): Promise<ClassAssignment[]> {
    const { data, error } = await supabase
      .from('class_assignments')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user class assignments:', error);
      throw error;
    }
    return data || [];
  },

  async assignUserToClass(userId: string, className: string, section: string) {
    try {
      console.log('Attempting to assign class:', { userId, className, section });
      
      // Check if assignment already exists
      const { data: existing } = await supabase
        .from('class_assignments')
        .select('id')
        .eq('user_id', userId)
        .eq('class', className)
        .eq('section', section)
        .single();

      if (existing) {
        throw new Error(`User is already assigned to Class ${className}-${section}`);
      }

      const { data, error } = await supabase
        .from('class_assignments')
        .insert({
          user_id: userId,
          class: className,
          section: section
        })
        .select()
        .single();

      if (error) {
        console.error('Class assignment error:', error);
        throw error;
      }

      console.log('Class assignment successful:', data);
      return data;
    } catch (error: any) {
      console.error('Failed to assign class:', error);
      throw error;
    }
  },

  async removeUserFromClass(assignmentId: string) {
    try {
      console.log('Removing class assignment:', assignmentId);
      
      const { error } = await supabase
        .from('class_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) {
        console.error('Error removing class assignment:', error);
        throw error;
      }

      console.log('Class assignment removed successfully');
    } catch (error: any) {
      console.error('Failed to remove class assignment:', error);
      throw error;
    }
  }
};
