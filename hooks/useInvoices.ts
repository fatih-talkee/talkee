import { useQuery } from '@tanstack/react-query';
import { ProfileService } from '@/services/supabase/profile.service';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export function useInvoices(role: 'caller' | 'professional' = 'caller') {
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user from Supabase session
  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUserId(session?.user?.id || null);
    };

    getCurrentUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const {
    data: invoices = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['invoices', userId, role],
    queryFn: () => ProfileService.getInvoices(userId!, role),
    enabled: !!userId,
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
    queryKey: ['invoice', invoiceId],
    queryFn: () => ProfileService.getInvoice(invoiceId!),
    enabled: !!invoiceId,
  });

  return {
    invoice,
    isLoading,
    error,
  };
}
