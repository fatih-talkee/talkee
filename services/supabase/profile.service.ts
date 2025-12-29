import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type {
  User,
  Professional,
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
    const startTime = Date.now();
    logger.info('[ProfileService] 🔍 getProfileData started', {
      authId: authId?.substring(0, 8) + '...',
      timestamp: new Date().toISOString(),
    });

    try {
      // Validate authId
      if (!authId || authId === 'null' || authId === 'undefined') {
        logger.warn('[ProfileService] ⚠️ Invalid authId', { authId });
        return null;
      }

      // ✅ OPTIMIZED: Only select fields needed for profile summary page
      // Get user data by auth_id
      const userQueryStart = Date.now();
      logger.info('[ProfileService] 📊 Querying users table...', {
        authId: authId?.substring(0, 8) + '...',
      });

      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, name, avatar_url, created_at, primary_email')
        .eq('auth_id', authId)
        .is('deleted_at', null) // Only get non-deleted users
        .single();

      const userQueryDuration = Date.now() - userQueryStart;
      logger.info('[ProfileService] ✅ Users query completed', {
        duration: `${userQueryDuration}ms`,
        found: !!user,
      });

      if (userError) {
        logger.error('[ProfileService] ❌ User query error', {
          error: userError.message,
          code: userError.code,
          duration: `${userQueryDuration}ms`,
        });
        throw userError;
      }

      if (!user) {
        logger.info('[ProfileService] ℹ️ No user found', {
          authId: authId?.substring(0, 8) + '...',
        });
        return null;
      }

      logger.info('[ProfileService] ✅ User found', {
        userId: user.id,
        userName: user.name,
      });

      // ✅ OPTIMIZED: Get stats and professional data in parallel
      // Both queries depend on user.id but are independent of each other
      const parallelQueryStart = Date.now();
      logger.info(
        '[ProfileService] 📊 Querying stats and professionals in parallel...',
        {
          userId: user.id,
        }
      );

      // ✅ OPTIMIZED: Only select fields needed for profile summary page
      const [statsResult, profResult] = await Promise.all([
        supabase.rpc('get_user_profile_stats', { p_user_id: user.id }),
        supabase
          .from('professionals')
          .select(
            'id, title, total_calls, is_verified, rate_per_minute, specialties'
          )
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      const parallelQueryDuration = Date.now() - parallelQueryStart;
      logger.info('[ProfileService] ✅ Parallel queries completed', {
        duration: `${parallelQueryDuration}ms`,
      });

      // Handle stats result
      const { data: statsData, error: statsError } = statsResult;
      if (statsError) {
        logger.error('[ProfileService] ❌ Stats query error', {
          error: statsError.message,
          code: statsError.code,
        });
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

      // Handle professional result
      const { data: profData } = profResult;
      const professional = profData || null;
      const is_professional = !!profData;

      const totalDuration = Date.now() - startTime;
      logger.info('[ProfileService] ✅ getProfileData completed', {
        totalDuration: `${totalDuration}ms`,
        userId: user.id,
        isProfessional: is_professional,
        breakdown: {
          userQuery: `${userQueryDuration}ms`,
          parallelQueries: `${parallelQueryDuration}ms`,
        },
      });

      try {
        // ✅ Type cast: We only select necessary fields for profile summary,
        // but UserProfileData expects full User and Professional types. This is safe because
        // the profile summary page only uses the selected fields.
        const result: UserProfileData = {
          user: user as unknown as User,
          stats,
          is_professional,
          professional: professional
            ? (professional as unknown as Professional)
            : undefined,
        };
        logger.info('[ProfileService] ✅ Returning profile data', {
          hasUser: !!result.user,
          hasStats: !!result.stats,
          isProfessional: result.is_professional,
          hasProfessional: !!result.professional,
        });
        return result;
      } catch (returnError: any) {
        logger.error('[ProfileService] ❌ Error creating return object', {
          error: returnError?.message || String(returnError),
          errorType: returnError?.constructor?.name || typeof returnError,
        });
        throw returnError;
      }
    } catch (error: any) {
      const totalDuration = Date.now() - startTime;
      let errorMessage = 'Unknown error';
      let errorDetails: any = {};

      try {
        // Try to extract meaningful error information
        if (error?.message) {
          errorMessage = error.message;
          errorDetails = { message: error.message };
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else if (error?.toString && error.toString() !== '[object Object]') {
          errorMessage = error.toString();
        } else {
          // Try JSON.stringify with replacer to handle circular references
          try {
            const seen = new WeakSet();
            errorMessage = JSON.stringify(error, (key, value) => {
              if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) {
                  return '[Circular]';
                }
                seen.add(value);
              }
              return value;
            });
          } catch {
            // If JSON.stringify fails, try to get at least some info
            errorMessage = `Error: ${error?.constructor?.name || typeof error}`;
            if (error?.code) errorDetails.code = error.code;
            if (error?.status) errorDetails.status = error.status;
            if (error?.name) errorDetails.name = error.name;
          }
        }

        // Collect additional error details
        if (error?.code) errorDetails.code = error.code;
        if (error?.status) errorDetails.status = error.status;
        if (error?.name) errorDetails.name = error.name;
        if (error?.stack) errorDetails.stack = error.stack.substring(0, 500);
      } catch (parseError) {
        errorMessage = `Failed to parse error: ${String(parseError)}`;
      }

      const errorCode = error?.code || error?.status || 'UNKNOWN';
      logger.error('[ProfileService] ❌ Error fetching profile data', {
        error: errorMessage,
        errorDetails,
        code: errorCode,
        errorType: error?.constructor?.name || typeof error,
        totalDuration: `${totalDuration}ms`,
        authId: authId?.substring(0, 8) + '...',
      });
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
