import { supabase } from '../../lib/supabase';
import type {
  User,
  UserUpdate,
  Transaction,
  ProfessionalWithRelations,
} from '../../types/database.types';

class UsersService {
  /**
   * Get current authenticated user profile
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const {
        data: { session },
        error: authError,
      } = await supabase.auth.getSession();

      if (authError || !session?.user) {
        // Don't log error if session is just missing (normal during logout)
        if (authError && !authError.message.includes('session missing')) {
          console.error('Auth error:', authError);
        }
        return null;
      }

      const authUser = session.user;

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
   * Delete current user account (SOFT DELETE + ANONYMIZATION)
   * This will:
   * 1. Anonymize user's personal data (GDPR compliant)
   * 2. Mark user as deleted (soft delete)
   * 3. Deactivate professional profile (if exists)
   * 4. Delete auth user (prevents login)
   * 5. Keep transactional data (calls, reviews, invoices) for audit trail
   */
  async deleteAccount(): Promise<{ success: boolean; error?: string }> {
    try {
      const currentUser = await this.getCurrentUser();

      if (!currentUser) {
        return { success: false, error: 'Not authenticated' };
      }

      const userId = currentUser.id;
      const authId = currentUser.auth_id;

      console.log(
        '🗑️  Starting SOFT DELETE (anonymization) for user:',
        userId,
        'auth_id:',
        authId
      );

      // ========================================================================
      // STEP 1: Get professional ID if user is a professional
      // ========================================================================
      const { data: professional, error: profFetchError } = await supabase
        .from('professionals')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (profFetchError && profFetchError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine
        console.warn('Error fetching professional:', profFetchError);
      }

      const professionalId = professional?.id;

      // ========================================================================
      // STEP 2: Use SQL function for soft delete (anonymization)
      // ========================================================================
      console.log('🗑️  Starting soft delete (anonymization)...');
      const serviceRoleKey =
        process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_SERVICE_ROLE_KEY;
      let adminClient: any = null;

      if (serviceRoleKey) {
        // Use admin client to bypass RLS
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
          adminClient = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          });

          // Try soft delete SQL function first (if it exists)
          const { data: softDeleteResult, error: rpcError } =
            await adminClient.rpc('soft_delete_user_account', {
              user_id_to_delete: userId,
            });

          if (rpcError) {
            // Function might not exist, do manual soft delete
            console.log('SQL function not found, using manual soft delete');

            // Deactivate professional if exists
            if (professionalId) {
              const { error: profError } = await adminClient
                .from('professionals')
                .update({
                  is_available: false,
                  is_active: false,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', professionalId);

              if (profError) {
                console.warn('Error deactivating professional:', profError);
              }
            }

            // Anonymize user data and mark as deleted
            // Note: We keep auth_id so account can be restored if user signs in again
            const { error: anonymizeError } = await adminClient
              .from('users')
              .update({
                name: 'Deleted User',
                primary_email: null,
                phone: null,
                avatar_url: null,
                bio: null,
                deleted_at: new Date().toISOString(), // Mark as deleted
                updated_at: new Date().toISOString(),
              })
              .eq('id', userId);

            if (anonymizeError) {
              console.error('Error anonymizing user:', anonymizeError);
              return {
                success: false,
                error: `Failed to anonymize user: ${anonymizeError.message}. Please run the SQL migration: docs/sql/soft_delete_user_account.sql`,
              };
            }
          } else if (softDeleteResult && !softDeleteResult.success) {
            console.error('SQL function returned error:', softDeleteResult);
            return {
              success: false,
              error:
                softDeleteResult.error || 'Failed to soft delete user account',
            };
          } else {
            console.log('✅ User anonymized via SQL function');
          }
        } catch (adminError) {
          console.error('Error creating admin client:', adminError);
          let errorMessage =
            'Failed to soft delete user. Please run the SQL migration: docs/sql/soft_delete_user_account.sql';
          if (adminError instanceof Error) {
            errorMessage = `Failed to soft delete user: ${adminError.message}. Please run the SQL migration: docs/sql/soft_delete_user_account.sql`;
          }
          return {
            success: false,
            error: errorMessage,
          };
        }
      } else {
        // No service role key, try SQL function with regular client first
        const { data: softDeleteResult, error: dbError } = await supabase.rpc(
          'soft_delete_user_account',
          {
            user_id_to_delete: userId,
          }
        );

        if (dbError) {
          // Function might not exist, do manual soft delete with regular client
          console.log(
            'SQL function not found, using manual soft delete with regular client'
          );

          // Deactivate professional if exists
          if (professionalId) {
            const { error: profError } = await supabase
              .from('professionals')
              .update({
                is_available: false,
                is_active: false,
                updated_at: new Date().toISOString(),
              })
              .eq('id', professionalId);

            if (profError) {
              console.warn('Error deactivating professional:', profError);
            }
          }

          // Anonymize user data and mark as deleted
          // Note: We keep auth_id so account can be restored if user signs in again
          const { error: anonymizeError } = await supabase
            .from('users')
            .update({
              name: 'Deleted User',
              primary_email: null,
              phone: null,
              avatar_url: null,
              bio: null,
              deleted_at: new Date().toISOString(), // Mark as deleted
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

          if (anonymizeError) {
            console.error('Error anonymizing user:', anonymizeError);
            return {
              success: false,
              error: `Failed to anonymize user: ${anonymizeError.message}. Please ensure RLS policies allow users to update their own data.`,
            };
          }
        } else if (softDeleteResult && !softDeleteResult.success) {
          console.error('SQL function returned error:', softDeleteResult);
          return {
            success: false,
            error:
              softDeleteResult.error || 'Failed to soft delete user account',
          };
        } else {
          console.log('✅ User anonymized via SQL function');
        }
      }

      console.log('✅ User anonymized and soft deleted');

      // ========================================================================
      // STEP 6: Delete auth user (requires service role key)
      // ========================================================================
      // Reuse serviceRoleKey from step 5

      if (serviceRoleKey && adminClient) {
        try {
          const { error: authDeleteError } =
            await adminClient.auth.admin.deleteUser(authId);

          if (authDeleteError) {
            console.warn('Error deleting auth user:', authDeleteError);
            // Continue anyway - user data is already deleted
          } else {
            console.log('✅ Auth user deleted');
          }
        } catch (authError) {
          console.warn(
            'Error creating admin client for auth deletion:',
            authError
          );
          // Continue anyway
        }
      } else {
        console.warn(
          '⚠️  Service role key not found. Auth user will remain but user data is deleted.'
        );
      }

      // ========================================================================
      // STEP 7: Sign out current session
      // ========================================================================
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        console.error('Error signing out:', signOutError);
        // Don't fail the deletion, just log it
      } else {
        console.log('✅ User signed out');
      }

      console.log('✅ SOFT DELETE (anonymization) completed successfully');

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

  /**
   * Get blocked users for current user
   * Returns blocked users with their profile information
   */
  async getBlockedUsers(): Promise<
    Array<{
      id: string;
      blocked_id: string;
      created_at: string;
      professional: ProfessionalWithRelations | null;
    }>
  > {
    try {
      const currentUser = await this.getCurrentUser();

      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      // Get blocked users with user info
      // Use inner join to get user details
      const { data: blockedData, error } = await supabase
        .from('blocked_users')
        .select(
          `
          id,
          blocked_id,
          created_at,
          blocked_user:users!blocked_users_blocked_id_fkey(
            id,
            name,
            avatar_url,
            is_verified
          )
        `
        )
        .eq('blocker_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching blocked users:', error);
        throw new Error(`Failed to fetch blocked users: ${error.message}`);
      }

      if (!blockedData || blockedData.length === 0) {
        return [];
      }

      // Get full professional info for blocked users
      const blockedUserIds = blockedData.map((b) => b.blocked_id);
      const { data: professionalsData, error: professionalsError } =
        await supabase
          .from('professionals')
          .select(
            `
          *,
          users(id, name, avatar_url, is_verified),
          categories(id, name, slug, icon_name)
        `
          )
          .in('user_id', blockedUserIds);

      if (professionalsError) {
        console.error(
          'Error fetching professionals for blocked users:',
          professionalsError
        );
        throw new Error(
          `Failed to fetch professionals: ${professionalsError.message}`
        );
      }

      // Create a map of user_id -> professional
      const professionalMap = new Map(
        (professionalsData || []).map((p) => [
          p.user_id,
          p as ProfessionalWithRelations,
        ])
      );

      // Transform the data to include full professional info
      return blockedData.map((block) => {
        const professional = professionalMap.get(block.blocked_id);
        return {
          id: block.id,
          blocked_id: block.blocked_id,
          created_at: block.created_at,
          professional: professional || null,
        };
      });
    } catch (error) {
      console.error('Error in getBlockedUsers:', error);
      throw error;
    }
  }

  /**
   * Check if current user is blocked by a specific user
   * @param userId - The user ID to check if they blocked us
   * @returns true if the user has blocked the current user
   */
  async isBlockedByUser(userId: string): Promise<boolean> {
    try {
      const currentUser = await this.getCurrentUser();

      if (!currentUser) {
        return false;
      }

      // Check if there's a record where blocker_id = userId and blocked_id = currentUser.id
      const { data, error } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', userId)
        .eq('blocked_id', currentUser.id)
        .limit(1);

      if (error) {
        console.error('Error checking if blocked by user:', error);
        return false;
      }

      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Error in isBlockedByUser:', error);
      return false;
    }
  }

  /**
   * Block a user
   */
  async blockUser(userIdToBlock: string): Promise<void> {
    try {
      const currentUser = await this.getCurrentUser();

      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      // Prevent self-blocking
      if (currentUser.id === userIdToBlock) {
        throw new Error('Cannot block yourself');
      }

      const { error } = await supabase.from('blocked_users').insert({
        blocker_id: currentUser.id,
        blocked_id: userIdToBlock,
      });

      if (error) {
        // If already blocked, ignore the error (idempotent)
        if (error.code === '23505') {
          // Unique constraint violation - already blocked
          console.log('User already blocked');
          return;
        }
        console.error('Error blocking user:', error);
        throw new Error(`Failed to block user: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in blockUser:', error);
      throw error;
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(userIdToUnblock: string): Promise<void> {
    try {
      const currentUser = await this.getCurrentUser();

      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', currentUser.id)
        .eq('blocked_id', userIdToUnblock);

      if (error) {
        console.error('Error unblocking user:', error);
        throw new Error(`Failed to unblock user: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in unblockUser:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const usersService = new UsersService();
