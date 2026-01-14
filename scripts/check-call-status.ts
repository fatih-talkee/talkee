/**
 * Script to check call status in database
 * Usage: npx tsx scripts/check-call-status.ts <CALL_ID>
 */

import { createClient } from '@supabase/supabase-js';
import { CallSidExtractor } from '@/services/twilioVoice/utils';

const callId = process.argv[2];

if (!callId) {
  console.error('❌ Please provide a call ID as argument');
  console.error('Usage: npx tsx scripts/check-call-status.ts <CALL_ID>');
  process.exit(1);
}

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkCallStatus() {
  console.log('🔍 Checking call status in database...');
  console.log('Call ID:', callId);
  console.log('');

  try {
    // First try by id (UUID)
    if (CallSidExtractor.isUuid(callId)) {
      console.log('🔍 Trying by id (UUID)...');
      const { data: callById, error: idError } = await supabase
        .from('calls')
        .select('*')
        .eq('id', callId)
        .single();

      if (!idError && callById) {
        console.log('✅ Found by id:');
        console.log(JSON.stringify(callById, null, 2));
        return;
      }
    }

    // Try by call_sid
    console.log('🔍 Trying by call_sid...');
    const { data: callBySid, error: sidError } = await supabase
      .from('calls')
      .select('*')
      .eq('call_sid', callId)
      .single();

    if (!sidError && callBySid) {
      console.log('✅ Found by call_sid:');
      console.log(JSON.stringify(callBySid, null, 2));
      return;
    }

    // Not found
    console.log('❌ Call not found in database');
    console.log('ID Error:', idError?.message);
    console.log('SID Error:', sidError?.message);

  } catch (error) {
    console.error('❌ Error checking call status:', error);
    process.exit(1);
  }
}

checkCallStatus();