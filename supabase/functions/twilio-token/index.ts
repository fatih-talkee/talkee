import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import jwt from 'https://esm.sh/jsonwebtoken@9.0.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req: any) => {
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

    // Create JWT token for Twilio
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600; // 1 hour expiry

    const payload = {
      jti: `${TWILIO_API_KEY}-${now}`,
      iss: TWILIO_API_KEY,
      sub: TWILIO_ACCOUNT_SID,
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
        },
      },
    };

    const token = jwt.sign(payload, TWILIO_API_SECRET, {
      algorithm: 'HS256',
      header: {
        cty: 'twilio-fpa;v=1',
        typ: 'JWT',
      },
    });

    console.log('✅ [twilio-token] Token generated successfully');

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
