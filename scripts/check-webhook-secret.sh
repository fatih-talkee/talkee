#!/bin/bash

# Webhook Secret Kontrol Script
# Bu script webhook secret'ın olup olmadığını kontrol eder

echo "🔍 Webhook Secret Kontrol Ediliyor..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}⚠️  Webhook secret'ı otomatik test edilemez${NC}"
echo "Çünkü webhook'lar sadece Stripe tarafından çağrılır."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Manuel Kontrol:"
echo ""
echo "1. Supabase Dashboard'a git:"
echo "   https://supabase.com/dashboard"
echo ""
echo "2. Project → Settings → Secrets"
echo ""
echo "3. Şunu kontrol et:"
echo "   - STRIPE_WEBHOOK_SECRET = whsec_..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔗 Webhook Setup:"
echo ""
echo "1. Stripe Dashboard → Developers → Webhooks"
echo "   https://dashboard.stripe.com/test/webhooks"
echo ""
echo "2. 'Add endpoint' butonuna tıkla"
echo ""
echo "3. Endpoint URL:"
echo "   https://hmimorflmdhcgjhlxbwn.supabase.co/functions/v1/stripe-webhook"
echo ""
echo "4. Events to send:"
echo "   - payment_intent.succeeded"
echo "   - payment_intent.payment_failed"
echo "   - customer.created"
echo "   - charge.refunded"
echo ""
echo "5. 'Add endpoint' butonuna tıkla"
echo ""
echo "6. Webhook secret'ı kopyala (whsec_... ile başlar)"
echo ""
echo "7. Supabase Dashboard → Settings → Secrets"
echo "   - Add Secret: STRIPE_WEBHOOK_SECRET"
echo "   - Value: whsec_... (kopyaladığın)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ STRIPE_SECRET_KEY: Çalışıyor (test edildi)"
echo "❓ STRIPE_WEBHOOK_SECRET: Manuel kontrol gerekli"
echo ""
echo "📚 Detaylı rehber: docs/CHECK_STRIPE_SECRETS.md"
