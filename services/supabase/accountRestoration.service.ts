import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
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
  /**
   * ✅ OPTIMIZED: Uses logger instead of console.error
   * ✅ IMPROVED: Better OAuth provider/email merge logic
   */
  async restoreDeletedAccount(
    authId: string,
    email: string,
    name: string,
    avatarUrl?: string,
    oauthProvider?: string
  ): Promise<User | null> {
    const restoreStartTime = Date.now();
    logger.info('[AccountRestoration] 🔄 Starting account restoration', {
      authId,
      email,
      name,
      hasAvatar: !!avatarUrl,
      oauthProvider,
      timestamp: new Date().toISOString(),
    });

    try {
      // ✅ OPTIMIZED: Check if there's a deleted account with this auth_id
      // Uses index: idx_users_auth_id_deleted
      const { data: deletedUser, error: findError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authId)
        .not('deleted_at', 'is', null)
        .maybeSingle();

      if (findError) {
        logger.error(
          '[AccountRestoration] ❌ Error finding deleted account',
          findError,
          {
            authId,
            errorMessage: findError.message,
            errorCode: findError.code,
            timestamp: new Date().toISOString(),
          }
        );
        return null;
      }

      if (!deletedUser) {
        logger.info('[AccountRestoration] ℹ️ No deleted account found', {
          authId,
          timestamp: new Date().toISOString(),
        });
        return null;
      }

      logger.info('[AccountRestoration] ✅ Deleted account found', {
        authId,
        userId: deletedUser.id,
        deletedAt: deletedUser.deleted_at,
        timestamp: new Date().toISOString(),
      });

      // ✅ IMPROVED: Merge OAuth providers and emails properly
      const existingProviders = Array.isArray(deletedUser.oauth_providers)
        ? deletedUser.oauth_providers
        : [];
      const existingEmails =
        typeof deletedUser.oauth_emails === 'object' &&
        deletedUser.oauth_emails !== null
          ? deletedUser.oauth_emails
          : {};

      // Add new provider if provided and not already in list
      const updatedProviders = oauthProvider
        ? Array.from(new Set([...existingProviders, oauthProvider]))
        : existingProviders;

      // Add new email if provided
      const updatedEmails = oauthProvider
        ? { ...existingEmails, [oauthProvider]: email }
        : existingEmails;

      // Restore the account with new information from OAuth
      const { data: restoredUser, error: restoreError } = await supabase
        .from('users')
        .update({
          name: name || deletedUser.name || 'User',
          primary_email: email || deletedUser.primary_email,
          avatar_url: avatarUrl || deletedUser.avatar_url,
          deleted_at: null, // Clear deleted_at to restore account
          updated_at: new Date().toISOString(),
          // ✅ IMPROVED: Properly merge OAuth data
          oauth_providers: updatedProviders,
          oauth_emails: updatedEmails,
        })
        .eq('id', deletedUser.id)
        .select()
        .single();

      if (restoreError) {
        logger.error(
          '[AccountRestoration] ❌ Error restoring account',
          restoreError,
          {
            authId,
            userId: deletedUser.id,
            errorMessage: restoreError.message,
            errorCode: restoreError.code,
            timestamp: new Date().toISOString(),
          }
        );
        return null;
      }

      const totalElapsed = Date.now() - restoreStartTime;
      logger.info('[AccountRestoration] ✅ Account restored successfully', {
        authId,
        userId: restoredUser.id,
        name: restoredUser.name,
        email: restoredUser.primary_email,
        oauthProviders: updatedProviders,
        totalElapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      return restoredUser as User;
    } catch (error) {
      const totalElapsed = Date.now() - restoreStartTime;
      logger.error(
        '[AccountRestoration] ❌ Unexpected error during restoration',
        error,
        {
          authId,
          elapsed: `${totalElapsed}ms`,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        }
      );
      return null;
    }
  }

  /**
   * Check if an account exists (deleted or not) for this auth_id
   * ✅ OPTIMIZED: Uses logger and better error handling
   * Useful for determining if we should restore or create new
   */
  async checkAccountExists(authId: string): Promise<{
    exists: boolean;
    isDeleted: boolean;
    userId?: string;
  }> {
    const checkStartTime = Date.now();
    logger.debug('[AccountRestoration] 🔍 Checking if account exists', {
      authId,
      timestamp: new Date().toISOString(),
    });

    try {
      // ✅ OPTIMIZED: Uses index: idx_users_auth_id_deleted
      const { data: user, error } = await supabase
        .from('users')
        .select('id, deleted_at')
        .eq('auth_id', authId)
        .maybeSingle();

      if (error) {
        logger.warn('[AccountRestoration] ⚠️ Error checking account existence', {
          authId,
          errorMessage: error.message,
          errorCode: error.code,
          timestamp: new Date().toISOString(),
        });
        return { exists: false, isDeleted: false };
      }

      if (!user) {
        const elapsed = Date.now() - checkStartTime;
        logger.debug('[AccountRestoration] ℹ️ Account does not exist', {
          authId,
          elapsed: `${elapsed}ms`,
          timestamp: new Date().toISOString(),
        });
        return { exists: false, isDeleted: false };
      }

      const isDeleted = user.deleted_at !== null;
      const elapsed = Date.now() - checkStartTime;
      logger.info('[AccountRestoration] ✅ Account check completed', {
        authId,
        userId: user.id,
        exists: true,
        isDeleted,
        elapsed: `${elapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      return {
        exists: true,
        isDeleted,
        userId: user.id,
      };
    } catch (error) {
      const elapsed = Date.now() - checkStartTime;
      logger.error(
        '[AccountRestoration] ❌ Unexpected error checking account',
        error,
        {
          authId,
          elapsed: `${elapsed}ms`,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        }
      );
      return { exists: false, isDeleted: false };
    }
  }
}

export const accountRestorationService = new AccountRestorationService();
