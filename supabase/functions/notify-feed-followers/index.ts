import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

interface PushMessage {
  to: string;
  sound: 'default' | null;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
}

interface PushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

serve(async (req: Request) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ success: false, error: 'Missing authorization header' }),
      {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Server misconfigured (missing Supabase env)',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body = await req.json();
    const professionalId: string | undefined = body.professional_id;
    const feedId: string | undefined = body.feed_id;
    const professionalNameFromClient: string | undefined =
      body.professional_name;
    const actionUrl: string | undefined = body.action_url;

    if (!professionalId || !feedId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: professional_id, feed_id',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // AuthZ: Only the owner professional can notify their followers.
    // verify_jwt=true already ensures a valid JWT, but we still need to enforce ownership.
    const token = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice('bearer '.length)
      : authHeader;
    const {
      data: { user: authUser },
      error: authErr,
    } = await supabase.auth.getUser(token);
    if (authErr || !authUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: ownerRow, error: ownerErr } = await supabase
      .from('professionals')
      .select('id, user:users!inner(auth_id)')
      .eq('id', professionalId)
      .maybeSingle();

    if (ownerErr) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to verify professional ownership',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const ownerAuthId = (ownerRow as any)?.user?.auth_id as string | undefined;
    if (!ownerAuthId || ownerAuthId !== authUser.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 1) Resolve professional name (optional)
    let professionalName = professionalNameFromClient;
    if (!professionalName) {
      const { data: profRow, error: profErr } = await supabase
        .from('professionals')
        .select('id, user:users!inner(name)')
        .eq('id', professionalId)
        .maybeSingle();

      if (profErr) {
        console.warn(
          '⚠️ [notify-feed-followers] Failed loading professional name',
          {
            professionalId,
            message: profErr.message,
          }
        );
      } else {
        professionalName = (profRow as any)?.user?.name ?? undefined;
      }
    }

    const title = `New Post${
      professionalName ? ` from ${professionalName}` : ''
    }`;
    const messageBody = professionalName
      ? `${professionalName} just shared a new update. Check it out!`
      : `A professional you follow just shared a new update. Check it out!`;

    // 2) Get followers (favorites)
    const { data: favorites, error: favErr } = await supabase
      .from('favorites')
      .select('user_id')
      .eq('professional_id', professionalId);

    if (favErr) {
      console.error('❌ [notify-feed-followers] Failed fetching favorites', {
        professionalId,
        message: favErr.message,
      });
      return new Response(
        JSON.stringify({ success: false, error: 'Failed fetching followers' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const userIds = Array.from(
      new Set((favorites || []).map((f: any) => f.user_id).filter(Boolean))
    );

    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          result: { success: 0, failed: 0, errors: ['No followers found'] },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 3) Get active device tokens for all followers
    const { data: devices, error: devErr } = await supabase
      .from('user_devices')
      .select('user_id, push_token')
      .in('user_id', userIds)
      .eq('is_active', true);

    if (devErr) {
      console.error(
        '❌ [notify-feed-followers] Failed fetching device tokens',
        {
          message: devErr.message,
        }
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed fetching device tokens',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const tokens = (devices || [])
      .map((d: any) => d.push_token)
      .filter((t: any) => typeof t === 'string')
      .filter(
        (t: string) =>
          t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken[')
      );

    const uniqueTokens = Array.from(new Set(tokens));

    if (uniqueTokens.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          result: { success: 0, failed: 0, errors: ['No valid push tokens'] },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const payloadData: Record<string, unknown> = {
      type: 'feed_post',
      professional_id: professionalId,
      feed_id: feedId,
      action_url:
        actionUrl ??
        `talkee://professional/${professionalId}?tab=feed&feed_id=${feedId}`,
    };

    const messages: PushMessage[] = uniqueTokens.map((token) => ({
      to: token,
      sound: 'default',
      title,
      body: messageBody,
      data: payloadData,
      priority: 'high',
      channelId: 'talkee-default-v2',
    }));

    // 4) Send to Expo in batches
    let totalSuccess = 0;
    let totalFailed = 0;
    const errors: string[] = [];

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);

      const resp = await fetch(EXPO_PUSH_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(batch),
      });

      const text = await resp.text().catch(() => '');
      if (!resp.ok) {
        totalFailed += batch.length;
        errors.push(
          `Expo API error: ${resp.status} ${resp.statusText} ${text.slice(
            0,
            120
          )}`
        );
        continue;
      }

      let tickets: PushTicket[] = [];
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) tickets = parsed;
        else if (parsed?.data && Array.isArray(parsed.data))
          tickets = parsed.data;
      } catch (_e) {
        // ignore parse error
      }

      if (!tickets.length) {
        // If we can't parse tickets, assume accepted to avoid false negatives.
        totalSuccess += batch.length;
        continue;
      }

      for (const t of tickets) {
        if (t.status === 'ok') totalSuccess++;
        else {
          totalFailed++;
          errors.push(t.details?.error || t.message || 'Unknown Expo error');
        }
      }
    }

    const result = {
      success: totalSuccess > 0,
      result: {
        success: totalSuccess,
        failed: totalFailed,
        errors,
        meta: {
          follower_user_ids: userIds.length,
          tokens: uniqueTokens.length,
        },
      },
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('❌ [notify-feed-followers] Unhandled error', {
      message: e?.message ?? String(e),
      stack: e?.stack,
    });
    return new Response(
      JSON.stringify({ success: false, error: e?.message ?? 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
