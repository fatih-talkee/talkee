import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SignJWT } from 'https://deno.land/x/jose@v5.2.0/jwt/sign.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🎫 [twilio-token] Generating token...');

    // Get Twilio credentials from environment
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_API_KEY = Deno.env.get('TWILIO_API_KEY');
    const TWILIO_API_SECRET = Deno.env.get('TWILIO_API_SECRET');
    const TWILIO_TWIML_APP_SID = Deno.env.get('TWILIO_TWIML_APP_SID');
    const TWILIO_PUSH_CREDENTIAL_SID = Deno.env.get(
      'TWILIO_PUSH_CREDENTIAL_SID'
    );

    if (
      !TWILIO_ACCOUNT_SID ||
      !TWILIO_API_KEY ||
      !TWILIO_API_SECRET ||
      !TWILIO_TWIML_APP_SID
    ) {
      console.error('❌ [twilio-token] Missing Twilio credentials');
      throw new Error('Missing Twilio credentials');
    }

    // Validate push credential SID (required for incoming call push notifications)
    if (!TWILIO_PUSH_CREDENTIAL_SID || TWILIO_PUSH_CREDENTIAL_SID.trim() === '') {
      console.error('❌ [twilio-token] TWILIO_PUSH_CREDENTIAL_SID is missing or empty');
      console.error('❌ [twilio-token] This will prevent incoming call push notifications from working');
      throw new Error('TWILIO_PUSH_CREDENTIAL_SID is required for push notifications');
    }

    // Authenticate user
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ [twilio-token] Unauthorized:', authError);
      throw new Error('Unauthorized');
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('❌ [twilio-token] User profile not found:', profileError);
      throw new Error('User profile not found');
    }

    const identity = profile.id;
    console.log('✅ [twilio-token] User identity:', identity);
    console.log('🔑 [twilio-token] API Key:', TWILIO_API_KEY);
    console.log('🔑 [twilio-token] Account SID:', TWILIO_ACCOUNT_SID);
    console.log('🔑 [twilio-token] TwiML App SID:', TWILIO_TWIML_APP_SID);
    console.log(
      '🔑 [twilio-token] Push Credential SID:',
      TWILIO_PUSH_CREDENTIAL_SID ? `${TWILIO_PUSH_CREDENTIAL_SID.substring(0, 10)}...` : 'MISSING'
    );

    // Create JWT token for Twilio using jose (Deno-compatible)
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600; // 1 hour expiry

    // Encode secret as Uint8Array
    const secret = new TextEncoder().encode(TWILIO_API_SECRET);

    const jti = `${TWILIO_API_KEY}-${now}`;
    console.log('🆔 [twilio-token] JTI:', jti);
    console.log('⏰ [twilio-token] Now:', now, 'Exp:', exp);

    // Create JWT with jose - include all claims in payload
    const token = await new SignJWT({
      jti,
      iss: TWILIO_API_KEY,
      sub: TWILIO_ACCOUNT_SID,
      iat: now,
      exp,
      grants: {
        identity,
        voice: {
          outgoing: {
            application_sid: TWILIO_TWIML_APP_SID,
          },
          incoming: {
            allow: true,
          },
          // Include push_credential_sid only if it's set (required for push notifications)
          ...(TWILIO_PUSH_CREDENTIAL_SID && {
            push_credential_sid: TWILIO_PUSH_CREDENTIAL_SID,
          }),
        },
      },
    })
      .setProtectedHeader({
        alg: 'HS256',
        typ: 'JWT',
        cty: 'twilio-fpa;v=1',
      })
      .sign(secret);

    console.log('✅ [twilio-token] Token generated successfully');
    console.log('📝 [twilio-token] Token length:', token.length);
    console.log(
      '📝 [twilio-token] Token preview:',
      token.substring(0, 50) + '...'
    );

    return new Response(
      JSON.stringify({
        token,
        identity,
        expiresAt: new Date(exp * 1000).toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('❌ [twilio-token] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
