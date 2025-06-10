
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

export interface AuthUser {
  id: string;
  email: string;
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

  async getAllAuthUsers(): Promise<AuthUser[]> {
    try {
      // Note: This requires admin privileges to access auth.users
      const { data, error } = await supabase.auth.admin.listUsers();
      
      if (error) throw error;
      
      return data.users.map(user => ({
        id: user.id,
        email: user.email || '',
        created_at: user.created_at
      }));
    } catch (error) {
      console.error('Error fetching auth users:', error);
      // Fallback: return empty array if admin access is not available
      return [];
    }
  },

  async getAuthUsersWithoutProfiles(): Promise<AuthUser[]> {
    try {
      const [authUsers, profiles] = await Promise.all([
        adminService.getAllAuthUsers(),
        adminService.getAllProfiles()
      ]);
      
      const profileUserIds = new Set(profiles.map(p => p.id));
      
      return authUsers.filter(user => !profileUserIds.has(user.id));
    } catch (error) {
      console.error('Error fetching users without profiles:', error);
      return [];
    }
  },

  async signUpUser(email: string, password: string, userData: {
    first_name: string;
    last_name: string;
    role: 'admin' | 'teacher' | 'staff';
  }) {
    try {
      // Create the auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

      if (authError) {
        return { data: null, error: { message: authError.message } };
      }

      if (!authData.user) {
        return { data: null, error: { message: 'Failed to create auth user' } };
      }

      // Create the profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          role: userData.role,
          is_active: true
        })
        .select()
        .single();

      if (profileError) {
        // If profile creation fails, we should clean up the auth user
        await supabase.auth.admin.deleteUser(authData.user.id);
        return { data: null, error: { message: profileError.message } };
      }

      return { data: { user: authData.user, profile: profileData }, error: null };
    } catch (error: any) {
      console.error('Signup error:', error);
      return { 
        data: null, 
        error: { 
          message: error.message || 'Failed to create user account.' 
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

    if (error) throw error;
    return data || [];
  },

  async assignUserToClass(userId: string, className: string, section: string) {
    const { data, error } = await supabase
      .from('class_assignments')
      .insert({
        user_id: userId,
        class: className,
        section: section
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async removeUserFromClass(assignmentId: string) {
    const { error } = await supabase
      .from('class_assignments')
      .delete()
      .eq('id', assignmentId);

    if (error) throw error;
  }
};
