/**
 * IMPROVED DATABASE TYPES - TALKEE APP
 * Enhanced with enums, better type safety, and consistent structure
 */

// ============================================================================
// ENUMS (For better type safety and autocomplete)
// ============================================================================

export enum UserRole {
  USER = 'user',
  PROFESSIONAL = 'professional',
  ADMIN = 'admin',
}

export enum CallStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  MISSED = 'missed',
}

export enum CallType {
  VOICE = 'voice',
  VIDEO = 'video',
}

export enum NotificationType {
  CALL_REQUEST = 'call_request',
  CALL_STARTED = 'call_started',
  CALL_ENDED = 'call_ended',
  REVIEW = 'review',
  PAYMENT = 'payment',
  MESSAGE = 'message',
  SYSTEM = 'system',
}

export enum TransactionType {
  INCOME = 'income',
  EXPENSES = 'expenses',
  CREDIT_PURCHASE = 'credit_purchase',
  CALL_EARNING = 'call_earning',
  CALL_EXPENSE = 'call_expense',
}

export enum TransactionStatus {
  COMPLETED = 'completed',
  PENDING = 'pending',
  FAILED = 'failed',
}

export enum Currency {
  USD = 'USD',
  TRY = 'TRY',
  EUR = 'EUR',
}

export enum CharityCategory {
  EDUCATION = 'education',
  HEALTH = 'health',
  ENVIRONMENT = 'environment',
  POVERTY = 'poverty',
  ANIMALS = 'animals',
  HUMAN_RIGHTS = 'human_rights',
  OTHER = 'other',
}

// ============================================================================
// BASE DATABASE TYPES (Direct from DB schema)
// ============================================================================

/**
 * Users table - Core user entity
 */
export interface User {
  id: string;
  auth_id: string;
  email: string;
  name: string;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  wallet_balance: number;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface UserInsert
  extends Omit<
    User,
    'id' | 'created_at' | 'updated_at' | 'wallet_balance' | 'role'
  > {
  id?: string;
  wallet_balance?: number;
  role?: UserRole;
}

export interface UserUpdate
  extends Partial<
    Omit<User, 'id' | 'auth_id' | 'email' | 'created_at' | 'updated_at'>
  > {}

/**
 * Categories table - Professional categories
 */
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Professionals table - Professional profiles
 */
export interface Professional {
  id: string;
  user_id: string;
  category_id: string;
  bio: string;
  expertise_tags: string[];
  languages: string[];
  rate_per_minute: number;
  is_available: boolean;
  is_verified: boolean;
  average_rating: number;
  total_calls: number;
  total_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalInsert
  extends Omit<
    Professional,
    | 'id'
    | 'average_rating'
    | 'total_calls'
    | 'total_minutes'
    | 'created_at'
    | 'updated_at'
    | 'is_available'
    | 'is_verified'
  > {
  id?: string;
  is_available?: boolean;
  is_verified?: boolean;
  average_rating?: number;
  total_calls?: number;
  total_minutes?: number;
}

export interface ProfessionalUpdate
  extends Partial<
    Omit<Professional, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  > {}

/**
 * Favorites table - User favorites
 */
export interface Favorite {
  id: string;
  user_id: string;
  professional_id: string;
  created_at: string;
}

export interface FavoriteInsert extends Omit<Favorite, 'id' | 'created_at'> {
  id?: string;
}

/**
 * Calls table - Call records
 */
export interface Call {
  id: string;
  caller_id: string;
  professional_id: string;
  status: CallStatus;
  call_type: CallType;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number;
  rate_per_minute: number;
  total_cost: number;
  rating: number | null;
  notes: string | null;
  cancelled_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CallInsert
  extends Omit<
    Call,
    | 'id'
    | 'created_at'
    | 'updated_at'
    | 'status'
    | 'call_type'
    | 'duration_minutes'
    | 'total_cost'
  > {
  id?: string;
  status?: CallStatus;
  call_type?: CallType;
  duration_minutes?: number;
  total_cost?: number;
}

export interface CallUpdate
  extends Partial<
    Omit<
      Call,
      'id' | 'caller_id' | 'professional_id' | 'created_at' | 'updated_at'
    >
  > {}

/**
 * Reviews table - Call reviews
 */
export interface Review {
  id: string;
  call_id: string;
  professional_id: string;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewInsert
  extends Omit<Review, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
}

export interface ReviewUpdate
  extends Partial<
    Omit<
      Review,
      | 'id'
      | 'call_id'
      | 'professional_id'
      | 'reviewer_id'
      | 'created_at'
      | 'updated_at'
    >
  > {}

/**
 * Notifications table - User notifications
 */
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export interface NotificationInsert
  extends Omit<Notification, 'id' | 'created_at' | 'data' | 'is_read'> {
  id?: string;
  data?: Record<string, any>;
  is_read?: boolean;
}

export interface NotificationUpdate
  extends Partial<Omit<Notification, 'id' | 'user_id' | 'created_at'>> {}

/**
 * Transactions table - Financial transactions
 */
export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  description: string;
  call_id: string | null;
  status: TransactionStatus;
  created_at: string;
}

export interface TransactionInsert
  extends Omit<Transaction, 'id' | 'created_at' | 'status'> {
  id?: string;
  status?: TransactionStatus;
}

/**
 * Charities table - Charity organizations
 */
export interface Charity {
  id: string;
  name: string;
  short_description: string;
  full_description: string;
  logo: string;
  category: CharityCategory;
  country: string;
  website: string | null;
  verified: boolean;
  featured_image: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Donations table - Donation records
 */
export interface Donation {
  id: string;
  user_id: string;
  call_id: string;
  charity_id: string;
  amount: number;
  currency: Currency;
  transaction_id: string | null;
  created_at: string;
}

export interface DonationInsert
  extends Omit<Donation, 'id' | 'created_at' | 'currency'> {
  id?: string;
  currency?: Currency;
}

/**
 * User charity settings table
 */
export interface UserCharitySetting {
  id: string;
  user_id: string;
  enabled: boolean;
  show_public_badge: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCharitySettingInsert
  extends Omit<
    UserCharitySetting,
    'id' | 'created_at' | 'updated_at' | 'enabled' | 'show_public_badge'
  > {
  id?: string;
  enabled?: boolean;
  show_public_badge?: boolean;
}

export interface UserCharitySettingUpdate
  extends Partial<
    Omit<UserCharitySetting, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  > {}

/**
 * User charity allocations table
 */
export interface UserCharityAllocation {
  id: string;
  user_id: string;
  charity_id: string;
  percentage: number;
  created_at: string;
  updated_at: string;
}

export interface UserCharityAllocationInsert
  extends Omit<UserCharityAllocation, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
}

export interface UserCharityAllocationUpdate
  extends Partial<
    Omit<
      UserCharityAllocation,
      'id' | 'user_id' | 'charity_id' | 'created_at' | 'updated_at'
    >
  > {}

/**
 * Blocked users table
 */
export interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface BlockedUserInsert
  extends Omit<BlockedUser, 'id' | 'created_at'> {
  id?: string;
}

// ============================================================================
// JOINED/EXTENDED TYPES (For queries with relations)
// ============================================================================

/**
 * Professional with joined user and category data
 */
export interface ProfessionalWithRelations extends Professional {
  users?: Pick<User, 'id' | 'name' | 'avatar_url'>;
  categories?: Pick<Category, 'id' | 'name' | 'slug' | 'icon_name'>;
  reviews?: Array<ReviewWithUser>;
}

/**
 * Review with reviewer info
 */
export interface ReviewWithUser extends Review {
  users?: Pick<User, 'id' | 'name' | 'avatar_url'>;
}

/**
 * Call with caller and professional info
 */
export interface CallWithRelations extends Call {
  caller?: Pick<User, 'id' | 'name' | 'avatar_url'>;
  professional?: {
    id: string;
    user_id: string;
    rate_per_minute: number;
    users?: Pick<User, 'id' | 'name' | 'avatar_url'>;
    categories?: Pick<Category, 'id' | 'name' | 'icon_name'>;
  };
}

/**
 * Favorite with professional details
 */
export interface FavoriteWithProfessional extends Favorite {
  professional?: ProfessionalWithRelations;
}

/**
 * Donation with charity info
 */
export interface DonationWithCharity extends Donation {
  charity?: Pick<Charity, 'id' | 'name' | 'logo'>;
}

// ============================================================================
// FILTER & QUERY TYPES
// ============================================================================

export interface ProfessionalFilters {
  categoryId?: string;
  minRating?: number;
  maxRatePerMinute?: number;
  isAvailable?: boolean;
  isVerified?: boolean;
  languages?: string[];
  searchQuery?: string;
}

export interface CallFilters {
  status?: CallStatus;
  callType?: CallType;
  startDate?: string;
  endDate?: string;
}

export interface TransactionFilters {
  type?: TransactionType | 'all';
  status?: TransactionStatus;
  startDate?: string;
  endDate?: string;
}

export interface ReviewFilters {
  minRating?: number;
  professionalId?: string;
  reviewerId?: string;
}

// ============================================================================
// PAGINATION TYPES
// ============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================================================
// NOTIFICATION SETTINGS (UI Types)
// ============================================================================

export interface NotificationSettings {
  push_enabled: boolean;
  call_notifications: boolean;
  review_notifications: boolean;
  payment_notifications: boolean;
  message_notifications: boolean;
  promotional_notifications: boolean;
}

// ============================================================================
// LEGACY TYPES (For backward compatibility - can be removed later)
// ============================================================================

/**
 * @deprecated Use Transaction instead
 */
export interface WalletTransaction extends Transaction {
  timestamp?: string; // Alias for created_at
  professionalId?: string; // For UI display
  professional?: ProfessionalWithRelations;
  callerId?: string;
  caller?: ProfessionalWithRelations;
  duration?: number;
}

/**
 * @deprecated Use CallWithRelations instead
 */
export interface CallHistory {
  id: string;
  professionalId: string;
  professional?: ProfessionalWithRelations;
  duration: number;
  cost: number;
  date: string;
  type: CallType;
  status: 'completed' | 'missed' | 'cancelled';
  direction?: 'incoming' | 'outgoing';
  isBlocked?: boolean;
}

/**
 * @deprecated Use Donation instead
 */
export interface DonationRecord {
  id: string;
  callId: string;
  charityId: string;
  charityName: string;
  amount: number;
  currency: Currency;
  date: Date | string;
  callDuration: number;
  grossEarnings: number;
  donationPercentage: number;
}

// ============================================================================
// UI COMPONENT TYPES (Keep as is)
// ============================================================================

export interface CharityOrganization extends Charity {}

export interface SelectedCharity {
  id: string;
  name: string;
  logo: string;
  percentage: number;
}

export interface CharitySettings {
  enabled: boolean;
  showPublicBadge: boolean;
  selectedCharities: SelectedCharity[];
  donationPercentage?: number; // Legacy
}

export interface MenuSection {
  title: string;
  items: {
    id: string;
    label: string;
    icon: React.ReactNode;
    onPress: () => void;
    badge?: string;
  }[];
}

export interface FilterState {
  priceRange: [number, number];
  availability: 'all' | 'online' | 'offline' | 'quick-response';
  languages: string[];
  categories: string[];
  minimumCallTime: number;
  verifiedOnly: boolean;
  minimumSuccessfulCalls: number;
}

export interface Promotion {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  ctaText: string;
  gradient: string[];
}

// ... (Keep other UI types as is)

// ============================================================================
// TYPE GUARDS (For runtime type checking)
// ============================================================================

export function isCallStatus(value: string): value is CallStatus {
  return Object.values(CallStatus).includes(value as CallStatus);
}

export function isCallType(value: string): value is CallType {
  return Object.values(CallType).includes(value as CallType);
}

export function isUserRole(value: string): value is UserRole {
  return Object.values(UserRole).includes(value as UserRole);
}

export function isNotificationType(value: string): value is NotificationType {
  return Object.values(NotificationType).includes(value as NotificationType);
}
