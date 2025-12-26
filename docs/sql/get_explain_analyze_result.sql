-- ============================================================================
-- GET EXPLAIN ANALYZE RESULT FOR CALLBACK QUERY
-- ============================================================================
-- Bu script callback query'nin exact execution plan'ını gösterir
-- Sonucu paylaşın: hangi index kullanılıyor ve execution time ne kadar?
-- ============================================================================

-- 1. Tablo istatistiklerini güncelle (query planner için önemli)
ANALYZE users;

-- 2. Callback query'sini EXPLAIN ANALYZE ile çalıştır
-- Bu sonuç çok önemli: hangi index kullanılıyor ve ne kadar sürüyor?
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, name, avatar_url, oauth_providers, oauth_emails, deleted_at, primary_email
FROM users
WHERE auth_id = '4be42b70-b3a2-4d05-a500-cb256946e9a1'::uuid
  AND deleted_at IS NULL
LIMIT 1;

-- 3. JSON formatında da al (daha detaylı)
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)
SELECT id, name, avatar_url, oauth_providers, oauth_emails, deleted_at, primary_email
FROM users
WHERE auth_id = '4be42b70-b3a2-4d05-a500-cb256946e9a1'::uuid
  AND deleted_at IS NULL
LIMIT 1;

-- ============================================================================
-- SONUÇ YORUMLAMA:
-- ============================================================================
-- 1. "Index Scan using idx_users_auth_id_deleted" görüyorsanız:
--    ✅ Composite index kullanılıyor (bu iyi)
--    ⏱️ Execution Time'a bakın:
--       - < 1ms = Çok hızlı (normal)
--       - 1-10ms = Kabul edilebilir
--       - > 10ms = Yavaş (network veya başka sorun)
--
-- 2. "Index Scan using idx_users_auth_id_deleted_at" görüyorsanız:
--    ✅ Partial index kullanılıyor (daha optimal ama nadiren kullanılıyor)
--
-- 3. "Seq Scan" görüyorsanız:
--    ❌ Index kullanılmıyor! Bu çok yavaş olur
--
-- 4. "Planning Time" ve "Execution Time" değerlerini paylaşın
-- ============================================================================
