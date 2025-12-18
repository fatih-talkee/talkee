import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

function extractUserIdFromTwilioAddress(value?: string | null): string | null {
  if (!value) return null;
  const s = value.trim();
  if (s.startsWith('client:')) return s.slice('client:'.length);
  // Some setups may send the identity directly
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
  ) {
    return s;
  }
  return null;
}

async function sendPush(
  userId: string,
  title: string,
  body: string,
  data: Record<string, unknown>
): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl) {
    console.warn('⚠️ [twilio-webhook] SUPABASE_URL missing; cannot send push');
    return;
  }
  if (!serviceRoleKey) {
    console.warn(
      '⚠️ [twilio-webhook] SUPABASE_SERVICE_ROLE_KEY missing; cannot send push'
    );
    return;
  }

  const resp = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Use service role JWT so this works even when verify_jwt=true on the function.
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
    body: JSON.stringify({
      user_id: userId,
      title,
      body,
      data,
      priority: 'high',
      channelId: 'talkee-default-v2',
      sound: 'default',
    }),
  });

  const text = await resp.text().catch(() => '');
  console.log('📨 [twilio-webhook] Follow-up push sent', {
    ok: resp.ok,
    status: resp.status,
    userId,
    title,
    bodyPreview: body.slice(0, 80),
    responsePreview: text.slice(0, 200),
  });
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('📞 [twilio-webhook] Webhook received');

    // Parse form data from Twilio
    const formData = await req.formData();
    const data: Record<string, string> = {};

    for (const [key, value] of formData.entries()) {
      data[key] = value.toString();
    }

    console.log('📊 [twilio-webhook] Call data:', {
      CallSid: data.CallSid,
      CallStatus: data.CallStatus,
      From: data.From,
      To: data.To,
      Duration: data.CallDuration,
    });

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const callSid = data.CallSid;
    const callId = data.CallId || data.CallID || data.call_id;
    const status = mapTwilioStatus(data.CallStatus);
    const duration = data.CallDuration ? parseInt(data.CallDuration) : 0;

    // Map Twilio status -> DB + push semantics
    const isEnded = [
      'completed',
      'failed',
      'busy',
      'no-answer',
      'canceled',
    ].includes(status);
    const isMissed = status === 'no-answer' || status === 'busy';

    // If ended-without-answer, send a follow-up push so the callee doesn't keep seeing "Incoming call" indefinitely.
    if (isEnded) {
      // Prefer looking up the callee from our DB call record (CallId we passed from the app).
      let calleeUserId: string | null = null;
      let callerName: string | null = null;

      if (callId) {
        const { data: callRow, error: callErr } = await supabase
          .from('calls')
          .select(
            'id, caller:users!caller_id(name), professional:professionals!professional_id(user_id)'
          )
          .eq('id', callId)
          .single();

        if (callErr) {
          console.warn(
            '⚠️ [twilio-webhook] Could not load call row for follow-up push',
            {
              CallId: callId,
              message: callErr.message,
            }
          );
        } else {
          calleeUserId = (callRow as any)?.professional?.user_id ?? null;
          callerName = (callRow as any)?.caller?.name ?? null;
        }
      }

      // Fallback: parse from Twilio To/From (usually "client:<identity>")
      if (!calleeUserId) {
        calleeUserId = extractUserIdFromTwilioAddress(data.To);
      }

      if (calleeUserId) {
        const pushType = isMissed ? 'call_missed' : 'call_ended';
        const title = isMissed ? 'Missed Call' : 'Call Ended';
        const body = isMissed
          ? `You missed a call from ${callerName || 'Someone'}.`
          : `The call has ended.`;

        await sendPush(calleeUserId, title, body, {
          type: pushType,
          call_id: callId ?? null,
          call_sid: callSid,
          twilio_status: status,
        });
      } else {
        console.warn(
          '⚠️ [twilio-webhook] Could not resolve callee user id for follow-up push',
          {
            CallId: callId,
            To: data.To,
            CallSid: callSid,
            status,
          }
        );
      }
    }

    // Best-effort DB update (only if we have our internal CallId).
    // IMPORTANT: Never upsert here. If the call row doesn't exist, we skip DB writes.
    if (callId) {
      const nowIso = new Date().toISOString();
      const durationMinutes = Math.max(0, Math.ceil(duration / 60));

      // Verify call exists. If it doesn't, DO NOT create a new calls row here (caller_id/professional_id are required).
      const { data: existingCall, error: existingErr } = await supabase
        .from('calls')
        .select('id')
        .eq('id', callId)
        .maybeSingle();

      if (existingErr) {
        console.warn(
          '⚠️ [twilio-webhook] Failed checking call existence; skipping DB update',
          {
            CallId: callId,
            message: existingErr.message,
          }
        );
      } else if (!existingCall) {
        console.warn(
          '⚠️ [twilio-webhook] CallId not found in DB; skipping DB update',
          {
            CallId: callId,
            CallSid: callSid,
            status,
          }
        );
      } else {
        const dbStatus =
          status === 'in-progress'
            ? 'active'
            : status === 'completed'
            ? 'completed'
            : status === 'no-answer' || status === 'busy'
            ? 'missed'
            : status === 'canceled' || status === 'failed'
            ? 'cancelled'
            : 'pending';

        const updatePayload: Record<string, unknown> = {
          status: dbStatus,
          updated_at: nowIso,
        };

        if (status === 'in-progress') {
          updatePayload.start_time = nowIso;
        }
        if (isEnded) {
          updatePayload.end_time = nowIso;
          updatePayload.duration_minutes = durationMinutes;
        }

        const { error: updateErr } = await supabase
          .from('calls')
          .update(updatePayload)
          .eq('id', callId);

        if (updateErr) {
          console.warn(
            '⚠️ [twilio-webhook] Failed updating call row (best-effort)',
            {
              CallId: callId,
              message: updateErr.message,
            }
          );
        } else {
          console.log('✅ [twilio-webhook] Call row updated (best-effort)', {
            CallId: callId,
            dbStatus,
            isEnded,
            duration,
          });
        }
      }
    } else {
      console.log('ℹ️ [twilio-webhook] No CallId provided; skipping DB update');
    }

    // Handle billing for completed calls
    if (status === 'completed' && duration > 0 && callId) {
      try {
        const { data: call } = await supabase
          .from('calls')
          .select('caller_id, professional_id, total_cost, rate_per_minute')
          .eq('id', callId)
          .single();

        if (call && call.total_cost > 0) {
          // Deduct credits from caller
          const { error: creditError } = await supabase.rpc('deduct_credits', {
            p_user_id: call.caller_id,
            p_amount: call.total_cost,
          });

          if (creditError) {
            console.error(
              '❌ [twilio-webhook] Credit deduction error:',
              creditError
            );
          } else {
            console.log(
              '💰 [twilio-webhook] Credits deducted:',
              call.total_cost
            );
          }

          // Add earnings to professional (80% commission)
          const professionalEarnings = call.total_cost * 0.8;
          const { error: earningsError } = await supabase.rpc('add_earnings', {
            p_user_id: call.professional_id,
            p_amount: professionalEarnings,
          });

          if (earningsError) {
            console.error('❌ [twilio-webhook] Earnings error:', earningsError);
          } else {
            console.log(
              '💰 [twilio-webhook] Earnings added:',
              professionalEarnings
            );
          }

          console.log('✅ [twilio-webhook] Billing completed');
        }
      } catch (billingError) {
        console.error('❌ [twilio-webhook] Billing error:', billingError);
        // Don't throw - webhook should still succeed
      }
    }

    // Return TwiML response (empty response)
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        headers: { 'Content-Type': 'text/xml' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('❌ [twilio-webhook] Error:', error);
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        headers: { 'Content-Type': 'text/xml' },
        status: 200, // Return 200 even on error to prevent Twilio retries
      }
    );
  }
});

// Map Twilio status to our status
function mapTwilioStatus(twilioStatus: string): string {
  const statusMap: Record<string, string> = {
    queued: 'initiated',
    ringing: 'ringing',
    'in-progress': 'in-progress',
    completed: 'completed',
    busy: 'busy',
    'no-answer': 'no-answer',
    failed: 'failed',
    canceled: 'canceled',
  };

  return statusMap[twilioStatus] || twilioStatus;
}
