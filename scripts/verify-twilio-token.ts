/**
 * Script to verify Twilio access token contains push_credential_sid
 * 
 * Usage:
 * 1. Get a token from the app (check logs for token)
 * 2. Run: npx tsx scripts/verify-twilio-token.ts <TOKEN>
 */

import { decodeJwt } from 'jose';

const token = process.argv[2];

if (!token) {
  console.error('❌ Please provide a token as argument');
  console.error('Usage: npx tsx scripts/verify-twilio-token.ts <TOKEN>');
  process.exit(1);
}

try {
  const decoded = decodeJwt(token);
  
  console.log('✅ Token decoded successfully\n');
  console.log('📋 Token Claims:');
  console.log(JSON.stringify(decoded, null, 2));
  
  const grants = (decoded as any).grants;
  if (grants) {
    console.log('\n🔍 Voice Grants:');
    console.log(JSON.stringify(grants.voice, null, 2));
    
    const voiceGrants = grants.voice;
    if (voiceGrants && voiceGrants.push_credential_sid) {
      console.log('\n✅ push_credential_sid found:', voiceGrants.push_credential_sid);
    } else {
      console.log('\n❌ push_credential_sid NOT found in token!');
      console.log('This will prevent incoming call push notifications from working.');
    }
  } else {
    console.log('\n❌ No grants found in token!');
  }
} catch (error) {
  console.error('❌ Error decoding token:', error);
  process.exit(1);
}
