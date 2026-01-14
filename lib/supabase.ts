import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { logger } from './logger';

// Uygulama genelinde tek bir instance olduğundan emin olmak için
console.log('[Supabase] 🚀 Initializing Client Instance');

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  Constants.expoConfig?.extra?.supabaseUrl ||
  '';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Yardımcı fonksiyonlar
export async function setSupabaseSession(
  accessToken: string,
  refreshToken: string
) {
  return await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
}

export async function ensureSupabaseSession() {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

export const warmSupabaseConnection = async () => {
  // ✅ FIX: Supabase client ile warmup (Postgrest modülünü tetikler + session kullanır)
  const startTime = Date.now();

  try {
    // 1️⃣ Check session first
    const { data: sessionData } = await supabase.auth.getSession();
    const hasSession = !!sessionData.session;
    const userId = sessionData.session?.user?.id;

    logger.info('[Supabase] 🔍 Starting warmup', {
      hasSession,
      userId: userId?.substring(0, 8),
      timestamp: new Date().toISOString(),
    });

    // 2️⃣ Start query with detailed logging
    logger.info('[Supabase] 📡 Executing warmup query', {
      table: 'categories',
      select: 'id',
      limit: 1,
      hasSession,
    });

    const queryStartTime = Date.now();

    // 3️⃣ Execute with 10s timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Warmup query timeout (10s)')), 10000)
    );

    const queryPromise = supabase
      .from('categories')
      .select('id')
      .limit(1)
      .maybeSingle();

    const { data, error } = (await Promise.race([
      queryPromise,
      timeoutPromise.then(() => ({
        data: null,
        error: new Error('Timeout') as any,
      })),
    ])) as any;

    const queryDuration = Date.now() - queryStartTime;

    // 4️⃣ Log result
    if (error) {
      if (error.code === 'PGRST116') {
        // Row not found - OK for warmup
        logger.info('[Supabase] ✅ Postgrest ready (no rows, expected)', {
          duration: `${queryDuration}ms`,
          totalDuration: `${Date.now() - startTime}ms`,
        });
        return;
      }

      // Real error
      logger.error('[Supabase] ❌ Warmup query failed', {
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
        duration: `${queryDuration}ms`,
        hasSession,
      });
      throw error;
    }

    logger.info('[Supabase] ✅ Postgrest client ready', {
      hasData: !!data,
      duration: `${queryDuration}ms`,
      totalDuration: `${Date.now() - startTime}ms`,
    });
  } catch (e: any) {
    const totalDuration = Date.now() - startTime;

    logger.error('[Supabase] ⚠️ Warmup failed', {
      error: e?.message || String(e),
      errorCode: e?.code,
      errorName: e?.name,
      duration: `${totalDuration}ms`,
      stack: e?.stack?.substring(0, 200),
    });

    throw e; // Rethrow so callback can catch and decide
  }
};
