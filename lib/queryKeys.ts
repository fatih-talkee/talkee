/**
 * Centralized Query Keys for React Query
 *
 * Benefits:
 * - Type-safe query keys
 * - Easy cache invalidation
 * - Consistent structure
 * - No typos/duplicates
 *
 * Usage:
 * ```ts
 * useQuery({
 *   queryKey: queryKeys.professionals.list(filters),
 *   queryFn: () => professionalsService.getProfessionals(filters),
 * });
 * ```
 */

import type {
  ProfessionalFilters,
  CallFilters,
  TransactionFilters,
} from '../types/database.types';

export const queryKeys = {
  // ============================================================================
  // AUTH & USER
  // ============================================================================
  auth: {
    all: ['auth'] as const,
    session: () => [...queryKeys.auth.all, 'session'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
  },

  users: {
    all: ['users'] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
    profile: (userId?: string) =>
      [...queryKeys.users.all, 'profile', userId] as const,
  },

  // ============================================================================
  // PROFESSIONALS
  // ============================================================================
  professionals: {
    all: ['professionals'] as const,
    lists: () => [...queryKeys.professionals.all, 'list'] as const,
    list: (filters?: ProfessionalFilters) =>
      [...queryKeys.professionals.lists(), { filters }] as const,
    details: () => [...queryKeys.professionals.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.professionals.details(), id] as const,
    featured: (limit?: number) =>
      [...queryKeys.professionals.all, 'featured', limit] as const,
    search: (query: string, filters?: ProfessionalFilters) =>
      [...queryKeys.professionals.all, 'search', query, { filters }] as const,
    availability: (id: string) =>
      [...queryKeys.professionals.detail(id), 'availability'] as const,
  },

  // ============================================================================
  // CATEGORIES
  // ============================================================================
  categories: {
    all: ['categories'] as const,
    lists: () => [...queryKeys.categories.all, 'list'] as const,
    list: () => [...queryKeys.categories.lists()] as const,
    details: () => [...queryKeys.categories.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.categories.details(), id] as const,
    bySlug: (slug: string) =>
      [...queryKeys.categories.all, 'slug', slug] as const,
  },

  // ============================================================================
  // FAVORITES
  // ============================================================================
  favorites: {
    all: ['favorites'] as const,
    lists: () => [...queryKeys.favorites.all, 'list'] as const,
    list: (userId?: string) =>
      [...queryKeys.favorites.lists(), userId] as const,
    check: (userId: string, professionalId: string) =>
      [...queryKeys.favorites.all, 'check', userId, professionalId] as const,
  },

  // ============================================================================
  // CALLS
  // ============================================================================
  calls: {
    all: ['calls'] as const,
    lists: () => [...queryKeys.calls.all, 'list'] as const,
    list: (filters?: CallFilters) =>
      [...queryKeys.calls.lists(), { filters }] as const,
    details: () => [...queryKeys.calls.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.calls.details(), id] as const,
    history: (userId?: string) =>
      [...queryKeys.calls.all, 'history', userId] as const,
  },

  // ============================================================================
  // APPOINTMENTS
  // ============================================================================
  appointments: {
    all: ['appointments'] as const,
    lists: () => [...queryKeys.appointments.all, 'list'] as const,
    list: (userId?: string) =>
      [...queryKeys.appointments.lists(), userId] as const,
    upcoming: (userId?: string) =>
      [...queryKeys.appointments.all, 'upcoming', userId] as const,
  },

  // ============================================================================
  // REVIEWS
  // ============================================================================
  reviews: {
    all: ['reviews'] as const,
    lists: () => [...queryKeys.reviews.all, 'list'] as const,
    listByProfessional: (professionalId: string) =>
      [...queryKeys.reviews.lists(), 'professional', professionalId] as const,
    listByUser: (userId: string) =>
      [...queryKeys.reviews.lists(), 'user', userId] as const,
    details: () => [...queryKeys.reviews.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.reviews.details(), id] as const,
    byCall: (callId: string) =>
      [...queryKeys.reviews.all, 'call', callId] as const,
    stats: (professionalId: string) =>
      [...queryKeys.reviews.all, 'stats', professionalId] as const,
  },

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================
  notifications: {
    all: ['notifications'] as const,
    lists: () => [...queryKeys.notifications.all, 'list'] as const,
    list: (userId?: string) =>
      [...queryKeys.notifications.lists(), userId] as const,
    unreadCount: (userId?: string) =>
      [...queryKeys.notifications.all, 'unreadCount', userId] as const,
    settings: (userId?: string) =>
      [...queryKeys.notifications.all, 'settings', userId] as const,
  },

  // ============================================================================
  // TRANSACTIONS
  // ============================================================================
  transactions: {
    all: ['transactions'] as const,
    lists: () => [...queryKeys.transactions.all, 'list'] as const,
    list: (userId?: string, filters?: TransactionFilters) =>
      [...queryKeys.transactions.lists(), userId, { filters }] as const,
    details: () => [...queryKeys.transactions.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.transactions.details(), id] as const,
  },

  // ============================================================================
  // WALLET
  // ============================================================================
  wallet: {
    all: ['wallet'] as const,
    balance: (userId?: string) =>
      [...queryKeys.wallet.all, 'balance', userId] as const,
  },

  // ============================================================================
  // PAYMENTS
  // ============================================================================
  payments: {
    all: ['payments'] as const,
    methods: (userId?: string) =>
      [...queryKeys.payments.all, 'methods', userId] as const,
    packages: () => [...queryKeys.payments.all, 'packages'] as const,
  },

  // ============================================================================
  // INVOICES
  // ============================================================================
  invoices: {
    all: ['invoices'] as const,
    lists: () => [...queryKeys.invoices.all, 'list'] as const,
    list: (
      userId?: string,
      filters?: { status?: string; searchQuery?: string }
    ) => [...queryKeys.invoices.lists(), userId, { filters }] as const,
    details: () => [...queryKeys.invoices.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.invoices.details(), id] as const,
  },

  // ============================================================================
  // CHARITIES
  // ============================================================================
  charities: {
    all: ['charities'] as const,
    lists: () => [...queryKeys.charities.all, 'list'] as const,
    list: () => [...queryKeys.charities.lists()] as const,
    details: () => [...queryKeys.charities.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.charities.details(), id] as const,
  },

  // ============================================================================
  // DONATIONS
  // ============================================================================
  donations: {
    all: ['donations'] as const,
    lists: () => [...queryKeys.donations.all, 'list'] as const,
    list: (userId?: string, period?: number) =>
      [...queryKeys.donations.lists(), userId, period] as const,
  },

  // ============================================================================
  // CHARITY SETTINGS
  // ============================================================================
  charitySettings: {
    all: ['charitySettings'] as const,
    settings: (userId?: string) =>
      [...queryKeys.charitySettings.all, 'settings', userId] as const,
    allocations: (userId?: string) =>
      [...queryKeys.charitySettings.all, 'allocations', userId] as const,
  },

  // ============================================================================
  // BLOCKED USERS
  // ============================================================================
  blockedUsers: {
    all: ['blockedUsers'] as const,
    lists: () => [...queryKeys.blockedUsers.all, 'list'] as const,
    list: (userId?: string) =>
      [...queryKeys.blockedUsers.lists(), userId] as const,
  },

  // ============================================================================
  // SETTINGS
  // ============================================================================
  settings: {
    all: ['settings'] as const,
    account: (userId?: string) =>
      [...queryKeys.settings.all, 'account', userId] as const,
    privacy: (userId?: string) =>
      [...queryKeys.settings.all, 'privacy', userId] as const,
    language: () => [...queryKeys.settings.all, 'language'] as const,
    theme: () => [...queryKeys.settings.all, 'theme'] as const,
  },
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Invalidate all queries for a specific resource
 */
export function invalidateResource(
  queryClient: any,
  resource: keyof typeof queryKeys
) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys[resource].all,
  });
}

/**
 * Invalidate all user-related queries
 */
export function invalidateUserQueries(queryClient: any, userId?: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.favorites.list(userId),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.calls.history(userId),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.notifications.list(userId),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.transactions.list(userId),
    }),
  ]);
}

/**
 * Invalidate all professional-related queries
 */
export function invalidateProfessionalQueries(
  queryClient: any,
  professionalId: string
) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.professionals.detail(professionalId),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.reviews.listByProfessional(professionalId),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.reviews.stats(professionalId),
    }),
  ]);
}

/**
 * Prefetch related queries
 */
export async function prefetchProfessionalDetails(
  queryClient: any,
  professionalId: string,
  professionalsService: any
) {
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.professionals.detail(professionalId),
      queryFn: () => professionalsService.getProfessional(professionalId),
      staleTime: 5 * 60 * 1000, // 5 minutes
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.reviews.listByProfessional(professionalId),
      queryFn: () =>
        professionalsService.getProfessionalReviews?.(professionalId),
      staleTime: 5 * 60 * 1000,
    }),
  ]);
}
