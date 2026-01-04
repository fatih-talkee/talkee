/**
 * Singleton Auth State Manager
 * Prevents multiple auth state change listeners from being created
 * when useProfile is called from multiple components
 */

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

type AuthStateChangeCallback = (event: string, session: any) => void;

class AuthStateManager {
  private static instance: AuthStateManager | null = null;
  private subscription: { unsubscribe: () => void } | null = null;
  private listeners: Set<AuthStateChangeCallback> = new Set();
  private isInitialized = false;
  private lastEventTime: number = 0;
  private lastEvent: string | null = null;
  private readonly DEBOUNCE_MS = 100; // Debounce INITIAL_SESSION events

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): AuthStateManager {
    if (!AuthStateManager.instance) {
      AuthStateManager.instance = new AuthStateManager();
    }
    return AuthStateManager.instance;
  }

  /**
   * Subscribe to auth state changes
   * Returns unsubscribe function
   */
  subscribe(callback: AuthStateChangeCallback): () => void {
    this.listeners.add(callback);

    // Initialize subscription if this is the first listener
    if (!this.isInitialized) {
      this.initialize();
    }

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
      
      // Clean up subscription if no more listeners
      if (this.listeners.size === 0 && this.subscription) {
        this.subscription.unsubscribe();
        this.subscription = null;
        this.isInitialized = false;
        logger.debug('[AuthStateManager] 🗑️ All listeners removed, cleaned up subscription');
      }
    };
  }

  private initialize() {
    if (this.isInitialized) {
      logger.debug('[AuthStateManager] ⚠️ Already initialized, skipping');
      return;
    }

    logger.debug('[AuthStateManager] 🔧 Initializing auth state listener');

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const now = Date.now();
      
      // Debounce INITIAL_SESSION events
      if (event === 'INITIAL_SESSION') {
        const timeSinceLastEvent = now - this.lastEventTime;
        if (
          this.lastEvent === 'INITIAL_SESSION' &&
          timeSinceLastEvent < this.DEBOUNCE_MS
        ) {
          logger.debug('[AuthStateManager] ⏭️ Debouncing INITIAL_SESSION event', {
            timeSinceLastEvent: `${timeSinceLastEvent}ms`,
          });
          return;
        }
        this.lastEventTime = now;
        this.lastEvent = event;
      } else {
        this.lastEventTime = now;
        this.lastEvent = event;
      }

      logger.debug('[AuthStateManager] 📡 Auth state changed', {
        event,
        listenerCount: this.listeners.size,
        authenticated: !!session?.user,
      });

      // Notify all listeners
      this.listeners.forEach((callback) => {
        try {
          callback(event, session);
        } catch (error) {
          logger.error('[AuthStateManager] ❌ Error in auth state callback', error);
        }
      });
    });

    this.subscription = subscription;
    this.isInitialized = true;

    logger.debug('[AuthStateManager] ✅ Auth state listener initialized');
  }

  /**
   * Get current session
   */
  async getSession() {
    return await supabase.auth.getSession();
  }
}

export const authStateManager = AuthStateManager.getInstance();

