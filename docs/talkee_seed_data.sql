-- ============================================================================
-- TALKEE DATABASE SEED DATA
-- ============================================================================
-- Version: 1.0.0
-- Created: 2025-12-06
-- 
-- This script populates the database with initial data:
-- - 12 Categories
-- - Sample Users
-- - 16 Sample Professionals
-- - 10 Charities
-- ============================================================================

-- ============================================================================
-- SEED: CATEGORIES (12 categories)
-- ============================================================================

INSERT INTO categories (name, slug, description, icon_name, is_active, sort_order) VALUES
('Business', 'business', 'Business strategy, entrepreneurship, and management consulting', 'briefcase', true, 1),
('Technology', 'technology', 'Software development, IT consulting, and tech innovation', 'smartphone', true, 2),
('Health', 'health', 'Medical advice, fitness, wellness, and mental health', 'heart', true, 3),
('Finance', 'finance', 'Financial planning, investment advice, and accounting', 'dollar-sign', true, 4),
('Lifestyle', 'lifestyle', 'Life coaching, personal development, and lifestyle design', 'star', true, 5),
('Education', 'education', 'Tutoring, academic guidance, and educational consulting', 'book', true, 6),
('Design', 'design', 'Graphic design, UX/UI, and creative direction', 'palette', true, 7),
('Entertainment', 'entertainment', 'Music, arts, performance, and entertainment industry', 'music', true, 8),
('Sports', 'sports', 'Athletic training, sports coaching, and fitness', 'activity', true, 9),
('Automotive', 'automotive', 'Car mechanics, automotive engineering, and vehicle consulting', 'car', true, 10),
('Photography', 'photography', 'Photography, videography, and visual arts', 'camera', true, 11),
('Gaming', 'gaming', 'Game development, esports coaching, and gaming industry', 'gamepad-2', true, 12);

-- ============================================================================
-- SEED: SAMPLE USERS (For professionals)
-- ============================================================================
-- Note: In production, users will be created via Supabase Auth
-- These are placeholder users for testing with mock auth_id values

INSERT INTO users (id, auth_id, email, name, phone, avatar_url, bio, wallet_balance, role) VALUES
-- Professional users
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'sarah.chen@example.com', 'Dr. Sarah Chen', '+1-555-0101', 'https://randomuser.me/api/portraits/women/1.jpg', 'Business strategist with 15 years of experience', 5000.00, 'professional'),
('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'james.wilson@example.com', 'James Wilson', '+1-555-0102', 'https://randomuser.me/api/portraits/men/2.jpg', 'Senior software architect', 3500.00, 'professional'),
('00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'maria.garcia@example.com', 'Dr. Maria Garcia', '+1-555-0103', 'https://randomuser.me/api/portraits/women/3.jpg', 'Cardiologist and wellness coach', 8000.00, 'professional'),
('00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 'robert.kim@example.com', 'Robert Kim', '+1-555-0104', 'https://randomuser.me/api/portraits/men/4.jpg', 'Investment banking specialist', 12000.00, 'professional'),
('00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', 'emily.johnson@example.com', 'Emily Johnson', '+1-555-0105', 'https://randomuser.me/api/portraits/women/5.jpg', 'Life and career coach', 2500.00, 'professional'),
('00000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000006', 'david.brown@example.com', 'Prof. David Brown', '+1-555-0106', 'https://randomuser.me/api/portraits/men/6.jpg', 'Mathematics professor', 1800.00, 'professional'),
('00000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000007', 'lisa.anderson@example.com', 'Lisa Anderson', '+1-555-0107', 'https://randomuser.me/api/portraits/women/7.jpg', 'UX/UI design expert', 4200.00, 'professional'),
('00000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000008', 'michael.taylor@example.com', 'Michael Taylor', '+1-555-0108', 'https://randomuser.me/api/portraits/men/8.jpg', 'Music producer', 3000.00, 'professional'),
('00000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000009', 'jennifer.white@example.com', 'Jennifer White', '+1-555-0109', 'https://randomuser.me/api/portraits/women/9.jpg', 'Olympic swimming coach', 5500.00, 'professional'),
('00000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000010', 'chris.martinez@example.com', 'Chris Martinez', '+1-555-0110', 'https://randomuser.me/api/portraits/men/10.jpg', 'Automotive engineer', 2800.00, 'professional'),
('00000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000011', 'amanda.lee@example.com', 'Amanda Lee', '+1-555-0111', 'https://randomuser.me/api/portraits/women/11.jpg', 'Professional photographer', 3200.00, 'professional'),
('00000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000012', 'daniel.park@example.com', 'Daniel Park', '+1-555-0112', 'https://randomuser.me/api/portraits/men/12.jpg', 'Esports coach', 4500.00, 'professional'),
('00000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000013', 'nicole.rodriguez@example.com', 'Nicole Rodriguez', '+1-555-0113', 'https://randomuser.me/api/portraits/women/13.jpg', 'Business consultant', 6800.00, 'professional'),
('00000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000014', 'kevin.thomas@example.com', 'Kevin Thomas', '+1-555-0114', 'https://randomuser.me/api/portraits/men/14.jpg', 'AI/ML specialist', 9200.00, 'professional'),
('00000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000015', 'rachel.jackson@example.com', 'Dr. Rachel Jackson', '+1-555-0115', 'https://randomuser.me/api/portraits/women/15.jpg', 'Psychologist', 7500.00, 'professional'),
('00000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000016', 'thomas.moore@example.com', 'Thomas Moore', '+1-555-0116', 'https://randomuser.me/api/portraits/men/16.jpg', 'Investment advisor', 10500.00, 'professional'),

-- Regular test user
('00000000-0000-0000-0000-000000000100', '10000000-0000-0000-0000-000000000100', 'testuser@example.com', 'Test User', '+1-555-0200', 'https://randomuser.me/api/portraits/women/44.jpg', 'Test user account', 1000.00, 'user');

-- ============================================================================
-- SEED: PROFESSIONALS (16 professionals)
-- ============================================================================

INSERT INTO professionals (
    user_id, 
    category_id, 
    bio, 
    expertise_tags, 
    languages, 
    rate_per_minute, 
    is_available, 
    is_verified, 
    average_rating, 
    total_calls, 
    total_minutes
) VALUES
-- Business (Sarah Chen)
(
    '00000000-0000-0000-0000-000000000001',
    (SELECT id FROM categories WHERE slug = 'business'),
    'Former McKinsey consultant with 15 years of experience in business strategy, digital transformation, and leadership development. Helped 200+ companies scale globally.',
    ARRAY['Strategy', 'Leadership', 'Digital Transformation', 'Startups'],
    ARRAY['English', 'Mandarin'],
    8.50,
    true,
    true,
    4.9,
    1247,
    31175
),

-- Technology (James Wilson)
(
    '00000000-0000-0000-0000-000000000002',
    (SELECT id FROM categories WHERE slug = 'technology'),
    'Senior Software Architect at Google. Expert in cloud architecture, microservices, and system design. Mentor to 500+ developers.',
    ARRAY['Cloud Architecture', 'System Design', 'React', 'Python'],
    ARRAY['English', 'Spanish'],
    6.75,
    true,
    true,
    4.8,
    892,
    22300
),

-- Health (Maria Garcia)
(
    '00000000-0000-0000-0000-000000000003',
    (SELECT id FROM categories WHERE slug = 'health'),
    'Board-certified cardiologist with 20 years of clinical experience. Specialized in preventive cardiology and lifestyle medicine.',
    ARRAY['Cardiology', 'Preventive Medicine', 'Nutrition', 'Wellness'],
    ARRAY['English', 'Spanish', 'Portuguese'],
    12.00,
    false,
    true,
    5.0,
    1534,
    46020
),

-- Finance (Robert Kim)
(
    '00000000-0000-0000-0000-000000000004',
    (SELECT id FROM categories WHERE slug = 'finance'),
    'Former Goldman Sachs Managing Director. 25 years in investment banking, wealth management, and financial planning.',
    ARRAY['Investment Banking', 'Wealth Management', 'Trading', 'Portfolio Management'],
    ARRAY['English', 'Korean'],
    15.00,
    true,
    true,
    4.7,
    687,
    20610
),

-- Lifestyle (Emily Johnson)
(
    '00000000-0000-0000-0000-000000000005',
    (SELECT id FROM categories WHERE slug = 'lifestyle'),
    'Certified life coach helping professionals achieve work-life balance and personal growth. Featured in Forbes and Business Insider.',
    ARRAY['Life Coaching', 'Career Development', 'Mindfulness', 'Goal Setting'],
    ARRAY['English'],
    5.25,
    true,
    true,
    4.9,
    456,
    11400
),

-- Education (David Brown)
(
    '00000000-0000-0000-0000-000000000006',
    (SELECT id FROM categories WHERE slug = 'education'),
    'Professor of Mathematics at MIT. Specialized in making complex concepts simple. Tutored 1000+ students.',
    ARRAY['Mathematics', 'Physics', 'SAT Prep', 'College Counseling'],
    ARRAY['English', 'French'],
    7.50,
    true,
    true,
    4.8,
    789,
    19725
),

-- Design (Lisa Anderson)
(
    '00000000-0000-0000-0000-000000000007',
    (SELECT id FROM categories WHERE slug = 'design'),
    'Award-winning UX/UI designer. Led design teams at Apple and Airbnb. Passionate about user-centered design.',
    ARRAY['UX Design', 'UI Design', 'Figma', 'Design Thinking'],
    ARRAY['English', 'German'],
    9.00,
    true,
    true,
    4.9,
    345,
    8625
),

-- Entertainment (Michael Taylor)
(
    '00000000-0000-0000-0000-000000000008',
    (SELECT id FROM categories WHERE slug = 'entertainment'),
    'Grammy-nominated music producer. Worked with major artists across multiple genres. Teaching production techniques.',
    ARRAY['Music Production', 'Mixing', 'Sound Design', 'Artist Development'],
    ARRAY['English'],
    8.25,
    true,
    false,
    4.6,
    234,
    5850
),

-- Sports (Jennifer White)
(
    '00000000-0000-0000-0000-000000000009',
    (SELECT id FROM categories WHERE slug = 'sports'),
    'Olympic swimming coach with 15 years experience. Trained multiple national champions and Olympic medalists.',
    ARRAY['Swimming', 'Athletic Training', 'Sports Psychology', 'Nutrition'],
    ARRAY['English', 'French'],
    10.50,
    true,
    true,
    4.9,
    567,
    14175
),

-- Automotive (Chris Martinez)
(
    '00000000-0000-0000-0000-000000000010',
    (SELECT id FROM categories WHERE slug = 'automotive'),
    'Automotive engineer with 20 years at Tesla and BMW. Expert in electric vehicles and automotive technology.',
    ARRAY['Electric Vehicles', 'Automotive Engineering', 'Car Maintenance', 'Performance Tuning'],
    ARRAY['English', 'Spanish'],
    6.00,
    true,
    true,
    4.7,
    123,
    3075
),

-- Photography (Amanda Lee)
(
    '00000000-0000-0000-0000-000000000011',
    (SELECT id FROM categories WHERE slug = 'photography'),
    'Professional photographer featured in National Geographic. Specialized in landscape and portrait photography.',
    ARRAY['Landscape Photography', 'Portrait Photography', 'Lightroom', 'Photoshop'],
    ARRAY['English', 'Japanese'],
    7.75,
    true,
    true,
    4.8,
    298,
    7450
),

-- Gaming (Daniel Park)
(
    '00000000-0000-0000-0000-000000000012',
    (SELECT id FROM categories WHERE slug = 'gaming'),
    'Professional esports coach. Former League of Legends pro player. Coached multiple championship teams.',
    ARRAY['Esports Coaching', 'Strategy', 'Team Management', 'Mental Game'],
    ARRAY['English', 'Korean'],
    8.00,
    true,
    true,
    4.9,
    445,
    11125
),

-- Business (Nicole Rodriguez)
(
    '00000000-0000-0000-0000-000000000013',
    (SELECT id FROM categories WHERE slug = 'business'),
    'Serial entrepreneur and business consultant. Built and sold 3 successful startups. Now helping others succeed.',
    ARRAY['Entrepreneurship', 'Business Strategy', 'Fundraising', 'Marketing'],
    ARRAY['English', 'Spanish'],
    9.50,
    true,
    true,
    4.8,
    423,
    10575
),

-- Technology (Kevin Thomas)
(
    '00000000-0000-0000-0000-000000000014',
    (SELECT id FROM categories WHERE slug = 'technology'),
    'AI/ML researcher at Stanford. Published 50+ papers. Expert in deep learning and natural language processing.',
    ARRAY['Artificial Intelligence', 'Machine Learning', 'Deep Learning', 'Python'],
    ARRAY['English'],
    11.00,
    true,
    true,
    5.0,
    378,
    9450
),

-- Health (Rachel Jackson)
(
    '00000000-0000-0000-0000-000000000015',
    (SELECT id FROM categories WHERE slug = 'health'),
    'Clinical psychologist specialized in cognitive behavioral therapy. Helped 2000+ patients overcome anxiety and depression.',
    ARRAY['Psychology', 'CBT', 'Anxiety Treatment', 'Depression'],
    ARRAY['English'],
    10.00,
    true,
    true,
    4.9,
    892,
    22300
),

-- Finance (Thomas Moore)
(
    '00000000-0000-0000-0000-000000000016',
    (SELECT id FROM categories WHERE slug = 'finance'),
    'Certified Financial Planner with 30 years experience. Managed portfolios worth $500M+. Expert in retirement planning.',
    ARRAY['Financial Planning', 'Retirement', 'Investment Strategy', 'Tax Planning'],
    ARRAY['English'],
    13.50,
    true,
    true,
    4.8,
    654,
    19620
);

-- ============================================================================
-- SEED: CHARITIES (10 organizations)
-- ============================================================================

INSERT INTO charities (
    name, 
    short_description, 
    full_description, 
    logo, 
    category, 
    country, 
    website, 
    verified,
    featured_image
) VALUES
(
    'Global Education Fund',
    'Providing quality education to children in developing countries',
    'The Global Education Fund works tirelessly to ensure every child has access to quality education, regardless of their economic background. We build schools, train teachers, and provide educational materials in over 50 countries.',
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400',
    'education',
    'United States',
    'https://globaleducationfund.org',
    true,
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800'
),
(
    'Clean Ocean Initiative',
    'Fighting ocean pollution and protecting marine life',
    'Clean Ocean Initiative is dedicated to removing plastic waste from our oceans and protecting marine ecosystems. We organize beach cleanups, support recycling programs, and advocate for sustainable practices.',
    'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=400',
    'environment',
    'International',
    'https://cleanocean.org',
    true,
    'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=800'
),
(
    'Doctors Without Borders',
    'Emergency medical care in crisis zones',
    'Médecins Sans Frontières provides emergency medical assistance to people affected by conflict, epidemics, disasters, or exclusion from healthcare. Our teams are made up of medical professionals from around the world.',
    'https://images.unsplash.com/photo-1516841273335-e39b37888115?w=400',
    'health',
    'International',
    'https://msf.org',
    true,
    'https://images.unsplash.com/photo-1516841273335-e39b37888115?w=800'
),
(
    'End Hunger Foundation',
    'Fighting food insecurity worldwide',
    'End Hunger Foundation works to eliminate hunger and malnutrition globally. We provide food assistance, support sustainable agriculture, and advocate for policies that ensure food security for all.',
    'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400',
    'poverty',
    'International',
    'https://endhunger.org',
    true,
    'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800'
),
(
    'Wildlife Conservation Society',
    'Protecting endangered species and habitats',
    'The Wildlife Conservation Society saves wildlife and wild places worldwide through science, conservation action, education, and inspiring people to value nature.',
    'https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=400',
    'animals',
    'United States',
    'https://wcs.org',
    true,
    'https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=800'
),
(
    'Human Rights Watch',
    'Defending human rights globally',
    'Human Rights Watch defends the rights of people worldwide. We investigate and expose human rights abuses, hold abusers accountable, and pressure governments and international institutions to end abuse.',
    'https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=400',
    'human_rights',
    'International',
    'https://hrw.org',
    true,
    'https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=800'
),
(
    'Green Future Alliance',
    'Combating climate change through renewable energy',
    'Green Future Alliance promotes renewable energy solutions and sustainable practices to combat climate change. We work with communities and governments to transition to clean energy.',
    'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400',
    'environment',
    'International',
    'https://greenfuture.org',
    true,
    'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800'
),
(
    'Hope for Children',
    'Supporting orphaned and vulnerable children',
    'Hope for Children provides care, education, and support for orphaned and vulnerable children worldwide. We ensure every child grows up in a safe, nurturing environment.',
    'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400',
    'education',
    'International',
    'https://hopeforchildren.org',
    true,
    'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800'
),
(
    'Mental Health Alliance',
    'Breaking stigma and providing mental health support',
    'Mental Health Alliance works to destigmatize mental illness and provide accessible mental health services to underserved communities worldwide.',
    'https://images.unsplash.com/photo-1527689368864-3a821dbccc34?w=400',
    'health',
    'International',
    'https://mentalhealthalliance.org',
    true,
    'https://images.unsplash.com/photo-1527689368864-3a821dbccc34?w=800'
),
(
    'Safe Water Project',
    'Providing clean water access globally',
    'Safe Water Project brings clean, safe drinking water to communities in need. We build wells, install filtration systems, and educate communities about water safety.',
    'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400',
    'poverty',
    'International',
    'https://safewaterproject.org',
    true,
    'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800'
);

-- ============================================================================
-- COMPLETED!
-- ============================================================================

-- Seed data insertion complete!
-- Database is now ready for use with sample data.
