#!/bin/bash

# Stripe Secrets Kontrol Script
# Bu script Supabase Functions'ları test ederek secrets'ların olup olmadığını kontrol eder

echo "🔍 Stripe Secrets Kontrol Ediliyor..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# .env dosyasından değerleri oku
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env dosyası bulunamadı!${NC}"
    exit 1
fi

# Supabase URL ve anon key'i oku
SUPABASE_URL=$(grep "EXPO_PUBLIC_SUPABASE_URL" .env | cut -d'=' -f2)
ANON_KEY=$(grep "EXPO_PUBLIC_SUPABASE_ANON_KEY" .env | cut -d'=' -f2)

if [ -z "$SUPABASE_URL" ] || [ -z "$ANON_KEY" ]; then
    echo -e "${RED}❌ Supabase URL veya anon key bulunamadı!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Supabase URL: $SUPABASE_URL${NC}"
echo ""

# Test payment intent function
echo "🧪 Payment Intent Function test ediliyor..."
echo ""

RESPONSE=$(curl -s -X POST \
  "$SUPABASE_URL/functions/v1/create-payment-intent" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10,
    "userId": "test-check-123"
  }')

# Response'u kontrol et
if echo "$RESPONSE" | grep -q "clientSecret"; then
    echo -e "${GREEN}✅ STRIPE_SECRET_KEY mevcut ve çalışıyor!${NC}"
    echo ""
    echo "Response:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
elif echo "$RESPONSE" | grep -q "STRIPE_SECRET_KEY"; then
    echo -e "${RED}❌ STRIPE_SECRET_KEY eksik!${NC}"
    echo ""
    echo "Hata:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    echo ""
    echo -e "${YELLOW}📝 Çözüm:${NC}"
    echo "1. Supabase Dashboard → Settings → Secrets"
    echo "2. Add Secret: STRIPE_SECRET_KEY = sk_test_..."
    echo "3. Stripe Dashboard'dan secret key'i al: https://dashboard.stripe.com/test/apikeys"
else
    echo -e "${YELLOW}⚠️  Beklenmeyen response:${NC}"
    echo "$RESPONSE"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Manuel Kontrol:"
echo "1. Supabase Dashboard: https://supabase.com/dashboard"
echo "2. Project → Settings → Secrets"
echo "3. Şunları kontrol et:"
echo "   - STRIPE_SECRET_KEY"
echo "   - STRIPE_WEBHOOK_SECRET"
echo ""
echo "📚 Detaylı rehber: docs/CHECK_STRIPE_SECRETS.md"
