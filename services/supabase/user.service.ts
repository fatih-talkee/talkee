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
