/**
 * Centralized Cache Configuration
 *
 * Best Practice: Cache strategy should be defined in hooks, not in services or pages.
 * Services only handle data fetching, hooks manage caching with React Query.
 *
 * Cache Strategy:
 * - staleTime: How long data is considered fresh (no refetch)
 * - gcTime: How long unused data stays in cache before garbage collection
 */

// Time constants (in milliseconds)
export const CACHE_TIME = {
  SECOND: 1000,
  MINUTE: 1000 * 60,
  HOUR: 1000 * 60 * 60,
  DAY: 1000 * 60 * 60 * 24,
} as const;

/**
 * Cache configuration by data type
 *
 * Strategy:
 * - Static/rarely changing data: Long staleTime (10-30 min)
 * - Frequently changing data: Short staleTime (30 sec - 2 min)
 * - User-specific data: Medium staleTime (2-5 min)
 * - Financial data: Short staleTime (1-2 min) for accuracy
 */
export const CACHE_CONFIG = {
  // Static data - rarely changes
  CATEGORIES: {
    staleTime: 10 * CACHE_TIME.MINUTE, // 10 minutes
    gcTime: 30 * CACHE_TIME.MINUTE, // 30 minutes
  },

  // Professional data
  PROFESSIONALS_LIST: {
    staleTime: 2 * CACHE_TIME.MINUTE, // 2 minutes
    gcTime: 10 * CACHE_TIME.MINUTE, // 10 minutes
  },
  PROFESSIONAL_DETAIL: {
    staleTime: 5 * CACHE_TIME.MINUTE, // 5 minutes
    gcTime: 15 * CACHE_TIME.MINUTE, // 15 minutes
  },
  PROFESSIONAL_AVAILABLE: {
    staleTime: 1 * CACHE_TIME.MINUTE, // 1 minute (availability changes frequently)
    gcTime: 5 * CACHE_TIME.MINUTE, // 5 minutes
  },
  PROFESSIONAL_FEATURED: {
    staleTime: 5 * CACHE_TIME.MINUTE, // 5 minutes
    gcTime: 15 * CACHE_TIME.MINUTE, // 15 minutes
  },
  PROFESSIONAL_SEARCH: {
    staleTime: 1 * CACHE_TIME.MINUTE, // 1 minute (search results should be fresh)
    gcTime: 5 * CACHE_TIME.MINUTE, // 5 minutes
  },

  // User data
  USER_PROFILE: {
    staleTime: 5 * CACHE_TIME.MINUTE, // 5 minutes
    gcTime: 15 * CACHE_TIME.MINUTE, // 15 minutes
  },
  USER_CURRENT: {
    staleTime: 5 * CACHE_TIME.MINUTE, // 5 minutes
    gcTime: 15 * CACHE_TIME.MINUTE, // 15 minutes
  },

  // User-specific data
  FAVORITES: {
    staleTime: 2 * CACHE_TIME.MINUTE, // 2 minutes
    gcTime: 10 * CACHE_TIME.MINUTE, // 10 minutes
  },
  BLOCKED_USERS: {
    staleTime: 5 * CACHE_TIME.MINUTE, // 5 minutes
    gcTime: 30 * CACHE_TIME.MINUTE, // 30 minutes
  },

  // Financial data - needs to be fresh
  WALLET_BALANCE: {
    staleTime: 1 * CACHE_TIME.MINUTE, // 1 minute
    gcTime: 5 * CACHE_TIME.MINUTE, // 5 minutes
  },
  TRANSACTIONS: {
    staleTime: 30 * CACHE_TIME.SECOND, // 30 seconds
    gcTime: 2 * CACHE_TIME.MINUTE, // 2 minutes
  },
  INVOICES: {
    staleTime: 2 * CACHE_TIME.MINUTE, // 2 minutes
    gcTime: 10 * CACHE_TIME.MINUTE, // 10 minutes
  },
  EARNINGS: {
    staleTime: 5 * CACHE_TIME.MINUTE, // 5 minutes
    gcTime: 30 * CACHE_TIME.MINUTE, // 30 minutes
  },
  WITHDRAWALS: {
    staleTime: 2 * CACHE_TIME.MINUTE, // 2 minutes
    gcTime: 10 * CACHE_TIME.MINUTE, // 10 minutes
  },

  // Real-time data - very short cache
  NOTIFICATIONS: {
    staleTime: 1 * CACHE_TIME.MINUTE, // 1 minute
    gcTime: 5 * CACHE_TIME.MINUTE, // 5 minutes
  },
  NOTIFICATIONS_UNREAD_COUNT: {
    staleTime: 30 * CACHE_TIME.SECOND, // 30 seconds
    gcTime: 2 * CACHE_TIME.MINUTE, // 2 minutes
  },

  // Feed data
  FEEDS: {
    staleTime: 30 * CACHE_TIME.SECOND, // 30 seconds
    gcTime: 5 * CACHE_TIME.MINUTE, // 5 minutes
  },
  FEED_DETAIL: {
    staleTime: 1 * CACHE_TIME.MINUTE, // 1 minute
    gcTime: 5 * CACHE_TIME.MINUTE, // 5 minutes
  },
  FEED_COUNT: {
    staleTime: 5 * CACHE_TIME.MINUTE, // 5 minutes
    gcTime: 10 * CACHE_TIME.MINUTE, // 10 minutes
  },

  // Call data
  CALLS_HISTORY: {
    staleTime: 2 * CACHE_TIME.MINUTE, // 2 minutes
    gcTime: 10 * CACHE_TIME.MINUTE, // 10 minutes
  },
  CALL_DETAIL: {
    staleTime: 5 * CACHE_TIME.MINUTE, // 5 minutes
    gcTime: 15 * CACHE_TIME.MINUTE, // 15 minutes
  },

  // Appointments
  APPOINTMENTS: {
    staleTime: 1 * CACHE_TIME.MINUTE, // 1 minute
    gcTime: 5 * CACHE_TIME.MINUTE, // 5 minutes
  },

  // Settings
  SETTINGS: {
    staleTime: 5 * CACHE_TIME.MINUTE, // 5 minutes
    gcTime: 30 * CACHE_TIME.MINUTE, // 30 minutes
  },
  NOTIFICATION_SETTINGS: {
    staleTime: 5 * CACHE_TIME.MINUTE, // 5 minutes
    gcTime: 30 * CACHE_TIME.MINUTE, // 30 minutes
  },

  // Promotions
  PROMOTIONS: {
    staleTime: 5 * CACHE_TIME.MINUTE, // 5 minutes
    gcTime: 15 * CACHE_TIME.MINUTE, // 15 minutes
  },
  PROMOTION_DETAIL: {
    staleTime: 10 * CACHE_TIME.MINUTE, // 10 minutes
    gcTime: 20 * CACHE_TIME.MINUTE, // 20 minutes
  },

  // Bank accounts
  BANK_ACCOUNTS: {
    staleTime: 5 * CACHE_TIME.MINUTE, // 5 minutes
    gcTime: 30 * CACHE_TIME.MINUTE, // 30 minutes
  },

  // Tax information
  TAX_INFORMATION: {
    staleTime: 10 * CACHE_TIME.MINUTE, // 10 minutes
    gcTime: 60 * CACHE_TIME.MINUTE, // 1 hour
  },

  // Currency format
  CURRENCY_FORMAT: {
    staleTime: 10 * CACHE_TIME.MINUTE, // 10 minutes
    gcTime: 60 * CACHE_TIME.MINUTE, // 1 hour
  },

  // Charity & Donations
  CHARITY_ORGANIZATIONS: {
    staleTime: 30 * CACHE_TIME.MINUTE, // 30 minutes (organizations don't change often)
    gcTime: 60 * CACHE_TIME.MINUTE, // 1 hour
  },
  DONATION_HISTORY: {
    staleTime: 2 * CACHE_TIME.MINUTE, // 2 minutes
    gcTime: 10 * CACHE_TIME.MINUTE, // 10 minutes
  },
  DONATION_ORGANIZATIONS: {
    staleTime: 30 * CACHE_TIME.MINUTE, // 30 minutes (organizations don't change often)
    gcTime: 60 * CACHE_TIME.MINUTE, // 1 hour
  },

  // Payment & Credits
  SAVED_CARDS: {
    staleTime: 5 * CACHE_TIME.MINUTE, // 5 minutes
    gcTime: 30 * CACHE_TIME.MINUTE, // 30 minutes
  },
  CREDIT_PACKAGES: {
    staleTime: 60 * CACHE_TIME.MINUTE, // 1 hour (packages don't change often)
    gcTime: 24 * CACHE_TIME.HOUR, // 24 hours
  },

  // Professional Profile Extensions
  PROFESSIONAL_AVAILABILITY: {
    staleTime: 10 * CACHE_TIME.MINUTE, // 10 minutes
    gcTime: 30 * CACHE_TIME.MINUTE, // 30 minutes
  },
  PROFESSIONAL_POSTS: {
    staleTime: 2 * CACHE_TIME.MINUTE, // 2 minutes (posts can change)
    gcTime: 10 * CACHE_TIME.MINUTE, // 10 minutes
  },
  PROFESSIONAL_CHARITY_SETTINGS: {
    staleTime: 10 * CACHE_TIME.MINUTE, // 10 minutes
    gcTime: 30 * CACHE_TIME.MINUTE, // 30 minutes
  },

  // Reviews
  REVIEWS: {
    staleTime: 5 * CACHE_TIME.MINUTE, // 5 minutes
    gcTime: 10 * CACHE_TIME.MINUTE, // 10 minutes
  },
  USER_REVIEWS: {
    staleTime: 2 * CACHE_TIME.MINUTE, // 2 minutes
    gcTime: 10 * CACHE_TIME.MINUTE, // 10 minutes
  },

  // Settings
  ACCOUNT_SETTINGS: {
    staleTime: 5 * CACHE_TIME.MINUTE, // 5 minutes
    gcTime: 30 * CACHE_TIME.MINUTE, // 30 minutes
  },
  AVAILABILITY_SETTINGS: {
    staleTime: 5 * CACHE_TIME.MINUTE, // 5 minutes
    gcTime: 30 * CACHE_TIME.MINUTE, // 30 minutes
  },
} as const;

/**
 * Default cache configuration for queries without specific config
 */
export const DEFAULT_CACHE_CONFIG = {
  staleTime: 2 * CACHE_TIME.MINUTE, // 2 minutes
  gcTime: 10 * CACHE_TIME.MINUTE, // 10 minutes
} as const;
