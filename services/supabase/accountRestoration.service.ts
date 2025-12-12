import { supabase } from '@/lib/supabase';
import type { User } from '@/types/database.types';

/**
 * Account Restoration Service
 * Handles restoring soft-deleted accounts when users sign in again
 */
class AccountRestorationService {
  /**
   * Check if a deleted account exists for this auth_id and restore it
   * Returns the restored user or null if no deleted account exists
   */
  async restoreDeletedAccount(
    authId: string,
    email: string,
    name: string,
    avatarUrl?: string
  ): Promise<User | null> {
    try {
      console.log('🔍 [restoreAccount] Checking for deleted account:', authId);

      // Check if there's a deleted account with this auth_id
      const { data: deletedUser, error: findError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authId)
        .not('deleted_at', 'is', null)
        .maybeSingle();

      if (findError) {
        console.error('❌ [restoreAccount] Error finding deleted account:', findError);
        return null;
      }

      if (!deletedUser) {
        console.log('✅ [restoreAccount] No deleted account found, creating new one');
        return null;
      }

      console.log('🔄 [restoreAccount] Found deleted account, restoring...', {
        userId: deletedUser.id,
        deletedAt: deletedUser.deleted_at,
      });

      // Restore the account with new information from OAuth
      const { data: restoredUser, error: restoreError } = await supabase
        .from('users')
        .update({
          name: name || deletedUser.name || 'User',
          primary_email: email || deletedUser.primary_email,
          avatar_url: avatarUrl || deletedUser.avatar_url,
          deleted_at: null, // Clear deleted_at to restore account
          updated_at: new Date().toISOString(),
          // Restore OAuth provider if not already in the list
          oauth_providers: deletedUser.oauth_providers || [],
          oauth_emails: deletedUser.oauth_emails || {},
        })
        .eq('id', deletedUser.id)
        .select()
        .single();

      if (restoreError) {
        console.error('❌ [restoreAccount] Error restoring account:', restoreError);
        return null;
      }

      console.log('✅ [restoreAccount] Account restored successfully:', {
        userId: restoredUser.id,
        name: restoredUser.name,
      });

      return restoredUser as User;
    } catch (error) {
      console.error('❌ [restoreAccount] Unexpected error:', error);
      return null;
    }
  }

  /**
   * Check if an account exists (deleted or not) for this auth_id
   * Useful for determining if we should restore or create new
   */
  async checkAccountExists(authId: string): Promise<{
    exists: boolean;
    isDeleted: boolean;
    userId?: string;
  }> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, deleted_at')
        .eq('auth_id', authId)
        .maybeSingle();

      if (error || !user) {
        return { exists: false, isDeleted: false };
      }

      return {
        exists: true,
        isDeleted: user.deleted_at !== null,
        userId: user.id,
      };
    } catch (error) {
      console.error('❌ [checkAccountExists] Error:', error);
      return { exists: false, isDeleted: false };
    }
  }
}

export const accountRestorationService = new AccountRestorationService();

