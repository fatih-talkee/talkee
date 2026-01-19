import { useQuery } from '@tanstack/react-query';
import { ProfileService } from '@/services/supabase/profile.service';
import { usersService } from '@/services/supabase';
import { useEffect, useState } from 'react';
import { CACHE_CONFIG } from '@/lib/cacheConfig';
import { supabase } from '@/lib/supabase';

// Query Keys Factory Pattern
export const invoicesKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoicesKeys.all, 'list'] as const,
  list: (userId?: string | null, role?: 'caller' | 'professional') =>
    [...invoicesKeys.lists(), userId, role] as const,
  details: () => [...invoicesKeys.all, 'detail'] as const,
  detail: (invoiceId: string) =>
    [...invoicesKeys.details(), invoiceId] as const,
};

export function useInvoices(role: 'caller' | 'professional' = 'caller') {
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user from users table (not auth_id)
  // Also listen to auth state changes to update userId when user switches
  useEffect(() => {
    const getCurrentUser = async () => {
      const user = await usersService.getCurrentUser();
      setUserId(user?.id || null);
    };

    getCurrentUser();

    // Listen for auth changes to update userId when user switches
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        // User logged in or switched - get fresh user data
        const user = await usersService.getCurrentUser();
        setUserId(user?.id || null);
      } else {
        // User logged out - clear userId
        setUserId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const {
    data: invoices = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: invoicesKeys.list(userId, role),
    queryFn: () => ProfileService.getInvoices(userId!, role),
    enabled: !!userId,
    ...CACHE_CONFIG.INVOICES,
    refetchOnMount: 'always', // Always refetch when invoices page mounts
  });

  return {
    invoices,
    isLoading,
    error,
    refetch,
  };
}

export function useInvoice(invoiceId: string | null) {
  const {
    data: invoice,
    isLoading,
    error,
  } = useQuery({
    queryKey: invoicesKeys.detail(invoiceId!),
    queryFn: () => ProfileService.getInvoice(invoiceId!),
    enabled: !!invoiceId,
    ...CACHE_CONFIG.INVOICES,
  });

  return {
    invoice,
    isLoading,
    error,
  };
}
