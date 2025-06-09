
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

  async createUser(userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: 'admin' | 'teacher' | 'staff';
  }) {
    try {
      // Create a profile entry directly in the profiles table
      // Note: This requires the user to be created in Supabase Auth first
      const { data, error } = await supabase
        .from('profiles')
        .insert({
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
              message: 'A user with this email already exists. Please use the Supabase dashboard to create the auth user first, then try again.' 
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
          message: error.message || 'Failed to create user profile. Ensure the user exists in Supabase Auth first.' 
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
