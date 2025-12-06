// hooks/useInvoices.ts
// React Query hooks for invoice management

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { handleError } from '@/lib/errorHandler';
import { logger } from '@/lib/logger';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  professionalId: string;
  professional: {
    name: string;
    avatar: string;
    title: string;
  };
  date: string;
  dueDate: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  description: string;
  callDuration?: number;
  callDate?: string;
}

export interface InvoiceFilters {
  status?: Invoice['status'];
  searchQuery?: string;
}

/**
 * Get invoices for current user
 * TODO: Replace with actual service when backend is ready
 */
export function useInvoices(filters?: InvoiceFilters) {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: async (): Promise<Invoice[]> => {
      // TODO: Replace with actual API call
      // For now, return empty array (will be implemented when service is ready)
      logger.info('Fetching invoices', filters);
      return Promise.resolve([]);
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Download invoice
 * TODO: Implement when backend is ready
 */
export function useDownloadInvoice() {
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      // TODO: Implement actual API call
      logger.info('Download invoice', invoiceId);
      return { invoiceId, url: '' };
    },
    onError: (error) => {
      handleError(error, 'Failed to download invoice');
    },
  });
}

