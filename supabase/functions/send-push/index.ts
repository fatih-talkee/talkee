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
    console.log('📤 [SEND-PUSH] Function invoked');

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ [SEND-PUSH] Missing authorization header');
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
    console.log('📥 [SEND-PUSH] Request body received:', {
      user_id: body.user_id,
      title: body.title,
      body: body.body?.substring(0, 50) + '...',
      has_data: !!body.data,
      sound: body.sound,
      priority: body.priority,
      channelId: body.channelId,
    });

    let user_id: string = body.user_id;
    const title: string = body.title;
    const messageBody: string = body.body;
    const data: Record<string, any> | undefined = body.data;
    const sound: 'default' | null | undefined = body.sound;
    const badge: number | undefined = body.badge;
    const priority: 'default' | 'normal' | 'high' | undefined = body.priority;
    const channelId: string | undefined = body.channelId;

    // Validate required fields
    if (!user_id || !title || !messageBody) {
      console.error('❌ [SEND-PUSH] Missing required fields:', {
        has_user_id: !!user_id,
        has_title: !!title,
        has_body: !!messageBody,
      });
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: user_id, title, body',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify user exists first - try both id and auth_id
    console.log('🔍 [SEND-PUSH] Verifying user exists:', user_id);

    // First try by users.id
    let { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, auth_id, name')
      .eq('id', user_id)
      .single();

    // If not found by id, try by auth_id
    if (userError || !userData) {
      console.log(
        '🔍 [SEND-PUSH] User not found by id, trying auth_id:',
        user_id
      );
      const { data: userByAuthId, error: authIdError } = await supabase
        .from('users')
        .select('id, auth_id, name')
        .eq('auth_id', user_id)
        .single();

      if (authIdError || !userByAuthId) {
        console.error('❌ [SEND-PUSH] User not found by id or auth_id:', {
          searched_user_id: user_id,
          id_error: userError?.message,
          auth_id_error: authIdError?.message,
        });
        return new Response(
          JSON.stringify({
            success: false,
            error: 'User not found',
            details: `User with id/auth_id ${user_id} not found`,
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      } else {
        userData = userByAuthId;
        console.log('✅ [SEND-PUSH] User found by auth_id:', {
          users_id: userData.id,
          auth_id: userData.auth_id,
          searched_id: user_id,
          name: userData.name,
        });
        // Update user_id to the actual users.id for device lookup
        user_id = userData.id;
      }
    } else {
      console.log('✅ [SEND-PUSH] User found by id:', {
        users_id: userData.id,
        auth_id: userData.auth_id,
        name: userData.name,
      });
    }

    // Get all active device tokens for the user (using users.id)
    console.log('🔍 [SEND-PUSH] Fetching device tokens for user:', user_id);
    console.log('🔍 [SEND-PUSH] Using service role key (RLS bypassed)');

    // Also try to see what devices exist in total (for debugging)
    const { data: allDevices, error: allDevicesError } = await supabase
      .from('user_devices')
      .select('user_id, push_token, platform, is_active')
      .eq('is_active', true)
      .limit(10);

    console.log('🔍 [SEND-PUSH] Sample of all active devices (first 10):', {
      count: allDevices?.length || 0,
      sample_user_ids: allDevices?.map(
        (d) => d.user_id?.substring(0, 20) + '...'
      ),
    });

    const { data: devices, error: fetchError } = await supabase
      .from('user_devices')
      .select(
        'push_token, platform, device_name, device_id, is_active, created_at, updated_at, user_id'
      )
      .eq('user_id', user_id)
      .eq('is_active', true);

    if (fetchError) {
      console.error('❌ [SEND-PUSH] Error fetching device tokens:', fetchError);
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch device tokens',
          details: fetchError.message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('📱 [SEND-PUSH] Device tokens query result:', {
      device_count: devices?.length || 0,
      devices: devices?.map((d) => ({
        platform: d.platform,
        device_name: d.device_name,
        device_id: d.device_id?.substring(0, 20) + '...',
        has_token: !!d.push_token,
        token_length: d.push_token?.length || 0,
        token_preview: d.push_token?.substring(0, 30) + '...',
        created_at: d.created_at,
        updated_at: d.updated_at,
      })),
    });

    if (!devices || devices.length === 0) {
      console.warn('⚠️ [SEND-PUSH] No active devices found for user:', user_id);
      return new Response(
        JSON.stringify({
          success: false,
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
    console.log('🔍 [SEND-PUSH] Filtering valid tokens...');
    const validTokens = devices
      .map((d) => d.push_token)
      .filter((token) => {
        if (!token || typeof token !== 'string') {
          console.warn(
            '⚠️ [SEND-PUSH] Invalid token type:',
            typeof token,
            token?.substring(0, 20)
          );
          return false;
        }
        const isValid =
          token.startsWith('ExponentPushToken[') ||
          token.startsWith('ExpoPushToken[');
        if (!isValid) {
          console.warn(
            '⚠️ [SEND-PUSH] Token does not start with ExponentPushToken or ExpoPushToken:',
            token.substring(0, 30)
          );
        }
        return isValid;
      });

    console.log('✅ [SEND-PUSH] Token validation result:', {
      total_devices: devices.length,
      valid_tokens: validTokens.length,
      invalid_tokens: devices.length - validTokens.length,
      valid_token_previews: validTokens.map((t) => t.substring(0, 40) + '...'),
    });

    if (validTokens.length === 0) {
      console.error('❌ [SEND-PUSH] No valid push tokens found');
      return new Response(
        JSON.stringify({
          success: false,
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
    console.log('📝 [SEND-PUSH] Creating push messages...');
    const messages: PushMessage[] = validTokens.map((token) => ({
      to: token,
      sound: sound ?? 'default',
      title,
      body: messageBody,
      data,
      badge,
      priority: priority ?? 'high', // Default to high for faster delivery
      channelId: channelId ?? 'talkee-default-v2', // Use the new channel by default
    }));

    console.log('📨 [SEND-PUSH] Messages created:', {
      message_count: messages.length,
      first_message: {
        to: messages[0]?.to?.substring(0, 40) + '...',
        title: messages[0]?.title,
        body: messages[0]?.body?.substring(0, 50) + '...',
        sound: messages[0]?.sound,
        priority: messages[0]?.priority,
        has_data: !!messages[0]?.data,
        channelId: messages[0]?.channelId,
      },
    });

    // Send in batches
    let totalSuccess = 0;
    let totalFailed = 0;
    const allErrors: string[] = [];
    const batchCount = Math.ceil(messages.length / BATCH_SIZE);

    console.log(
      `📤 [SEND-PUSH] Sending ${messages.length} messages in ${batchCount} batch(es)...`
    );

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

      console.log(`📦 [SEND-PUSH] Batch ${batchNumber}/${batchCount}:`, {
        batch_size: batch.length,
        batch_start_index: i,
        batch_end_index: i + batch.length - 1,
        first_token_preview: batch[0]?.to?.substring(0, 40) + '...',
      });

      try {
        const requestPayload = JSON.stringify(batch);
        console.log(`🌐 [SEND-PUSH] Sending request to Expo Push API...`, {
          url: EXPO_PUSH_API_URL,
          method: 'POST',
          payload_size: requestPayload.length,
          payload_preview: requestPayload.substring(0, 200) + '...',
        });

        const response = await fetch(EXPO_PUSH_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
          },
          body: requestPayload,
        });

        console.log(`📥 [SEND-PUSH] Expo API response received:`, {
          status: response.status,
          status_text: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ [SEND-PUSH] Expo Push API error:', {
            status: response.status,
            status_text: response.statusText,
            error_text: errorText,
            batch_number: batchNumber,
          });
          totalFailed += batch.length;
          allErrors.push(
            `Batch ${batchNumber}: ${response.status} ${
              response.statusText
            } - ${errorText.substring(0, 100)}`
          );
          continue;
        }

        const responseText = await response.text();
        console.log(`📥 [SEND-PUSH] Expo API response body:`, {
          response_length: responseText.length,
          response_preview: responseText.substring(0, 500) + '...',
        });

        let tickets: PushTicket[] = [];
        try {
          const parsedResponse = JSON.parse(responseText);

          // Expo Push API v2 returns { data: [...] } format
          // Handle both direct array and wrapped response
          if (Array.isArray(parsedResponse)) {
            tickets = parsedResponse;
          } else if (
            parsedResponse.data &&
            Array.isArray(parsedResponse.data)
          ) {
            tickets = parsedResponse.data;
          } else {
            console.error(
              '❌ [SEND-PUSH] Unexpected Expo API response format:',
              {
                parsed_response_type: typeof parsedResponse,
                has_data: !!parsedResponse.data,
                is_array: Array.isArray(parsedResponse),
                response_keys: Object.keys(parsedResponse || {}),
              }
            );
            totalFailed += batch.length;
            allErrors.push(
              `Batch ${batchNumber}: Unexpected response format from Expo API`
            );
            continue;
          }
        } catch (parseError) {
          console.error('❌ [SEND-PUSH] Failed to parse Expo API response:', {
            error: parseError,
            response_text: responseText,
          });
          totalFailed += batch.length;
          allErrors.push(
            `Batch ${batchNumber}: Invalid JSON response from Expo API`
          );
          continue;
        }

        console.log(
          `🎫 [SEND-PUSH] Processing ${tickets.length} ticket(s) from batch ${batchNumber}...`
        );

        // Process tickets
        for (let j = 0; j < tickets.length; j++) {
          const ticket = tickets[j];
          const tokenIndex = i + j;
          const token = batch[j]?.to;

          console.log(
            `🎫 [SEND-PUSH] Ticket ${j + 1}/${tickets.length} (token ${
              tokenIndex + 1
            }):`,
            {
              status: ticket.status,
              id: ticket.id,
              message: ticket.message,
              details: ticket.details,
              token_preview: token?.substring(0, 40) + '...',
            }
          );

          if (ticket.status === 'ok') {
            totalSuccess++;
            console.log(
              `✅ [SEND-PUSH] Token ${
                tokenIndex + 1
              } accepted by Expo API (ticket id: ${ticket.id})`
            );
          } else {
            totalFailed++;
            const errorMsg =
              ticket.details?.error || ticket.message || 'Unknown error';
            console.error(`❌ [SEND-PUSH] Token ${tokenIndex + 1} rejected:`, {
              error: errorMsg,
              details: ticket.details,
              message: ticket.message,
              token_preview: token?.substring(0, 40) + '...',
            });
            allErrors.push(
              `Token ${tokenIndex + 1} (${token?.substring(
                0,
                30
              )}...): ${errorMsg}`
            );

            // Mark token as inactive if device not registered
            if (ticket.details?.error === 'DeviceNotRegistered') {
              console.log(
                `🔴 [SEND-PUSH] Marking token as inactive (DeviceNotRegistered):`,
                {
                  token_preview: token?.substring(0, 40) + '...',
                }
              );
              await supabase
                .from('user_devices')
                .update({
                  is_active: false,
                  updated_at: new Date().toISOString(),
                })
                .eq('push_token', token)
                .then((result) => {
                  if (result.error) {
                    console.error(
                      '❌ [SEND-PUSH] Error marking token as inactive:',
                      result.error
                    );
                  } else {
                    console.log(
                      `✅ [SEND-PUSH] Token marked as inactive successfully`
                    );
                  }
                })
                .catch((err) => {
                  console.error(
                    '❌ [SEND-PUSH] Exception marking token as inactive:',
                    err
                  );
                });
            }
          }
        }
      } catch (error) {
        console.error(
          `❌ [SEND-PUSH] Exception sending batch ${batchNumber}:`,
          {
            error: error instanceof Error ? error.message : String(error),
            error_stack: error instanceof Error ? error.stack : undefined,
            batch_number: batchNumber,
            batch_size: batch.length,
          }
        );
        totalFailed += batch.length;
        allErrors.push(
          `Batch ${batchNumber}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }

    console.log('📊 [SEND-PUSH] Final summary:', {
      total_success: totalSuccess,
      total_failed: totalFailed,
      total_messages: messages.length,
      errors: allErrors,
    });

    const finalResult = {
      success: totalSuccess > 0,
      result: {
        success: totalSuccess,
        failed: totalFailed,
        errors: allErrors,
      },
    };

    console.log('✅ [SEND-PUSH] Function completed successfully:', finalResult);

    return new Response(JSON.stringify(finalResult), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('❌ [SEND-PUSH] Unhandled error in function:', {
      error: error instanceof Error ? error.message : String(error),
      error_stack: error instanceof Error ? error.stack : undefined,
      error_type: typeof error,
    });
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
