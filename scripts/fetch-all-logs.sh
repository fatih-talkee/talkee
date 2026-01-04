#!/bin/bash

# Tüm Önemli Supabase Edge Function Loglarını Toplu Çekme
# Kullanım: ./scripts/fetch-all-logs.sh

PROJECT_REF="hmimorflmdhcgjhlxbwn"
FUNCTIONS=("twilio-webhook" "send-push" "stripe-webhook" "charge-call-minute")

echo "📊 Tüm Supabase Edge Function Loglarını Çekiyor..."
echo "=============================================="
echo "Project: $PROJECT_REF"
echo "Functions: ${FUNCTIONS[*]}"
echo ""

# Supabase CLI login kontrolü
if ! supabase projects list &>/dev/null; then
    echo "⚠️  Supabase CLI'ye login olmanız gerekiyor."
    echo "Komut: supabase login"
    exit 1
fi

# Log dosyaları için klasör oluştur
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_DIR="logs/supabase-${TIMESTAMP}"
mkdir -p "$LOG_DIR"

echo "📁 Loglar şu klasöre kaydediliyor: $LOG_DIR"
echo ""

# Her function için logları çek
for func in "${FUNCTIONS[@]}"; do
    echo "🔄 Çekiliyor: $func"
    LOG_FILE="${LOG_DIR}/${func}.log"
    
    supabase functions logs "$func" \
        --project-ref "$PROJECT_REF" \
        --limit 1000 \
        > "$LOG_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
        LINE_COUNT=$(wc -l < "$LOG_FILE" 2>/dev/null || echo "0")
        if [ "$LINE_COUNT" -gt 0 ]; then
            echo "  ✅ $LINE_COUNT satır log çekildi"
        else
            echo "  ⚠️  Log bulunamadı (function çalışmamış olabilir)"
        fi
    else
        echo "  ❌ Hata: Loglar çekilemedi"
    fi
    echo ""
done

echo "✅ Tamamlandı!"
echo "📁 Tüm loglar: $LOG_DIR"
echo ""
echo "Logları görüntülemek için:"
echo "  ls -lh $LOG_DIR"
echo "  cat $LOG_DIR/twilio-webhook.log"
echo "  code $LOG_DIR"

