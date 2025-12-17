import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const status = mapTwilioStatus(data.CallStatus);
    const duration = data.CallDuration ? parseInt(data.CallDuration) : 0;

    // Prepare update object
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    // Handle different call states
    if (status === 'ringing') {
      console.log('📱 [twilio-webhook] Call is ringing');
    } else if (status === 'in-progress') {
      updates.started_at = new Date().toISOString();
      console.log('✅ [twilio-webhook] Call started');
    } else if (
      ['completed', 'failed', 'busy', 'no-answer', 'canceled'].includes(status)
    ) {
      updates.ended_at = new Date().toISOString();
      updates.duration_seconds = duration;

      if (data.RecordingSid) {
        updates.recording_sid = data.RecordingSid;
        updates.recording_url = data.RecordingUrl;
      }

      console.log('🏁 [twilio-webhook] Call ended:', { status, duration });
    }

    // Update or insert call record
    const { data: callData, error } = await supabase
      .from('calls')
      .upsert(
        {
          call_sid: callSid,
          ...updates,
        },
        {
          onConflict: 'call_sid',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) {
      console.error('❌ [twilio-webhook] Database error:', error);
      throw error;
    }

    console.log('✅ [twilio-webhook] Call record updated');

    // Handle billing for completed calls
    if (status === 'completed' && duration > 0) {
      try {
        const { data: call } = await supabase
          .from('calls')
          .select('caller_id, professional_id, total_cost, rate_per_minute')
          .eq('call_sid', callSid)
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
