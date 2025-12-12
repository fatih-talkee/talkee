/**
 * useAutoAvailability Hook
 *
 * Automatically sets professional availability based on app state:
 * - App comes to foreground → Set available = true
 * - App goes to background → Set available = false
 * - App closes → Set available = false
 *
 * Usage:
 * ```tsx
 * function ProfessionalApp() {
 *   useAutoAvailability(); // Just call it once in main app component
 *   return <YourApp />;
 * }
 * ```
 */

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { professionalsService } from '@/services/supabase/professionals.service';

interface UseAutoAvailabilityOptions {
  enabled?: boolean; // Enable/disable auto availability (default: true)
  setOnlineOnForeground?: boolean; // Set online when app comes to foreground (default: true)
  setOfflineOnBackground?: boolean; // Set offline when app goes to background (default: true)
  backgroundDelay?: number; // Delay before setting offline (ms, default: 30000 = 30 seconds)
}

export function useAutoAvailability(options: UseAutoAvailabilityOptions = {}) {
  const {
    enabled = true,
    setOnlineOnForeground = true,
    setOfflineOnBackground = true,
    backgroundDelay = 30000, // 30 seconds
  } = options;

  const { profileData, isProfessional } = useProfile();
  const appState = useRef(AppState.currentState);
  const backgroundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSettingStatus = useRef(false);

  const professionalId = profileData?.professional?.id;

  // Update availability status
  const updateAvailability = async (isAvailable: boolean, reason: string) => {
    if (!professionalId || isSettingStatus.current) return;

    try {
      isSettingStatus.current = true;

      await professionalsService.updateAvailability(
        professionalId,
        isAvailable
      );
    } catch (error) {
      console.error('[AutoAvailability] ❌ Failed to update status:', error);
    } finally {
      isSettingStatus.current = false;
    }
  };

  // Handle app state changes
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    const previousState = appState.current;
    appState.current = nextAppState;

    // Clear any pending background timer
    if (backgroundTimer.current) {
      clearTimeout(backgroundTimer.current);
      backgroundTimer.current = null;
    }

    // App comes to foreground
    if (
      previousState.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      if (setOnlineOnForeground) {
        updateAvailability(true, 'App came to foreground');
      }
    }

    // App goes to background
    if (
      previousState === 'active' &&
      nextAppState.match(/inactive|background/)
    ) {
      if (setOfflineOnBackground) {
        // Wait before setting offline (in case user comes back quickly)
        backgroundTimer.current = setTimeout(() => {
          updateAvailability(
            false,
            `App in background for ${backgroundDelay}ms`
          );
        }, backgroundDelay);
      }
    }
  };

  // Set online when component mounts (app opens)
  useEffect(() => {
    if (!enabled || !isProfessional || !professionalId) return;

    // Set online on mount
    if (setOnlineOnForeground) {
      updateAvailability(true, 'App opened');
    }

    // Listen to app state changes
    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );

    // Cleanup: Set offline when component unmounts (app closes)
    return () => {
      subscription.remove();

      // Clear timer
      if (backgroundTimer.current) {
        clearTimeout(backgroundTimer.current);
      }

      // Set offline on unmount
      if (setOfflineOnBackground && professionalId) {
        updateAvailability(false, 'App closed');
      }
    };
  }, [enabled, isProfessional, professionalId]);

  return null;
}

// ============================================================================
// ALTERNATIVE: Service-based approach (without hook)
// ============================================================================

class AutoAvailabilityService {
  private professionalId: string | null = null;
  private subscription: any = null;
  private backgroundTimer: ReturnType<typeof setTimeout> | null = null;
  private appState = AppState.currentState;
  private backgroundDelay = 30000; // 30 seconds

  /**
   * Initialize auto availability for a professional
   */
  async initialize(
    professionalId: string,
    options: { backgroundDelay?: number } = {}
  ) {
    this.professionalId = professionalId;
    this.backgroundDelay = options.backgroundDelay || 30000;

    // Set online on init
    await this.setAvailable(true, 'Service initialized');

    // Listen to app state changes
    this.subscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );
  }

  /**
   * Stop auto availability (cleanup)
   */
  async cleanup() {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }

    if (this.backgroundTimer) {
      clearTimeout(this.backgroundTimer);
      this.backgroundTimer = null;
    }

    // Set offline on cleanup
    if (this.professionalId) {
      await this.setAvailable(false, 'Service cleanup');
    }
  }

  private handleAppStateChange(nextAppState: AppStateStatus) {
    const previousState = this.appState;
    this.appState = nextAppState;

    // Clear pending timer
    if (this.backgroundTimer) {
      clearTimeout(this.backgroundTimer);
      this.backgroundTimer = null;
    }

    // Foreground
    if (
      previousState.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      this.setAvailable(true, 'App to foreground');
    }

    // Background
    if (
      previousState === 'active' &&
      nextAppState.match(/inactive|background/)
    ) {
      this.backgroundTimer = setTimeout(() => {
        this.setAvailable(false, 'App in background');
      }, this.backgroundDelay);
    }
  }

  private async setAvailable(isAvailable: boolean, reason: string) {
    if (!this.professionalId) return;

    try {
      await professionalsService.updateAvailability(
        this.professionalId,
        isAvailable
      );
    } catch (error) {
      console.error('[AutoAvailabilityService] ❌ Failed:', error);
    }
  }
}

export const autoAvailabilityService = new AutoAvailabilityService();

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
// Example 1: Using Hook (Recommended)
// In your main App component or Professional Dashboard:

import { useAutoAvailability } from '@/hooks/useAutoAvailability';

function App() {
  useAutoAvailability(); // Auto online/offline
  
  return <NavigationContainer>...</NavigationContainer>;
}

// Example 2: Custom options
function App() {
  useAutoAvailability({
    enabled: true,
    setOnlineOnForeground: true,
    setOfflineOnBackground: true,
    backgroundDelay: 60000, // 1 minute delay
  });
  
  return <NavigationContainer>...</NavigationContainer>;
}

// Example 3: Using Service (Alternative)
// In your App initialization:

useEffect(() => {
  if (isProfessional && professionalId) {
    autoAvailabilityService.initialize(professionalId);
    
    return () => {
      autoAvailabilityService.cleanup();
    };
  }
}, [isProfessional, professionalId]);

// Example 4: Conditional auto-availability (user preference)
function App() {
  const [autoOnline, setAutoOnline] = useState(true);
  
  useAutoAvailability({
    enabled: autoOnline, // User can toggle this
  });
  
  return <NavigationContainer>...</NavigationContainer>;
}
*/
