// hooks/usePayments.ts
// React Query hooks for payment and credit purchase management

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { handleError } from '@/lib/errorHandler';
import { logger } from '@/lib/logger';
import type { SavedCard, PurchaseData, CreditPackage } from '@/types';

/**
 * Get saved payment cards
 */
export function useSavedCards() {
  return useQuery({
    queryKey: ['saved-cards'],
    queryFn: async (): Promise<SavedCard[]> => {
      try {
        // TODO: Replace with actual API call
        logger.info('Fetching saved cards');
        return [];
      } catch (error) {
        handleError(error, 'Failed to fetch saved cards');
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Add a new payment card
 */
export function useAddCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cardData: Omit<SavedCard, 'id'>) => {
      try {
        // TODO: Replace with actual API call
        logger.info('Adding payment card', cardData);
        return {
          id: Date.now().toString(),
          ...cardData,
        };
      } catch (error) {
        handleError(error, 'Failed to add payment card');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-cards'] });
    },
  });
}

/**
 * Delete a payment card
 */
export function useDeleteCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cardId: string) => {
      try {
        // TODO: Replace with actual API call
        logger.info('Deleting payment card', { cardId });
        return { success: true };
      } catch (error) {
        handleError(error, 'Failed to delete payment card');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-cards'] });
    },
  });
}

/**
 * Get credit packages
 */
export function useCreditPackages() {
  return useQuery({
    queryKey: ['credit-packages'],
    queryFn: async (): Promise<CreditPackage[]> => {
      try {
        // TODO: Replace with actual API call
        logger.info('Fetching credit packages');
        return [
          { id: '1', amount: 50, price: 49.99 },
          { id: '2', amount: 100, price: 89.99, bonus: 10 },
          { id: '3', amount: 250, price: 199.99, bonus: 50, popular: true },
          { id: '4', amount: 500, price: 349.99, bonus: 150 },
        ];
      } catch (error) {
        handleError(error, 'Failed to fetch credit packages');
        throw error;
      }
    },
    staleTime: 1000 * 60 * 60, // 1 hour (packages don't change often)
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

/**
 * Process credit purchase
 */
export function usePurchaseCredits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (purchaseData: PurchaseData) => {
      try {
        // TODO: Replace with actual API call
        logger.info('Processing credit purchase', purchaseData);
        return {
          success: true,
          transactionId: Date.now().toString(),
          credits: purchaseData.credits,
          amount: purchaseData.price,
        };
      } catch (error) {
        handleError(error, 'Failed to process credit purchase');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet', 'balance'] });
      queryClient.invalidateQueries({ queryKey: ['wallet', 'transactions'] });
    },
  });
}

