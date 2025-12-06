-- ============================================================================
-- TALKEE DATABASE SCHEMA - SUPABASE MIGRATION
-- ============================================================================
-- Version: 1.0.0
-- Created: 2025-12-06
-- Database: PostgreSQL (Supabase)
-- 
-- This script creates the complete database schema for the Talkee app
-- including all tables, relationships, indexes, and Row Level Security policies
-- ============================================================================

-- ============================================================================
-- SETUP: Enable Required Extensions
-- ============================================================================

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Full-text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- TABLE 1: USERS
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID UNIQUE NOT NULL, -- Supabase Auth user ID
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    bio TEXT,
    wallet_balance DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    role TEXT DEFAULT 'user' NOT NULL CHECK (role IN ('user', 'professional', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for users
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- TABLE 2: CATEGORIES
-- ============================================================================

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon_name TEXT NOT NULL, -- Lucide icon name
    is_active BOOLEAN DEFAULT true NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for categories
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_active ON categories(is_active);
CREATE INDEX idx_categories_sort_order ON categories(sort_order);

-- ============================================================================
-- TABLE 3: PROFESSIONALS
-- ============================================================================

CREATE TABLE professionals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    bio TEXT NOT NULL,
    expertise_tags TEXT[] DEFAULT '{}' NOT NULL,
    languages TEXT[] DEFAULT '{}' NOT NULL,
    rate_per_minute DECIMAL(10, 2) NOT NULL CHECK (rate_per_minute >= 0),
    is_available BOOLEAN DEFAULT true NOT NULL,
    is_verified BOOLEAN DEFAULT false NOT NULL,
    average_rating DECIMAL(3, 2) DEFAULT 0.00 NOT NULL CHECK (average_rating >= 0 AND average_rating <= 5),
    total_calls INTEGER DEFAULT 0 NOT NULL CHECK (total_calls >= 0),
    total_minutes INTEGER DEFAULT 0 NOT NULL CHECK (total_minutes >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for professionals
CREATE INDEX idx_professionals_user_id ON professionals(user_id);
CREATE INDEX idx_professionals_category_id ON professionals(category_id);
CREATE INDEX idx_professionals_is_available ON professionals(is_available);
CREATE INDEX idx_professionals_is_verified ON professionals(is_verified);
CREATE INDEX idx_professionals_rating ON professionals(average_rating DESC);
CREATE INDEX idx_professionals_rate ON professionals(rate_per_minute);

-- Composite indexes for common queries
CREATE INDEX idx_professionals_search ON professionals(category_id, is_available, average_rating DESC);
CREATE INDEX idx_professionals_languages ON professionals USING GIN(languages);
CREATE INDEX idx_professionals_expertise ON professionals USING GIN(expertise_tags);

-- Full-text search on bio
CREATE INDEX idx_professionals_bio_search ON professionals USING GIN(to_tsvector('english', bio));

-- ============================================================================
-- TABLE 4: FAVORITES
-- ============================================================================

CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Ensure unique favorites per user
    UNIQUE(user_id, professional_id)
);

-- Indexes for favorites
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_professional_id ON favorites(professional_id);

-- ============================================================================
-- TABLE 5: CALLS
-- ============================================================================

CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    caller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE RESTRICT,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'active', 'completed', 'cancelled', 'missed')),
    call_type TEXT DEFAULT 'voice' NOT NULL CHECK (call_type IN ('voice', 'video')),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER DEFAULT 0 NOT NULL CHECK (duration_minutes >= 0),
    rate_per_minute DECIMAL(10, 2) NOT NULL CHECK (rate_per_minute >= 0),
    total_cost DECIMAL(10, 2) DEFAULT 0.00 NOT NULL CHECK (total_cost >= 0),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,
    cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for calls
CREATE INDEX idx_calls_caller_id ON calls(caller_id);
CREATE INDEX idx_calls_professional_id ON calls(professional_id);
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_calls_start_time ON calls(start_time DESC);
CREATE INDEX idx_calls_created_at ON calls(created_at DESC);

-- ============================================================================
-- TABLE 6: REVIEWS
-- ============================================================================

CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID UNIQUE NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Ensure one review per call
    UNIQUE(call_id)
);

-- Indexes for reviews
CREATE INDEX idx_reviews_professional_id ON reviews(professional_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX idx_reviews_rating ON reviews(rating DESC);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

-- ============================================================================
-- TABLE 7: NOTIFICATIONS
-- ============================================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('call_request', 'call_started', 'call_ended', 'review', 'payment', 'message', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- ============================================================================
-- TABLE 8: TRANSACTIONS
-- ============================================================================

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expenses', 'credit_purchase', 'call_earning', 'call_expense')),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'completed' NOT NULL CHECK (status IN ('completed', 'pending', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for transactions
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_call_id ON transactions(call_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_user_type ON transactions(user_id, type);

-- ============================================================================
-- TABLE 9: CHARITIES
-- ============================================================================

CREATE TABLE charities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    short_description TEXT NOT NULL,
    full_description TEXT NOT NULL,
    logo TEXT NOT NULL, -- URL to logo image
    category TEXT NOT NULL CHECK (category IN ('education', 'health', 'environment', 'poverty', 'animals', 'human_rights', 'other')),
    country TEXT NOT NULL,
    website TEXT,
    verified BOOLEAN DEFAULT false NOT NULL,
    featured_image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for charities
CREATE INDEX idx_charities_category ON charities(category);
CREATE INDEX idx_charities_verified ON charities(verified);
CREATE INDEX idx_charities_name ON charities(name);

-- ============================================================================
-- TABLE 10: DONATIONS
-- ============================================================================

CREATE TABLE donations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    charity_id UUID NOT NULL REFERENCES charities(id) ON DELETE RESTRICT,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    currency TEXT DEFAULT 'USD' NOT NULL CHECK (currency IN ('USD', 'TRY', 'EUR')),
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for donations
CREATE INDEX idx_donations_user_id ON donations(user_id);
CREATE INDEX idx_donations_call_id ON donations(call_id);
CREATE INDEX idx_donations_charity_id ON donations(charity_id);
CREATE INDEX idx_donations_created_at ON donations(created_at DESC);

-- ============================================================================
-- TABLE 11: USER_CHARITY_SETTINGS
-- ============================================================================

CREATE TABLE user_charity_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT false NOT NULL,
    show_public_badge BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for user_charity_settings
CREATE INDEX idx_user_charity_settings_user_id ON user_charity_settings(user_id);

-- ============================================================================
-- TABLE 12: USER_CHARITY_ALLOCATIONS
-- ============================================================================

CREATE TABLE user_charity_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    charity_id UUID NOT NULL REFERENCES charities(id) ON DELETE CASCADE,
    percentage INTEGER NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Ensure unique charity per user
    UNIQUE(user_id, charity_id)
);

-- Indexes for user_charity_allocations
CREATE INDEX idx_user_charity_allocations_user_id ON user_charity_allocations(user_id);
CREATE INDEX idx_user_charity_allocations_charity_id ON user_charity_allocations(charity_id);

-- ============================================================================
-- TABLE 13: BLOCKED_USERS
-- ============================================================================

CREATE TABLE blocked_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Ensure unique blocks
    UNIQUE(blocker_id, blocked_id),
    
    -- Prevent self-blocking
    CHECK (blocker_id != blocked_id)
);

-- Indexes for blocked_users
CREATE INDEX idx_blocked_users_blocker_id ON blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked_id ON blocked_users(blocked_id);

-- ============================================================================
-- FUNCTIONS: Auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_professionals_updated_at BEFORE UPDATE ON professionals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON calls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_charities_updated_at BEFORE UPDATE ON charities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_charity_settings_updated_at BEFORE UPDATE ON user_charity_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_charity_allocations_updated_at BEFORE UPDATE ON user_charity_allocations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTIONS: Update professional stats after review
-- ============================================================================

CREATE OR REPLACE FUNCTION update_professional_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE professionals
    SET average_rating = (
        SELECT COALESCE(AVG(rating), 0)::NUMERIC(3,2)
        FROM reviews
        WHERE professional_id = NEW.professional_id
    )
    WHERE id = NEW.professional_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_professional_rating_trigger
AFTER INSERT OR UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_professional_rating();

-- ============================================================================
-- FUNCTIONS: Update professional stats after call
-- ============================================================================

CREATE OR REPLACE FUNCTION update_professional_stats_after_call()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
        UPDATE professionals
        SET 
            total_calls = total_calls + 1,
            total_minutes = total_minutes + NEW.duration_minutes
        WHERE id = NEW.professional_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_professional_stats_trigger
AFTER INSERT OR UPDATE ON calls
FOR EACH ROW EXECUTE FUNCTION update_professional_stats_after_call();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE charities ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_charity_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_charity_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: USERS
-- ============================================================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
    ON users FOR SELECT
    USING (auth.uid() = auth_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (auth.uid() = auth_id);

-- Anyone can read public user info (for profiles, calls, etc.)
CREATE POLICY "Public user info readable"
    ON users FOR SELECT
    USING (true);

-- ============================================================================
-- RLS POLICIES: CATEGORIES
-- ============================================================================

-- Everyone can read active categories
CREATE POLICY "Anyone can read active categories"
    ON categories FOR SELECT
    USING (is_active = true);

-- ============================================================================
-- RLS POLICIES: PROFESSIONALS
-- ============================================================================

-- Everyone can read professionals
CREATE POLICY "Anyone can read professionals"
    ON professionals FOR SELECT
    USING (true);

-- Professionals can update their own profile
CREATE POLICY "Professionals can update own profile"
    ON professionals FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT auth_id FROM users WHERE id = professionals.user_id
        )
    );

-- ============================================================================
-- RLS POLICIES: FAVORITES
-- ============================================================================

-- Users can read their own favorites
CREATE POLICY "Users can read own favorites"
    ON favorites FOR SELECT
    USING (
        user_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid()
        )
    );

-- Users can insert their own favorites
CREATE POLICY "Users can insert own favorites"
    ON favorites FOR INSERT
    WITH CHECK (
        user_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid()
        )
    );

-- Users can delete their own favorites
CREATE POLICY "Users can delete own favorites"
    ON favorites FOR DELETE
    USING (
        user_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid()
        )
    );

-- ============================================================================
-- RLS POLICIES: CALLS
-- ============================================================================

-- Users can read their own calls (as caller or professional)
CREATE POLICY "Users can read own calls"
    ON calls FOR SELECT
    USING (
        caller_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
        OR professional_id IN (SELECT id FROM professionals WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
    );

-- Users can insert calls they initiate
CREATE POLICY "Users can insert own calls"
    ON calls FOR INSERT
    WITH CHECK (
        caller_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    );

-- Users can update calls they're part of
CREATE POLICY "Users can update own calls"
    ON calls FOR UPDATE
    USING (
        caller_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
        OR professional_id IN (SELECT id FROM professionals WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
    );

-- ============================================================================
-- RLS POLICIES: REVIEWS
-- ============================================================================

-- Everyone can read reviews
CREATE POLICY "Anyone can read reviews"
    ON reviews FOR SELECT
    USING (true);

-- Users can insert reviews for their own calls
CREATE POLICY "Users can insert own reviews"
    ON reviews FOR INSERT
    WITH CHECK (
        reviewer_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
        AND call_id IN (SELECT id FROM calls WHERE caller_id = reviewer_id)
    );

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
    ON reviews FOR UPDATE
    USING (
        reviewer_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    );

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews"
    ON reviews FOR DELETE
    USING (
        reviewer_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    );

-- ============================================================================
-- RLS POLICIES: NOTIFICATIONS
-- ============================================================================

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications"
    ON notifications FOR SELECT
    USING (
        user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    );

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (
        user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    );

-- System can insert notifications (handled by backend/triggers)
CREATE POLICY "System can insert notifications"
    ON notifications FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES: TRANSACTIONS
-- ============================================================================

-- Users can read their own transactions
CREATE POLICY "Users can read own transactions"
    ON transactions FOR SELECT
    USING (
        user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    );

-- System can insert transactions (handled by backend)
CREATE POLICY "System can insert transactions"
    ON transactions FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES: CHARITIES
-- ============================================================================

-- Everyone can read verified charities
CREATE POLICY "Anyone can read verified charities"
    ON charities FOR SELECT
    USING (verified = true);

-- ============================================================================
-- RLS POLICIES: DONATIONS
-- ============================================================================

-- Users can read their own donations
CREATE POLICY "Users can read own donations"
    ON donations FOR SELECT
    USING (
        user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    );

-- System can insert donations (handled by backend)
CREATE POLICY "System can insert donations"
    ON donations FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES: USER_CHARITY_SETTINGS
-- ============================================================================

-- Users can read their own charity settings
CREATE POLICY "Users can read own charity settings"
    ON user_charity_settings FOR SELECT
    USING (
        user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    );

-- Users can update their own charity settings
CREATE POLICY "Users can update own charity settings"
    ON user_charity_settings FOR UPDATE
    USING (
        user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    );

-- Users can insert their own charity settings
CREATE POLICY "Users can insert own charity settings"
    ON user_charity_settings FOR INSERT
    WITH CHECK (
        user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    );

-- ============================================================================
-- RLS POLICIES: USER_CHARITY_ALLOCATIONS
-- ============================================================================

-- Users can read their own charity allocations
CREATE POLICY "Users can read own charity allocations"
    ON user_charity_allocations FOR SELECT
    USING (
        user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    );

-- Users can manage their own charity allocations
CREATE POLICY "Users can manage own charity allocations"
    ON user_charity_allocations FOR ALL
    USING (
        user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    );

-- ============================================================================
-- RLS POLICIES: BLOCKED_USERS
-- ============================================================================

-- Users can read their own blocks
CREATE POLICY "Users can read own blocks"
    ON blocked_users FOR SELECT
    USING (
        blocker_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    );

-- Users can manage their own blocks
CREATE POLICY "Users can manage own blocks"
    ON blocked_users FOR ALL
    USING (
        blocker_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    );

-- ============================================================================
-- COMPLETED!
-- ============================================================================

-- Database schema creation complete!
-- Next step: Run the seed data script to populate with initial data
