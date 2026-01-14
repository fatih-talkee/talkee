/**
 * Script to test charge-call-minute edge function
 * Usage: npx tsx scripts/test-charge-call-minute.ts <CALL_ID> <MINUTE_NUMBER>
 */

import { createClient } from '@supabase/supabase-js';

const callId = process.argv[2];
const minuteNumber = parseInt(process.argv[3]);

if (!callId || !minuteNumber) {
  console.error('❌ Please provide call_id and minute_number as arguments');
  console.error('Usage: npx tsx scripts/test-charge-call-minute.ts <CALL_ID> <MINUTE_NUMBER>');
  process.exit(1);
}

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

async function testChargeCallMinute() {
  console.log('💰 Testing charge-call-minute edge function...');
  console.log('Call ID:', callId);
  console.log('Minute:', minuteNumber);
  console.log('');

  try {
    const { data, error } = await supabase.functions.invoke('charge-call-minute', {
      body: {
        call_id: callId,
        minute_number: minuteNumber,
      },
    });

    if (error) {
      console.log('❌ Error response:');
      console.log('Status:', (error as any).status);
      console.log('Message:', error.message);
      console.log('Details:', error);
    } else {
      console.log('✅ Success response:');
      console.log(JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

testChargeCallMinute();