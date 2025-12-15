#!/bin/bash

# Stripe Webhook Function Deploy Script

echo "🚀 Deploying Stripe Webhook Function..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found!${NC}"
    echo ""
    echo "Install it with:"
    echo "  npm install -g supabase"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI found${NC}"
echo ""

# Check if logged in
echo "🔐 Checking Supabase login status..."
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in. Please login:${NC}"
    echo "  supabase login"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Logged in${NC}"
echo ""

# Deploy function
echo "📦 Deploying stripe-webhook function..."
echo ""

supabase functions deploy stripe-webhook

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Function deployed successfully!${NC}"
    echo ""
    echo "📋 Next steps:"
    echo "1. Test webhook from Stripe Dashboard"
    echo "2. Check function logs: supabase functions logs stripe-webhook"
    echo "3. Make a test payment"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Deployment failed!${NC}"
    echo ""
    echo "Check the error above and try again."
    exit 1
fi
