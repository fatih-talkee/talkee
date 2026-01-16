/**
 * Supabase Edge Function: Charge Call Minute (Per-Minute Billing)
 *
 * This function charges the caller for a specific minute of a call.
 * Called by the client at the start of each minute (00:01, 01:00, 02:00, etc.)
 *
 * Usage:
 *   POST /functions/v1/charge-call-minute
 *   Body: {
 *     call_id: string,
 *     minute_number: number, // 1, 2, 3, etc. (1-based)
 *   }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const body = await req.json();
    const { call_id, minute_number } = body;

    if (!call_id || !minute_number || minute_number < 1) {
      return new Response(
        JSON.stringify({ error: 'Invalid call_id or minute_number' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('💰 [CHARGE-CALL-MINUTE] Charging minute', {
      call_id,
      minute_number,
    });

    // Load call record
    const { data: callRow, error: callErr } = await supabase
      .from('calls')
      .select(
        `
        id,
        caller_id,
        professional_id,
        rate_per_minute,
        status,
        start_time,
        professional:professionals!professional_id(user_id)
      `
      )
      .eq('id', call_id)
      .single();

    if (callErr || !callRow) {
      console.error('❌ [CHARGE-CALL-MINUTE] Call not found', {
        call_id,
        error: callErr?.message,
      });
      return new Response(JSON.stringify({ error: 'Call not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Allow pending status for first minute due to race condition:
    // The call may be connected (client sees it) but DB status update is still in progress.
    // For subsequent minutes, we only allow active/in-progress.
    const allowedStatuses = minute_number === 1 
      ? ['active', 'in-progress', 'pending'] 
      : ['active', 'in-progress'];
    
    if (!allowedStatuses.includes(callRow.status)) {
      console.warn('⚠️ [CHARGE-CALL-MINUTE] Call not active', {
        call_id,
        status: callRow.status,
        minute_number,
        allowedStatuses,
      });
      return new Response(JSON.stringify({ error: 'Call is not active' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ratePerMinute = Number((callRow as any).rate_per_minute || 0);
    const minuteCost = ratePerMinute; // One minute cost

    if (minuteCost <= 0) {
      console.warn('⚠️ [CHARGE-CALL-MINUTE] Invalid rate', {
        call_id,
        ratePerMinute,
      });
      return new Response(
        JSON.stringify({ error: 'Invalid rate_per_minute' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if this minute was already charged (idempotency)
    const { data: existingTx, error: txCheckErr } = await supabase
      .from('transactions')
      .select('id')
      .eq('call_id', call_id)
      .eq('type', 'call_expense')
      .eq('description', `Call minute ${minute_number}`)
      .maybeSingle();

    if (txCheckErr) {
      console.warn(
        '⚠️ [CHARGE-CALL-MINUTE] Failed checking existing transaction',
        {
          call_id,
          error: txCheckErr.message,
        }
      );
    }

    if (existingTx) {
      console.log(
        'ℹ️ [CHARGE-CALL-MINUTE] Minute already charged (idempotency)',
        {
          call_id,
          minute_number,
          transaction_id: existingTx.id,
        }
      );
      return new Response(
        JSON.stringify({
          success: true,
          already_charged: true,
          minute_number,
          cost: minuteCost,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get caller's current balance
    const { data: caller, error: callerErr } = await supabase
      .from('users')
      .select('wallet_balance')
      .eq('id', (callRow as any).caller_id)
      .single();

    if (callerErr || !caller) {
      console.error('❌ [CHARGE-CALL-MINUTE] Caller not found', {
        call_id,
        caller_id: (callRow as any).caller_id,
        error: callerErr?.message,
      });
      return new Response(JSON.stringify({ error: 'Caller not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const currentBalance = Number(caller.wallet_balance || 0);

    // ✅ FIX: Directly update wallet_balance instead of using add_user_credits
    // add_user_credits RPC doesn't support call_expense type and has constraints
    const callerId = (callRow as any).caller_id;

    // Deduct from caller's wallet
    const { error: chargeErr } = await supabase
      .from('users')
      .update({
        wallet_balance: currentBalance - minuteCost,
        updated_at: new Date().toISOString(),
      })
      .eq('id', callerId);

    if (chargeErr) {
      console.error('❌ [CHARGE-CALL-MINUTE] Charge failed', {
        call_id,
        minute_number,
        error: chargeErr.message,
      });
      return new Response(
        JSON.stringify({ error: 'Charge failed', details: chargeErr.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create transaction record for caller (expense)
    // Note: amount must be positive (DB constraint), the type 'call_expense' indicates it's an expense
    const { error: txErr } = await supabase.from('transactions').insert({
      user_id: callerId,
      type: 'call_expense',
      amount: minuteCost, // Positive value - the type indicates it's an expense
      description: `Call minute ${minute_number}`,
      call_id: call_id,
      status: 'completed',
    });

    if (txErr) {
      console.warn('⚠️ [CHARGE-CALL-MINUTE] Transaction record failed', {
        call_id,
        minute_number,
        error: txErr.message,
      });
    }

    // Get updated balance
    const { data: updatedCaller } = await supabase
      .from('users')
      .select('wallet_balance')
      .eq('id', (callRow as any).caller_id)
      .single();

    const newBalance = Number(updatedCaller?.wallet_balance || 0);

    // Check if next minute is affordable
    const nextMinuteAffordable = newBalance >= ratePerMinute;

    console.log('✅ [CHARGE-CALL-MINUTE] Minute charged', {
      call_id,
      minute_number,
      cost: minuteCost,
      old_balance: currentBalance,
      new_balance: newBalance,
      next_minute_affordable: nextMinuteAffordable,
    });

    return new Response(
      JSON.stringify({
        success: true,
        minute_number,
        cost: minuteCost,
        old_balance: currentBalance,
        new_balance: newBalance,
        next_minute_affordable: nextMinuteAffordable,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('❌ [CHARGE-CALL-MINUTE] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
