import { supabase } from '@/lib/supabase';
import type {
  User,
  UserProfileStats,
  UserProfileData,
  Invoice,
  InvoiceWithRelations,
} from '@/types/database.types';

export class ProfileService {
  /**
   * Get complete user profile data with stats
   */
  static async getProfileData(authId: string): Promise<UserProfileData | null> {
    try {
      console.log('🔍 Fetching profile for auth ID:', authId);

      // Get user data by auth_id
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authId);

      if (userError) {
        console.error('❌ User query error:', userError);
        throw userError;
      }

      if (!users || users.length === 0) {
        console.warn('⚠️ No user found with auth ID:', authId);
        return null;
      }

      const user = users[0];
      console.log('✅ User found:', user.name || user.primary_email);

      // Get stats from function using user.id (not auth_id!)
      const { data: statsData, error: statsError } = await supabase.rpc(
        'get_user_profile_stats',
        { p_user_id: user.id }
      );

      if (statsError) {
        console.error('❌ Stats query error:', statsError);
        throw statsError;
      }

      const stats: UserProfileStats = statsData?.[0] || {
        total_calls: 0,
        favorites_count: 0,
        blocked_users_count: 0,
        invoices_count: 0,
        total_spent: 0,
        member_since: user.created_at,
      };

      console.log('📊 Stats loaded:', stats);

      // Check if professional - query professionals table directly
      const { data: profData } = await supabase
        .from('professionals')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const professional = profData;
      const is_professional = !!profData;

      console.log(
        '👔 Professional check:',
        is_professional ? 'Is professional' : 'Not professional'
      );

      console.log('✅ Profile data complete');

      return {
        user,
        stats,
        is_professional,
        professional,
      };
    } catch (error) {
      console.error('❌ Error fetching profile data:', error);
      return null;
    }
  }

  /**
   * Update user preferences (theme, language)
   */
  static async updatePreferences(
    userId: string,
    preferences: {
      theme_preference?: 'light' | 'dark' | 'system';
      language_preference?: 'en' | 'tr' | 'fr' | 'es' | 'de';
    }
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update(preferences)
        .eq('id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating preferences:', error);
      return false;
    }
  }

  /**
   * Get user's invoices
   */
  static async getInvoices(
    userId: string,
    role: 'caller' | 'professional' = 'caller'
  ): Promise<InvoiceWithRelations[]> {
    try {
      const column = role === 'caller' ? 'caller_id' : 'professional_id';

      const { data, error } = await supabase
        .from('invoices')
        .select(
          `
          *,
          caller:users!caller_id(id, name, avatar_url),
          professional:professionals!professional_id(
            id,
            user_id,
            users(id, name, avatar_url),
            categories(id, name)
          ),
          call:calls(id, status, call_type, start_time, end_time)
        `
        )
        .eq(column, userId)
        .order('invoice_date', { ascending: false });

      if (error) throw error;
      return (data || []) as InvoiceWithRelations[];
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }
  }

  /**
   * Get single invoice
   */
  static async getInvoice(
    invoiceId: string
  ): Promise<InvoiceWithRelations | null> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(
          `
          *,
          caller:users!caller_id(id, name, avatar_url),
          professional:professionals!professional_id(
            id,
            user_id,
            users(id, name, avatar_url),
            categories(id, name)
          ),
          call:calls(id, status, call_type, start_time, end_time)
        `
        )
        .eq('id', invoiceId)
        .single();

      if (error) throw error;
      return data as InvoiceWithRelations;
    } catch (error) {
      console.error('Error fetching invoice:', error);
      return null;
    }
  }

  /**
   * Update user avatar
   */
  static async updateAvatar(
    userId: string,
    avatarUrl: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating avatar:', error);
      return false;
    }
  }

  /**
   * Sign out user
   */
  static async signOut(): Promise<boolean> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error signing out:', error);
      return false;
    }
  }
}
