/**
 * Supabase Edge Function: Send Availability Reminder
 *
 * This function sends push notifications to professionals 15 minutes before their scheduled availability starts.
 * Should be called by an external cron service (e.g., cron-job.org) every 5-10 minutes.
 *
 * Usage:
 *   POST /functions/v1/send-availability-reminder
 *   Headers: Authorization: Bearer <service_role_key>
 *
 * External cron setup (example with cron-job.org):
 *   - URL: https://<your-project>.supabase.co/functions/v1/send-availability-reminder
 *   - Method: POST
 *   - Headers: Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 *   - Schedule: Every 5 minutes (*/5 * * * *)
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
    // Get authorization header (service role key required)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('⏰ [AVAILABILITY-REMINDER] Checking for upcoming availabilities...');

    const now = new Date();
    const reminderTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now

    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    const reminderDay = reminderTime.toLocaleDateString('en-US', { weekday: 'long' });
    const reminderTimeStr = `${reminderTime.getHours().toString().padStart(2, '0')}:${reminderTime
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
    const reminderDate = reminderTime.toISOString().split('T')[0];

    console.log('⏰ [AVAILABILITY-REMINDER] Checking for availabilities starting at', {
      reminderTime: reminderTimeStr,
      reminderDay,
      reminderDate,
    });

    // Find availabilities that start in 15 minutes
    const { data: availabilities, error: availErr } = await supabase
      .from('availabilities')
      .select(
        `
        id,
        professional_id,
        available_at,
        days,
        date,
        start_hour,
        price_per_minute,
        professional:professionals!professional_id(
          user_id,
          is_available,
          users!inner(id, name)
        )
      `
      )
      .eq('available_at', 'every')
      .not('start_hour', 'is', null)
      .not('days', 'is', null);

    if (availErr) {
      console.error('❌ [AVAILABILITY-REMINDER] Error fetching availabilities', {
        error: availErr.message,
      });
      return new Response(
        JSON.stringify({ error: 'Failed to fetch availabilities' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const list: any[] = Array.isArray(availabilities) ? availabilities : [];
    const remindersToSend: Array<{
      professionalUserId: string;
      professionalName: string;
      availability: any;
    }> = [];

    for (const avail of list) {
      if (!avail.professional?.user_id) continue;
      if (!avail.start_hour) continue;

      // Check if this availability starts in ~15 minutes
      if (avail.available_at === 'every' && Array.isArray(avail.days)) {
        // Check if reminderDay is in the days array
        const dayMatch = avail.days.some(
          (d: string) => d.toLowerCase() === reminderDay.toLowerCase()
        );

        if (dayMatch && avail.start_hour === reminderTimeStr) {
          remindersToSend.push({
            professionalUserId: avail.professional.user_id,
            professionalName: avail.professional.users?.name || 'Professional',
            availability: avail,
          });
        }
      } else if (avail.available_at === 'specific' && avail.date === reminderDate) {
        if (avail.start_hour === reminderTimeStr) {
          remindersToSend.push({
            professionalUserId: avail.professional.user_id,
            professionalName: avail.professional.users?.name || 'Professional',
            availability: avail,
          });
        }
      }
    }

    console.log('📨 [AVAILABILITY-REMINDER] Found reminders to send', {
      count: remindersToSend.length,
    });

    // Send push notifications
    let sentCount = 0;
    let failedCount = 0;

    for (const reminder of remindersToSend) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

        const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceRoleKey}`,
            apikey: serviceRoleKey,
          },
          body: JSON.stringify({
            user_id: reminder.professionalUserId,
            title: 'Availability Starting Soon',
            body: `Your availability starts in 15 minutes at ${reminder.availability.start_hour}.`,
            data: {
              type: 'availability_reminder',
              availability_id: reminder.availability.id,
              start_hour: reminder.availability.start_hour,
              price_per_minute: reminder.availability.price_per_minute,
            },
            sound: 'default',
            priority: 'high',
            channelId: 'talkee-default-v2',
          }),
        });

        if (pushResponse.ok) {
          sentCount++;
          console.log('✅ [AVAILABILITY-REMINDER] Reminder sent', {
            professionalUserId: reminder.professionalUserId,
            availability_id: reminder.availability.id,
          });
        } else {
          failedCount++;
          const errorText = await pushResponse.text().catch(() => '');
          console.warn('⚠️ [AVAILABILITY-REMINDER] Failed to send reminder', {
            professionalUserId: reminder.professionalUserId,
            status: pushResponse.status,
            error: errorText,
          });
        }
      } catch (err) {
        failedCount++;
        console.error('❌ [AVAILABILITY-REMINDER] Error sending reminder', {
          professionalUserId: reminder.professionalUserId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked_at: now.toISOString(),
        reminder_time: reminderTime.toISOString(),
        reminders_found: remindersToSend.length,
        sent: sentCount,
        failed: failedCount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ [AVAILABILITY-REMINDER] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
