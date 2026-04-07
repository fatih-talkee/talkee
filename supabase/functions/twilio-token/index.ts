import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SignJWT } from 'https://deno.land/x/jose@v5.2.0/jwt/sign.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-platform',
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

    // Platform bilgisini al (ios veya android)
    const platform = req.headers.get('x-platform')?.toLowerCase();
    const buildEnv = req.headers.get('x-build-environment')?.toLowerCase();
    console.log('📱 [twilio-token] Platform:', platform, '| Env:', buildEnv || 'unknown');

    // Platforma göre doğru SID'yi seç
    let PUSH_SID = '';
    let usedFallback = false;
    let iosDecision = '';

    if (platform === 'ios') {
      if (buildEnv === 'development') {
        PUSH_SID = Deno.env.get('TWILIO_PUSH_CREDENTIAL_SID_IOS_DEV') || '';
        iosDecision = 'DEV credentials selected';
      } else if (buildEnv === 'production') {
        PUSH_SID = Deno.env.get('TWILIO_PUSH_CREDENTIAL_SID_IOS_PROD') || '';
        iosDecision = 'PROD credentials selected';
      } else {
        // Fallback for older apps not sending environment
        PUSH_SID = Deno.env.get('TWILIO_PUSH_CREDENTIAL_SID_IOS_PROD') || Deno.env.get('TWILIO_PUSH_CREDENTIAL_SID_IOS') || '';
        iosDecision = 'No build env - fallback to PROD/Old credentials';
      }
      console.log(`📱 [twilio-token] iOS Environment Decision: ${iosDecision}`);
    } else if (platform === 'android') {
      PUSH_SID = Deno.env.get('TWILIO_PUSH_CREDENTIAL_SID_ANDROID') || '';
    }

    // Fallback: Eğer platforma özel SID yoksa genel SID'yi kullan
    if (!PUSH_SID) {
      PUSH_SID = Deno.env.get('TWILIO_PUSH_CREDENTIAL_SID') || '';
      usedFallback = true;
    }

    // Seçilen SID'nin doğrulanması (CR ile başlamalı)
    if (PUSH_SID) {
      if (!PUSH_SID.startsWith('CR')) {
        console.error(`⚠️ [twilio-token] Geçersiz SID formatı (${platform}):`, PUSH_SID.substring(0, 10) + '...');
      } else {
        console.log(`✅ [twilio-token] Geçerli SID seçildi (${platform}):`, PUSH_SID.substring(0, 10) + '...', '| Fallback:', usedFallback);
      }
    } else {
      console.error(`❌ [twilio-token] No push credential SID resolved for platform: ${platform} | Env: ${buildEnv}`);
      // Token üretimini tamamen kırmıyoruz (outbound için hala çalışabilir), 
      // ama push bildirimleri çalışmayacaktır.
    }

    const TWILIO_PUSH_CREDENTIAL_SID = PUSH_SID;

    if (
      !TWILIO_ACCOUNT_SID ||
      !TWILIO_API_KEY ||
      !TWILIO_API_SECRET ||
      !TWILIO_TWIML_APP_SID
    ) {
      console.error('❌ [twilio-token] Missing Twilio credentials');
      throw new Error('Missing Twilio credentials');
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
    console.log('🔑 [twilio-token] API Key:', TWILIO_API_KEY ? `${TWILIO_API_KEY.substring(0, 8)}...` : 'MISSING');
    console.log('🔑 [twilio-token] Account SID:', TWILIO_ACCOUNT_SID ? `${TWILIO_ACCOUNT_SID.substring(0, 8)}...` : 'MISSING');
    console.log('🔑 [twilio-token] TwiML App SID:', TWILIO_TWIML_APP_SID ? `${TWILIO_TWIML_APP_SID.substring(0, 8)}...` : 'MISSING');
    console.log(
      '🔑 [twilio-token] Push Credential SID:',
      TWILIO_PUSH_CREDENTIAL_SID ? `${TWILIO_PUSH_CREDENTIAL_SID.substring(0, 10)}...` : 'MISSING'
    );

    // Parse mode and room parameters from URL query or JSON body
    const url = new URL(req.url);
    let requestBody: any = {};
    if (req.method === 'POST') {
      try {
        requestBody = await req.json();
      } catch (e) {
        // Ignore payload read errors to prevent breaking legacy voice calls
      }
    }

    const mode = url.searchParams.get('mode') || requestBody.mode || 'voice';
    const roomName = (url.searchParams.get('roomName') || requestBody.roomName || '').trim();

    console.log(`📡 [twilio-token] Token Request Mode: ${mode}${mode === 'video' ? ', Room: ' + roomName : ''}`);

    if (mode === 'video' && !roomName) {
      console.error('❌ [twilio-token] Validation Error: roomName is required for video mode');
      return new Response(JSON.stringify({ error: 'roomName is required for video mode' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Create JWT token for Twilio using jose (Deno-compatible)
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600; // 1 hour expiry

    // Encode secret as Uint8Array
    const secret = new TextEncoder().encode(TWILIO_API_SECRET);

    const jti = `${TWILIO_API_KEY}-${now}`;
    console.log('🆔 [twilio-token] JTI:', jti);
    console.log('⏰ [twilio-token] Now:', now, 'Exp:', exp);

    const voiceGrants = {
      outgoing: {
        application_sid: TWILIO_TWIML_APP_SID,
      },
      incoming: {
        allow: true,
      },
      ...(TWILIO_PUSH_CREDENTIAL_SID && {
        push_credential_sid: TWILIO_PUSH_CREDENTIAL_SID,
      }),
    };

    const videoGrants = { room: roomName };

    // Create JWT with jose - include all claims in payload
    const token = await new SignJWT({
      jti,
      iss: TWILIO_API_KEY,
      sub: TWILIO_ACCOUNT_SID,
      iat: now,
      exp,
      grants: {
        identity,
        ...(mode === 'voice' && { voice: voiceGrants }),
        ...(mode === 'video' && { video: videoGrants }),
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
        ...(mode === 'video' && roomName && { roomName }),
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
