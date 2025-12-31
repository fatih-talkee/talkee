import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

function base64Encode(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

async function hmacSha1Base64(
  secret: string,
  message: string
): Promise<string> {
  const keyData = new TextEncoder().encode(secret);
  const msgData = new TextEncoder().encode(message);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, msgData);
  return base64Encode(new Uint8Array(sig));
}

function extractUserIdFromTwilioAddress(value?: string | null): string | null {
  if (!value) return null;
  const s = value.trim();
  if (!s) return null;
  if (s.startsWith('client:')) return s.slice('client:'.length);
  // Some setups may send the identity directly
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
  ) {
    return s;
  }
  return null;
}

function resolveCalleeUserIdFromWebhookPayload(
  data: Record<string, string>
): string | null {
  // Twilio status callbacks can provide the dialed party under different fields depending on configuration.
  // We prefer `To`, but fall back to `Called` (often present) and a couple other variants.
  return (
    extractUserIdFromTwilioAddress(data.To) ||
    extractUserIdFromTwilioAddress((data as any).Called) ||
    extractUserIdFromTwilioAddress((data as any).ToFormatted) ||
    extractUserIdFromTwilioAddress((data as any).CalledVia) ||
    null
  );
}

async function resolveCallIdFromParticipants(params: {
  supabase: any;
  callSid?: string;
  callerUserId?: string | null;
  calleeUserId?: string | null;
}): Promise<string | null> {
  const { supabase, callSid, callerUserId, calleeUserId } = params;
  const sinceIso = new Date(Date.now() - 30 * 60_000).toISOString();

  // Best match: caller + callee identities.
  if (callerUserId && calleeUserId) {
    const { data: row, error } = await supabase
      .from('calls')
      .select('id, professional:professionals!professional_id(user_id)')
      .eq('caller_id', callerUserId)
      .eq('professional.user_id', calleeUserId)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && row?.id) {
      console.log(
        'ℹ️ [twilio-webhook] Resolved CallId from participants (caller+callee)',
        {
          CallSid: callSid,
          CallId: row.id,
          callerUserId,
          calleeUserId,
        }
      );
      return row.id;
    }
  }

  // Next best: callee identity only.
  if (calleeUserId) {
    const { data: row, error } = await supabase
      .from('calls')
      .select('id, professional:professionals!professional_id(user_id)')
      .eq('professional.user_id', calleeUserId)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && row?.id) {
      console.log(
        'ℹ️ [twilio-webhook] Resolved CallId from callee (fallback)',
        {
          CallSid: callSid,
          CallId: row.id,
          calleeUserId,
        }
      );
      return row.id;
    }
  }

  // Next best: caller identity only (existing behavior).
  if (callerUserId) {
    const { data: row, error } = await supabase
      .from('calls')
      .select('id')
      .eq('caller_id', callerUserId)
      .in('status', ['pending', 'active'])
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && row?.id) {
      console.log(
        'ℹ️ [twilio-webhook] Resolved CallId from caller (fallback)',
        {
          CallSid: callSid,
          CallId: row.id,
          callerUserId,
        }
      );
      return row.id;
    }
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

    // Optional (but strongly recommended): verify Twilio signature to prevent spoofed callbacks.
    // If TWILIO_AUTH_TOKEN is not set, verification is disabled (we accept the request, but log).
    // If it is set, we validate against TWILIO_WEBHOOK_URL (preferred) and req.url as fallback.
    const twilioAuthToken = (Deno.env.get('TWILIO_AUTH_TOKEN') ?? '').trim();
    const twilioSignature =
      req.headers.get('x-twilio-signature') ||
      req.headers.get('X-Twilio-Signature') ||
      '';

    if (!twilioAuthToken) {
      console.warn(
        '⚠️ [twilio-webhook] TWILIO_AUTH_TOKEN missing; signature verification disabled'
      );
    } else if (!twilioSignature) {
      console.warn(
        '⚠️ [twilio-webhook] Missing X-Twilio-Signature header; cannot verify'
      );
    } else {
      const sorted = Object.entries(data).sort(([a], [b]) =>
        a.localeCompare(b)
      );
      const paramsString = sorted.map(([k, v]) => `${k}${v}`).join('');

      const configuredUrl = (Deno.env.get('TWILIO_WEBHOOK_URL') ?? '').trim();
      const candidates = [configuredUrl, req.url].filter((u) =>
        Boolean((u ?? '').trim())
      );

      let verified = false;
      for (const url of candidates) {
        const toSign = `${url}${paramsString}`;
        const expected = await hmacSha1Base64(twilioAuthToken, toSign);
        if (expected === twilioSignature) {
          verified = true;
          break;
        }
      }

      if (!verified) {
        console.error('❌ [twilio-webhook] Invalid Twilio signature', {
          urlCandidates: candidates,
        });
        return new Response(
          '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
          {
            headers: { 'Content-Type': 'text/xml' },
            status: 403,
          }
        );
      }
    }

    console.log('📊 [twilio-webhook] Call data:', {
      CallSid: data.CallSid,
      CallStatus: data.CallStatus,
      From: data.From,
      To: data.To,
      Called: (data as any).Called,
      CalledVia: (data as any).CalledVia,
      Caller: (data as any).Caller,
      Direction: (data as any).Direction,
      ParentCallSid: (data as any).ParentCallSid,
      Duration: data.CallDuration,
    });

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const callSid = data.CallSid;
    let callId: string | undefined = data.CallId || data.CallID || data.call_id;
    const status = mapTwilioStatus(data.CallStatus);
    const duration = data.CallDuration ? parseInt(data.CallDuration) : 0;

    // If the Twilio callback doesn't include our internal CallId, try to resolve it.
    // Some configurations don't forward custom params to status callbacks.
    if (!callId) {
      const callerUserId =
        extractUserIdFromTwilioAddress(data.From) ||
        extractUserIdFromTwilioAddress((data as any).Caller) ||
        extractUserIdFromTwilioAddress((data as any).FromFormatted) ||
        null;

      const calleeUserId = resolveCalleeUserIdFromWebhookPayload(data);

      // First, try to resolve via call_sid (CallSid is always provided by Twilio).
      // Our mobile app persists call_sid on the calls row after connect/accept.
      if (callSid) {
        const { data: bySid, error: bySidErr } = await supabase
          .from('calls')
          .select('id')
          .eq('call_sid', callSid)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (bySidErr) {
          console.warn(
            '⚠️ [twilio-webhook] Failed resolving CallId from call_sid',
            {
              CallSid: callSid,
              message: bySidErr.message,
            }
          );
        } else if (bySid?.id) {
          callId = bySid.id;
          console.log(
            'ℹ️ [twilio-webhook] Resolved CallId from call_sid (fallback)',
            {
              CallSid: callSid,
              CallId: callId,
            }
          );
        }
      }

      // If still missing, resolve from participants (callee/caller) without relying on custom params.
      if (!callId) {
        const resolved = await resolveCallIdFromParticipants({
          supabase,
          callSid,
          callerUserId,
          calleeUserId,
        });
        if (resolved) callId = resolved;
      }
    }

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
        calleeUserId = resolveCalleeUserIdFromWebhookPayload(data);
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

      // Verify call exists. If it doesn't, DO NOT create a new calls row here (caller_id/professional_id are required).
      const { data: existingCall, error: existingErr } = await supabase
        .from('calls')
        .select('id, start_time, end_time')
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

        // ✅ FIX: Only set start_time if it's not already set by client-side
        // This ensures start_time is set when the call actually connects (not when initiated)
        // Both caller and callee will have the same start_time (when connected event fires)
        if (status === 'in-progress' && !existingCall.start_time) {
          updatePayload.start_time = nowIso;
          console.log('📊 [twilio-webhook] Setting start_time (client-side not set yet)', {
            CallId: callId,
            startTime: nowIso,
          });
        } else if (status === 'in-progress' && existingCall.start_time) {
          console.log('📊 [twilio-webhook] start_time already set by client-side, skipping', {
            CallId: callId,
            existingStartTime: existingCall.start_time,
          });
        }
        if (isEnded) {
          updatePayload.end_time = nowIso;
          
          // Calculate duration: use Twilio duration if available, otherwise calculate from start_time/end_time
          let calculatedDuration = duration;
          if (calculatedDuration <= 0 && existingCall.start_time) {
            const startTime = new Date(existingCall.start_time);
            const endTime = new Date(nowIso);
            calculatedDuration = Math.max(0, Math.floor((endTime.getTime() - startTime.getTime()) / 1000));
            console.log('📊 [twilio-webhook] Calculated duration from timestamps', {
              CallId: callId,
              startTime: existingCall.start_time,
              endTime: nowIso,
              calculatedDurationSeconds: calculatedDuration,
            });
          }
          
          // Convert to minutes, minimum 1 minute for completed calls
          const durationMinutes = isEnded && dbStatus === 'completed' 
            ? Math.max(1, Math.ceil(calculatedDuration / 60))
            : Math.max(0, Math.ceil(calculatedDuration / 60));
          
          updatePayload.duration_minutes = durationMinutes;
          
          console.log('📊 [twilio-webhook] Duration calculation', {
            CallId: callId,
            twilioDuration: duration,
            calculatedDuration,
            durationMinutes,
            dbStatus,
          });
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
      console.log(
        'ℹ️ [twilio-webhook] No CallId provided; skipping DB update',
        {
          CallSid: callSid,
          From: data.From,
          To: data.To,
          Called: (data as any).Called,
        }
      );
    }

    // Handle billing for completed calls (best-effort + idempotent via transactions table)
    if (status === 'completed' && callId) {
      try {
        const nowIso = new Date().toISOString();

        const { data: callRow, error: callErr } = await supabase
          .from('calls')
          .select(
            `
            id,
            caller_id,
            professional_id,
            rate_per_minute,
            total_cost,
            start_time,
            end_time,
            duration_minutes,
            caller:users!caller_id(name),
            professional:professionals!professional_id(
              user_id,
              users!inner(name)
            )
          `
          )
          .eq('id', callId)
          .single();

        if (callErr || !callRow) {
          console.error('❌ [twilio-webhook] Billing: call row not found', {
            CallId: callId,
            message: callErr?.message,
          });
        } else {
          // Calculate duration: use DB duration_minutes if available, otherwise calculate from timestamps
          let durationMinutes = (callRow as any).duration_minutes || 0;
          
          if (durationMinutes <= 0 && (callRow as any).start_time && (callRow as any).end_time) {
            const startTime = new Date((callRow as any).start_time);
            const endTime = new Date((callRow as any).end_time);
            const calculatedDurationSeconds = Math.max(0, Math.floor((endTime.getTime() - startTime.getTime()) / 1000));
            // Use same logic as per-minute billing: Math.floor(duration / 60) + 1
            // This ensures consistency with upfront per-minute billing
            // Example: 60 seconds = 2 minutes (1st + 2nd minute entered)
            durationMinutes = Math.max(1, Math.floor(calculatedDurationSeconds / 60) + 1);
            
            console.log('📊 [twilio-webhook] Billing: Calculated duration from DB timestamps', {
              CallId: callId,
              startTime: (callRow as any).start_time,
              endTime: (callRow as any).end_time,
              calculatedDurationSeconds,
              durationMinutes,
            });
          } else if (durationMinutes <= 0 && duration > 0) {
            // Fallback to Twilio duration if DB doesn't have it
            // Use same logic as per-minute billing: Math.floor(duration / 60) + 1
            durationMinutes = Math.max(1, Math.floor(duration / 60) + 1);
            console.log('📊 [twilio-webhook] Billing: Using Twilio duration', {
              CallId: callId,
              twilioDuration: duration,
              durationMinutes,
            });
          }
          
          // Ensure minimum 1 minute for completed calls
          // Use same logic as per-minute billing: each new minute entered charges the full minute
          // This matches the upfront per-minute billing logic (industry standard)
          // Example: 2 min 1 sec = 3 minutes charged (1st + 2nd + 3rd minute)
          durationMinutes = Math.max(1, durationMinutes);
          
          const ratePerMinute = Number((callRow as any).rate_per_minute || 0);
          // Calculate total cost based on per-minute billing logic
          // This should match what was actually charged via per-minute billing
          const computedTotalCost = Number(
            (durationMinutes * ratePerMinute).toFixed(2)
          );
          
          console.log('💰 [twilio-webhook] Billing calculation', {
            CallId: callId,
            durationMinutes,
            ratePerMinute,
            computedTotalCost,
          });

          // Persist duration + total_cost for user stats/history.
          // (We do this even if we end up skipping billing due to missing users, etc.)
          // Update duration_minutes if it was calculated (might be 0 in DB)
          const updatePayload: Record<string, unknown> = {
            status: 'completed',
            end_time: nowIso,
            total_cost: computedTotalCost,
            updated_at: nowIso,
          };
          
          // Only update duration_minutes if it's better than what's in DB
          if (durationMinutes > ((callRow as any).duration_minutes || 0)) {
            updatePayload.duration_minutes = durationMinutes;
          }
          
          const { error: callUpdateErr } = await supabase
            .from('calls')
            .update(updatePayload)
            .eq('id', callId);

          if (callUpdateErr) {
            console.warn(
              '⚠️ [twilio-webhook] Billing: failed updating call cost',
              {
                CallId: callId,
                message: callUpdateErr.message,
              }
            );
          }

          if (computedTotalCost > 0) {
            const callerId = (callRow as any).caller_id as string;
            const professionalId = (callRow as any).professional_id as string;
            const professionalUserId =
              (callRow as any)?.professional?.user_id ?? null;
            const callerName = (callRow as any)?.caller?.name ?? null;
            const professionalName =
              (callRow as any)?.professional?.users?.name ?? null;

            if (!professionalUserId) {
              console.error(
                '❌ [twilio-webhook] Billing: could not resolve professional user_id',
                {
                  CallId: callId,
                  professionalId,
                }
              );
            } else {
              // Idempotency: if transactions exist for this call, do not double-charge.
              const { data: existingTx, error: txErr } = await supabase
                .from('transactions')
                .select('id, user_id, type')
                .eq('call_id', callId)
                .in('type', ['call_expense', 'call_earning']);

              if (txErr) {
                console.warn(
                  '⚠️ [twilio-webhook] Billing: failed loading existing transactions (continuing)',
                  {
                    CallId: callId,
                    message: txErr.message,
                  }
                );
              }

              const txList: any[] = Array.isArray(existingTx) ? existingTx : [];
              const hasCallerExpense = txList.some(
                (t) => t?.type === 'call_expense' && t?.user_id === callerId
              );
              const hasProfessionalEarning = txList.some(
                (t) =>
                  t?.type === 'call_earning' &&
                  t?.user_id === professionalUserId
              );

              // 80% goes to professional, 20% platform commission.
              const professionalEarnings = Number(
                (computedTotalCost * 0.8).toFixed(2)
              );

              if (!hasCallerExpense) {
                const { error: debitErr } = await supabase.rpc(
                  'add_user_credits',
                  {
                    p_user_id: callerId,
                    p_amount: -computedTotalCost,
                    p_type: 'call_expense',
                    p_description: `Call expense (${durationMinutes} min)`,
                    p_stripe_payment_intent_id: null,
                  }
                );

                if (debitErr) {
                  console.error(
                    '❌ [twilio-webhook] Billing: caller debit failed',
                    {
                      CallId: callId,
                      callerId,
                      amount: computedTotalCost,
                      message: debitErr.message,
                    }
                  );
                } else {
                  const { error: txInsertErr } = await supabase
                    .from('transactions')
                    .insert({
                      user_id: callerId,
                      type: 'call_expense',
                      amount: computedTotalCost,
                      description: `Call with ${
                        professionalName || 'professional'
                      }`,
                      call_id: callId,
                      status: 'completed',
                    });

                  if (txInsertErr) {
                    console.warn(
                      '⚠️ [twilio-webhook] Billing: failed inserting caller transaction',
                      {
                        CallId: callId,
                        callerId,
                        message: txInsertErr.message,
                      }
                    );
                  }
                }
              }

              if (!hasProfessionalEarning && professionalEarnings > 0) {
                const { error: earnErr } = await supabase.rpc(
                  'add_user_credits',
                  {
                    p_user_id: professionalUserId,
                    p_amount: professionalEarnings,
                    p_type: 'call_earning',
                    p_description: `Call earning (${durationMinutes} min)`,
                    p_stripe_payment_intent_id: null,
                  }
                );

                if (earnErr) {
                  console.error(
                    '❌ [twilio-webhook] Billing: professional credit failed',
                    {
                      CallId: callId,
                      professionalUserId,
                      amount: professionalEarnings,
                      message: earnErr.message,
                    }
                  );
                } else {
                  const { error: txInsertErr } = await supabase
                    .from('transactions')
                    .insert({
                      user_id: professionalUserId,
                      type: 'call_earning',
                      amount: professionalEarnings,
                      description: `Earnings from call with ${
                        callerName || 'caller'
                      }`,
                      call_id: callId,
                      status: 'completed',
                    });

                  if (txInsertErr) {
                    console.warn(
                      '⚠️ [twilio-webhook] Billing: failed inserting professional transaction',
                      {
                        CallId: callId,
                        professionalUserId,
                        message: txInsertErr.message,
                      }
                    );
                  }
                }
              }

              console.log(
                '✅ [twilio-webhook] Billing processed (best-effort)',
                {
                  CallId: callId,
                  durationMinutes,
                  ratePerMinute,
                  computedTotalCost,
                  professionalEarnings,
                  skippedCaller: hasCallerExpense,
                  skippedProfessional: hasProfessionalEarning,
                }
              );
            }
          }
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
