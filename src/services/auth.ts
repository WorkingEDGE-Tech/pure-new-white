
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

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
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
    // Instead of using admin API directly, we'll create the profile record
    // and let the user sign up normally, then update their profile
    try {
      // First, create the profile record with the user data
      const { data: profile, error: profileError } = await supabase
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

      if (profileError) throw profileError;

      // Return success - in a real implementation, you'd send an invitation email
      // or have a different flow for user creation
      return { 
        data: { 
          user: profile,
          message: 'User profile created. They can now sign up with their email.'
        }, 
        error: null 
      };
    } catch (error) {
      return { 
        data: null, 
        error: { 
          message: 'Unable to create user. This feature requires additional server-side setup.' 
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
