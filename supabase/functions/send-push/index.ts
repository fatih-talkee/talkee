/**
 * Supabase Edge Function: Send Push Notification
 *
 * This function sends push notifications via Expo Push API
 *
 * Usage:
 *   POST /functions/v1/send-push
 *   Body: {
 *     user_id: string,
 *     title: string,
 *     body: string,
 *     data?: object,
 *     sound?: 'default' | null,
 *     badge?: number,
 *     priority?: 'default' | 'normal' | 'high'
 *   }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

interface PushMessage {
  to: string;
  sound: 'default' | null;
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
}

interface PushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: {
    error?:
      | 'DeviceNotRegistered'
      | 'InvalidCredentials'
      | 'MessageTooBig'
      | 'MessageRateExceeded';
  };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers':
          'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const body = await req.json();
    const {
      user_id,
      title,
      body: messageBody,
      data,
      sound,
      badge,
      priority,
      channelId,
    } = body;

    // Validate required fields
    if (!user_id || !title || !messageBody) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: user_id, title, body',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get all active device tokens for the user
    const { data: devices, error: fetchError } = await supabase
      .from('user_devices')
      .select('push_token, platform')
      .eq('user_id', user_id)
      .eq('is_active', true);

    if (fetchError) {
      console.error('Error fetching device tokens:', fetchError);
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch device tokens',
          details: fetchError.message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!devices || devices.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          result: {
            success: 0,
            failed: 0,
            errors: ['No active devices found'],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Filter valid tokens
    const validTokens = devices
      .map((d) => d.push_token)
      .filter((token) => {
        if (!token || typeof token !== 'string') return false;
        return (
          token.startsWith('ExponentPushToken[') ||
          token.startsWith('ExpoPushToken[')
        );
      });

    if (validTokens.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          result: {
            success: 0,
            failed: devices.length,
            errors: ['No valid push tokens'],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create messages
    const messages: PushMessage[] = validTokens.map((token) => ({
      to: token,
      sound: sound ?? 'default',
      title,
      body: messageBody,
      data,
      badge,
      priority: priority ?? 'default',
      channelId,
    }));

    // Send in batches
    let totalSuccess = 0;
    let totalFailed = 0;
    const allErrors: string[] = [];

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);

      try {
        const response = await fetch(EXPO_PUSH_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
          },
          body: JSON.stringify(batch),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Expo Push API error:', response.status, errorText);
          totalFailed += batch.length;
          allErrors.push(
            `Batch ${i / BATCH_SIZE + 1}: ${response.status} ${
              response.statusText
            }`
          );
          continue;
        }

        const tickets: PushTicket[] = await response.json();

        // Process tickets
        for (let j = 0; j < tickets.length; j++) {
          const ticket = tickets[j];
          if (ticket.status === 'ok') {
            totalSuccess++;
          } else {
            totalFailed++;
            const errorMsg =
              ticket.details?.error || ticket.message || 'Unknown error';
            allErrors.push(`Token ${i + j}: ${errorMsg}`);

            // Mark token as inactive if device not registered
            if (ticket.details?.error === 'DeviceNotRegistered') {
              await supabase
                .from('user_devices')
                .update({
                  is_active: false,
                  updated_at: new Date().toISOString(),
                })
                .eq('push_token', batch[j].to)
                .catch((err) => {
                  console.error('Error marking token as inactive:', err);
                });
            }
          }
        }
      } catch (error) {
        console.error('Error sending push notification batch:', error);
        totalFailed += batch.length;
        allErrors.push(
          `Batch ${i / BATCH_SIZE + 1}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        result: {
          success: totalSuccess,
          failed: totalFailed,
          errors: allErrors,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error in send-push function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
