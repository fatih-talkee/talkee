import { supabase } from '../../lib/supabase';
import type { User, UserUpdate, Transaction } from '../../types/database.types';

class UsersService {
  /**
   * Get current authenticated user profile
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser) {
        console.error('Auth error:', authError);
        return null;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authUser.id)
        .single();

      if (error) {
        console.error('Error fetching user:', error);
        return null;
      }

      return data as User;
    } catch (error) {
      console.error('Error in getCurrentUser:', error);
      return null;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user by ID:', error);
        return null;
      }

      return data as User;
    } catch (error) {
      console.error('Error in getUserById:', error);
      return null;
    }
  }

  /**
   * Update current user profile
   */
  async updateProfile(updates: UserUpdate): Promise<User | null> {
    try {
      const currentUser = await this.getCurrentUser();

      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', currentUser.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        throw new Error(`Failed to update profile: ${error.message}`);
      }

      return data as User;
    } catch (error) {
      console.error('Error in updateProfile:', error);
      throw error;
    }
  }

  /**
   * Update user theme preference
   * @param theme - 'light' | 'dark' | 'system' | 'green' | 'blue'
   */
  async updateTheme(theme: string): Promise<boolean> {
    try {
      const currentUser = await this.getCurrentUser();

      if (!currentUser) {
        console.error('Not authenticated');
        return false;
      }

      const { error } = await supabase
        .from('users')
        .update({
          theme_preference: theme,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id);

      if (error) {
        console.error('Error updating theme:', error);
        return false;
      }

      console.log(`✅ Theme updated to: ${theme}`);
      return true;
    } catch (error) {
      console.error('Error in updateTheme:', error);
      return false;
    }
  }

  /**
   * Update user language preference
   * @param language - 'tr' | 'en' | 'de' | 'es' | 'fr'
   */
  async updateLanguage(language: string): Promise<boolean> {
    try {
      const currentUser = await this.getCurrentUser();

      if (!currentUser) {
        console.error('Not authenticated');
        return false;
      }

      const { error } = await supabase
        .from('users')
        .update({
          language_preference: language,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id);

      if (error) {
        console.error('Error updating language:', error);
        return false;
      }

      console.log(`✅ Language updated to: ${language}`);
      return true;
    } catch (error) {
      console.error('Error in updateLanguage:', error);
      return false;
    }
  }

  /**
   * Get user preferences (theme + language)
   */
  async getUserPreferences(): Promise<{
    theme: string;
    language: string;
  } | null> {
    try {
      const currentUser = await this.getCurrentUser();

      if (!currentUser) {
        return null;
      }

      return {
        theme: currentUser.theme_preference || 'system',
        language: currentUser.language_preference || 'tr',
      };
    } catch (error) {
      console.error('Error in getUserPreferences:', error);
      return null;
    }
  }

  /**
   * Upload and update avatar
   */
  async updateAvatar(fileUri: string): Promise<string> {
    try {
      const currentUser = await this.getCurrentUser();

      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      // Convert file URI to blob
      const response = await fetch(fileUri);
      const blob = await response.blob();

      // Generate unique filename
      const fileExt = fileUri.split('.').pop() || 'jpg';
      const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Failed to upload avatar: ${uploadError.message}`);
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath);

      // Update user profile
      await this.updateProfile({ avatar_url: publicUrl });

      return publicUrl;
    } catch (error) {
      console.error('Error in updateAvatar:', error);
      throw error;
    }
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(): Promise<number> {
    try {
      const currentUser = await this.getCurrentUser();
      return currentUser?.wallet_balance || 0;
    } catch (error) {
      console.error('Error in getWalletBalance:', error);
      return 0;
    }
  }

  /**
   * Update wallet balance (add or subtract)
   */
  async updateWalletBalance(amount: number): Promise<User | null> {
    try {
      const currentUser = await this.getCurrentUser();

      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      const newBalance = currentUser.wallet_balance + amount;

      if (newBalance < 0) {
        throw new Error('Insufficient balance');
      }

      const { data, error } = await supabase
        .from('users')
        .update({ wallet_balance: newBalance })
        .eq('id', currentUser.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating wallet balance:', error);
        throw new Error(`Failed to update balance: ${error.message}`);
      }

      return data as User;
    } catch (error) {
      console.error('Error in updateWalletBalance:', error);
      throw error;
    }
  }

  /**
   * Get transaction history
   */
  async getTransactions(
    limit: number = 20,
    offset: number = 0
  ): Promise<Transaction[]> {
    try {
      const currentUser = await this.getCurrentUser();

      if (!currentUser) {
        return [];
      }

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }

      return (data || []) as Transaction[];
    } catch (error) {
      console.error('Error in getTransactions:', error);
      return [];
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<{
    totalCalls: number;
    totalSpent: number;
    totalMinutes: number;
  }> {
    try {
      const currentUser = await this.getCurrentUser();

      if (!currentUser) {
        return { totalCalls: 0, totalSpent: 0, totalMinutes: 0 };
      }

      // Get call statistics
      const { data: calls, error: callsError } = await supabase
        .from('calls')
        .select('duration_minutes, total_cost')
        .eq('caller_id', currentUser.id)
        .eq('status', 'completed');

      if (callsError) {
        console.error('Error fetching call stats:', callsError);
        return { totalCalls: 0, totalSpent: 0, totalMinutes: 0 };
      }

      const totalCalls = calls?.length || 0;
      const totalSpent =
        calls?.reduce((sum, call) => sum + call.total_cost, 0) || 0;
      const totalMinutes =
        calls?.reduce((sum, call) => sum + call.duration_minutes, 0) || 0;

      return {
        totalCalls,
        totalSpent: Number(totalSpent.toFixed(2)),
        totalMinutes: Math.round(totalMinutes),
      };
    } catch (error) {
      console.error('Error in getUserStats:', error);
      return { totalCalls: 0, totalSpent: 0, totalMinutes: 0 };
    }
  }

  /**
   * Check if user exists by auth_id
   */
  async checkUserExists(authId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', authId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking user exists:', error);
      }

      return !!data;
    } catch (error) {
      console.error('Error in checkUserExists:', error);
      return false;
    }
  }

  /**
   * Delete current user account (soft delete or hard delete)
   * This will:
   * 1. Delete user data from database
   * 2. Sign out the user
   * 3. Optionally delete auth user (requires admin access)
   */
  async deleteAccount(): Promise<{ success: boolean; error?: string }> {
    try {
      const currentUser = await this.getCurrentUser();

      if (!currentUser) {
        return { success: false, error: 'Not authenticated' };
      }

      console.log('🗑️  Starting account deletion for user:', currentUser.id);

      // 1. Delete related data first (CASCADE should handle this, but being explicit)
      // Delete favorites
      const { error: favoritesError } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', currentUser.id);

      if (favoritesError) {
        console.warn('Error deleting favorites:', favoritesError);
        // Continue anyway
      }

      // Delete blocked users
      const { error: blockedError } = await supabase
        .from('blocked_users')
        .delete()
        .or(
          `user_id.eq.${currentUser.id},blocked_user_id.eq.${currentUser.id}`
        );

      if (blockedError) {
        console.warn('Error deleting blocked users:', blockedError);
        // Continue anyway
      }

      // Delete notifications
      const { error: notificationsError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', currentUser.id);

      if (notificationsError) {
        console.warn('Error deleting notifications:', notificationsError);
        // Continue anyway
      }

      // 2. Delete user profile from database
      const { error: dbError } = await supabase
        .from('users')
        .delete()
        .eq('id', currentUser.id);

      if (dbError) {
        console.error('Error deleting user from database:', dbError);
        return {
          success: false,
          error: `Failed to delete user data: ${dbError.message}`,
        };
      }

      console.log('✅ User data deleted successfully');

      // 3. Sign out (this will clear the session)
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        console.error('Error signing out:', signOutError);
        // Don't fail the deletion, just log it
      }

      console.log('✅ User signed out successfully');

      // Note: We can't delete the auth user without admin/service role key
      // The auth user will remain, but with no profile data
      // In production, you might want to use a server-side function for this

      return { success: true };
    } catch (error: any) {
      console.error('Error in deleteAccount:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete account',
      };
    }
  }

  /**
   * Create new user profile (after signup)
   */
  async createUserProfile(
    authId: string,
    email: string,
    name: string
  ): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          auth_id: authId,
          email,
          name,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating user profile:', error);
        throw new Error(`Failed to create profile: ${error.message}`);
      }

      return data as User;
    } catch (error) {
      console.error('Error in createUserProfile:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const usersService = new UsersService();
