#!/bin/bash

# Supabase Edge Function Loglarını Toplu Olarak Çekme Script'i
# Kullanım: ./scripts/fetch-supabase-logs.sh [function-name] [hours]

PROJECT_REF="hmimorflmdhcgjhlxbwn"
FUNCTION_NAME="${1:-twilio-webhook}"
HOURS="${2:-24}"  # Son 24 saat (default)

echo "📊 Supabase Edge Function Loglarını Çekiyor..."
echo "=============================================="
echo "Function: $FUNCTION_NAME"
echo "Project: $PROJECT_REF"
echo "Time Range: Son $HOURS saat"
echo ""

# Supabase CLI login kontrolü
if ! supabase projects list &>/dev/null; then
    echo "⚠️  Supabase CLI'ye login olmanız gerekiyor."
    echo "Komut: supabase login"
    exit 1
fi

# Log dosyası adı
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="supabase-logs-${FUNCTION_NAME}-${TIMESTAMP}.log"

echo "📝 Loglar şu dosyaya kaydediliyor: $LOG_FILE"
echo ""

# Logları çek ve dosyaya kaydet
echo "🔄 Loglar çekiliyor..."
supabase functions logs "$FUNCTION_NAME" \
    --project-ref "$PROJECT_REF" \
    --limit 1000 \
    > "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    LINE_COUNT=$(wc -l < "$LOG_FILE")
    echo "✅ Başarılı! $LINE_COUNT satır log çekildi."
    echo "📄 Dosya: $LOG_FILE"
    echo ""
    echo "Logları görüntülemek için:"
    echo "  cat $LOG_FILE"
    echo "  less $LOG_FILE"
    echo "  code $LOG_FILE"
else
    echo "❌ Hata: Loglar çekilemedi."
    echo "Kontrol edin:"
    echo "  1. Supabase CLI'ye login oldunuz mu? (supabase login)"
    echo "  2. Function adı doğru mu? ($FUNCTION_NAME)"
    echo "  3. Project ref doğru mu? ($PROJECT_REF)"
    exit 1
fi

