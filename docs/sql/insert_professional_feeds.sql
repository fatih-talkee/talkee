-- Insert sample feeds for professional: 292e1865-d4d8-4cf8-9ea3-6d75327f5652
-- This script adds multiple feed posts for testing purposes

INSERT INTO professional_feeds (
  professional_id,
  content,
  is_active,
  is_pinned,
  views_count,
  created_at,
  updated_at
) VALUES
  (
    '292e1865-d4d8-4cf8-9ea3-6d75327f5652',
    'Excited to share some valuable insights about professional development and career growth. Whether you''re just starting out or looking to advance, I''m here to help guide you through your journey. Let''s discuss your goals and create a personalized plan together!',
    true,
    true,
    0,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  ),
  (
    '292e1865-d4d8-4cf8-9ea3-6d75327f5652',
    'Just wrapped up an amazing session with a client who made significant progress in their career transition. Remember, change is possible at any stage of your professional life. If you''re considering a career shift, let''s talk about how we can make it happen.',
    true,
    false,
    0,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
  ),
  (
    '292e1865-d4d8-4cf8-9ea3-6d75327f5652',
    'Tip of the day: Building a strong professional network takes time and genuine effort. Focus on quality relationships over quantity. Reach out to people you genuinely connect with and offer value before asking for anything in return.',
    true,
    false,
    0,
    NOW() - INTERVAL '12 hours',
    NOW() - INTERVAL '12 hours'
  ),
  (
    '292e1865-d4d8-4cf8-9ea3-6d75327f5652',
    'I''m now offering extended consultation sessions for those who want to dive deeper into their career planning. These sessions allow us to create comprehensive strategies that address multiple aspects of your professional development.',
    true,
    false,
    0,
    NOW() - INTERVAL '6 hours',
    NOW() - INTERVAL '6 hours'
  ),
  (
    '292e1865-d4d8-4cf8-9ea3-6d75327f5652',
    'Thank you to everyone who has been part of this journey. Your success stories inspire me every day. If you have questions about interview preparation, salary negotiation, or career advancement, feel free to reach out!',
    true,
    false,
    0,
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '2 hours'
  );

-- Verify the inserted feeds
SELECT 
  id,
  professional_id,
  LEFT(content, 50) || '...' as content_preview,
  is_active,
  is_pinned,
  views_count,
  created_at
FROM professional_feeds
WHERE professional_id = '292e1865-d4d8-4cf8-9ea3-6d75327f5652'
ORDER BY created_at DESC;

