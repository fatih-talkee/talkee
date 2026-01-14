/**
 * Auth Callback Handler - OAuth Sign-In/Sign-Up
 * HIZLI GEÇİŞ: Sadece oturumu doğrular ve ana sayfaya atar.
 * Profil kontrolü Home ekranında arka planda yapılır.
 */

import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { supabase, warmSupabaseConnection } from '@/lib/supabase';
import { useToast } from '@/lib/toastService';
import { logger } from '@/lib/logger';

export default function AuthCallback() {
  const toast = useToast();
  const [status, setStatus] = useState('Completing sign in...');
  const hasProcessedRef = useRef(false);
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    if (hasProcessedRef.current || hasNavigatedRef.current) return;

    const checkSessionAndGo = async () => {
      if (hasProcessedRef.current || hasNavigatedRef.current) return;
      
      try {
        setStatus('Verifying session...');
        // Oturumu en hızlı şekilde al
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session) {
          logger.info('[Callback] ✅ Session active (fast path), warming up...');
          hasNavigatedRef.current = true;
          hasProcessedRef.current = true;
          
          setStatus('Preparing database...');
          
          // 🔥 Postgrest client warmup with timeout
          try {
            logger.info('[Callback] 🔥 Warming up Supabase connection (fast path)...');
            const warmupPromise = warmSupabaseConnection();
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Warmup timeout (10s)')), 10000)
            );
            
            await Promise.race([warmupPromise, timeoutPromise]);
            logger.info('[Callback] ✅ Supabase connection warmed up (fast path)');
          } catch (warmupErr: any) {
            logger.warn('[Callback] ⚠️ Warmup failed (proceeding anyway)', {
              error: warmupErr?.message || String(warmupErr)
            });
          }
          
          logger.info('[Callback] 🧭 Navigating to home (fast path)');
          router.replace('/(tabs)');
          logger.info('[Callback] ✅ Navigation complete (fast path)');
        } else if (error) {
          throw error;
        }
      } catch (err) {
        logger.warn('[Callback] ⚠️ Fast check failed, waiting for listener...');
      }
    };

    // Dinleyiciyi kur
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session && !hasNavigatedRef.current) {
        logger.info(`[Callback] 🔔 Auth event: ${event}, waiting for state settle...`);
        hasNavigatedRef.current = true;
        hasProcessedRef.current = true;
        
        // 🔥 KRİTİK FIX: Session'ın Postgrest client'a yansıması için bekle ve warmup yap
        setTimeout(() => {
          logger.info('[Callback] ⏰ 800ms delay completed, starting warmup...');
          setStatus('Preparing database...');
          
          // IIFE wrapper for async warmup
          (async () => {
            try {
              logger.info('[Callback] 🔥 Warming up Supabase connection...');
              
              // Warmup with 10-second timeout (increased for slow networks)
              const warmupPromise = warmSupabaseConnection();
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Warmup timeout (10s)')), 10000)
              );
              
              await Promise.race([warmupPromise, timeoutPromise]);
              logger.info('[Callback] ✅ Supabase connection warmed up successfully');
            } catch (warmupErr: any) {
              logger.warn('[Callback] ⚠️ Warmup failed (proceeding anyway)', {
                error: warmupErr?.message || String(warmupErr)
              });
            }
            
            logger.info('[Callback] 🧭 Navigating to home screen');
            router.replace('/(tabs)');
            logger.info('[Callback] ✅ Navigation complete');
          })();
        }, 800);
      }
    });

    checkSessionAndGo();

    // Güvenlik: Eğer 15 saniye içinde hiçbir şey olmazsa login ekranına geri dön
    const fallbackTimer = setTimeout(() => {
      if (!hasNavigatedRef.current) {
        logger.error('[Callback] ❌ Timeout: No session detected in 15s');
        router.replace('/auth/login');
      }
    }, 15000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallbackTimer);
    };
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.statusText}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  statusText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#666',
    textAlign: 'center',
  },
});
