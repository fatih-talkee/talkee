import { useQuery } from '@tanstack/react-query';
import { ProfileService } from '@/services/supabase/profile.service';
import { usersService } from '@/services/supabase';
import { useEffect, useState } from 'react';

export function useInvoices(role: 'caller' | 'professional' = 'caller') {
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user from users table (not auth_id)
  useEffect(() => {
    const getCurrentUser = async () => {
      const user = await usersService.getCurrentUser();
      setUserId(user?.id || null);
    };

    getCurrentUser();
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
