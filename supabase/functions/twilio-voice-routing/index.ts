import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

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
    console.log('📞 [twilio-voice-routing] Voice request received');

    // Parse form data from Twilio
    const formData = await req.formData();
    const data: Record<string, string> = {};

    for (const [key, value] of formData.entries()) {
      data[key] = value.toString();
    }

    console.log('📊 [twilio-voice-routing] Request data:', {
      From: data.From,
      To: data.To,
      CallSid: data.CallSid,
      Direction: data.Direction,
      // Custom parameters we passed from mobile app
      CallId: data.CallId,
      CallType: data.CallType,
      Urgent: data.Urgent,
    });

    // Get the target user ID (professional to call)
    // This comes from our mobile app's voice.connect() params
    const targetUserId = data.To;

    if (!targetUserId) {
      console.error('❌ [twilio-voice-routing] Missing To parameter');
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, the call could not be completed. Missing recipient information.</Say>
  <Hangup/>
</Response>`,
        {
          headers: { 'Content-Type': 'text/xml' },
          status: 200,
        }
      );
    }

    // Generate TwiML response to route call to the target client
    // <Client> tag tells Twilio to route this to a Voice SDK client (not a phone number)
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Client>${targetUserId}</Client>
  </Dial>
</Response>`;

    console.log(
      '✅ [twilio-voice-routing] Routing call to client:',
      targetUserId
    );

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' },
      status: 200,
    });
  } catch (error: any) {
    console.error('❌ [twilio-voice-routing] Error:', error);

    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, an error occurred. Please try again later.</Say>
  <Hangup/>
</Response>`,
      {
        headers: { 'Content-Type': 'text/xml' },
        status: 200,
      }
    );
  }
});
