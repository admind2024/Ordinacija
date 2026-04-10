import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.101.1';

/**
 * omni-delivery-report — JAVAN webhook endpoint za Omni Messaging.
 *
 * Omni POST-a delivery status za svaku poruku. Expected payload:
 *   {
 *     id: "SD-abcd1234-000001",
 *     transaction_id: "...",
 *     sending_id: "SD-abcd1234",
 *     channel: "viber" | "sms" | "push",
 *     dlr: "delivered" | "failed" | "not_viber_user" | ...,
 *     dlr_timestamp: 1504000030,
 *     message_status?: "seen" | "not_seen"
 *   }
 *
 * Sta radi:
 *   1. Nadje campaign_recipient po omni_recipient_id
 *   2. Update viber_dlr / viber_message_status
 *   3. Ako channel=viber i dlr je FINAL-FAIL (failed/expired/blocked/no_suitable_device/not_viber_user)
 *      i kampanja ima channel_mode='viber_then_sms' → fallback SMS preko rakunat, oznaci fallbacked=true
 *   4. Update aggregate statistiku u campaigns tabeli
 *
 * URL za registraciju u Omni admin panelu (API Settings > Delivery Report Callback URL):
 *   https://pedgschrivtpbzcoqniu.supabase.co/functions/v1/omni-delivery-report
 *
 * Deploy: `supabase functions deploy omni-delivery-report --no-verify-jwt`
 */

const SMS_PROXY = 'https://www.rakunat.com/_functions/smssend';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VIBER_FAIL_STATES = new Set(['failed', 'expired', 'blocked', 'no_suitable_device', 'not_viber_user']);
const VIBER_FINAL_OK = new Set(['delivered']);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function formatPhone(phone: string): string {
  return (phone || '').replace(/[^\d+]/g, '').replace(/^\+/, '');
}

function stripDiacritics(text: string): string {
  if (!text) return '';
  return text.replace(/đ/g, 'dz').replace(/Đ/g, 'Dz').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function buildPersonalizedText(template: string, ime: string): string {
  const parts = ime.split(' ');
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ');
  return template
    .replaceAll('{ime}', firstName)
    .replaceAll('{prezime}', lastName)
    .replaceAll('{ime_prezime}', ime)
    .replaceAll('{tag 1}', firstName)
    .replaceAll('{tag 2}', lastName);
}

async function sendSmsRakunat(
  phone: string,
  text: string,
  apiKey: string,
  senderName: string,
  email: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(SMS_PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: formatPhone(phone),
        text: stripDiacritics(text),
        apiKey,
        senderName,
        userEmail: email || '',
        campaignId: '',
        source: 'ordinacija-campaign-fallback',
      }),
    });
    const result = await res.json();
    return result.success ? { success: true } : { success: false, error: result.error || 'Slanje nije uspjelo' };
  } catch (e: any) {
    return { success: false, error: e.message || 'Greska pri slanju' };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Only POST' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const payload = await req.json().catch(() => ({}));

    // Omni moze poslati ili jedan objekat ili niz (batch) — podrzimo oboje
    const events = Array.isArray(payload) ? payload : [payload];

    let processed = 0;
    let fallbackAttempts = 0;
    let fallbackSucceeded = 0;

    for (const evt of events) {
      const { id: omniRecipientId, channel, dlr, dlr_timestamp, message_status, sending_id } = evt;
      if (!omniRecipientId || !channel || !dlr) continue;

      // 1a. Probaj prvo kao campaign_recipient
      const { data: recipient } = await supabase
        .from('campaign_recipients')
        .select('*, campaign:campaigns(*)')
        .eq('omni_recipient_id', omniRecipientId)
        .maybeSingle();

      // 1b. Ako nije campaign — probaj kao notifications (podsjetnik)
      if (!recipient) {
        const { data: notif } = await supabase
          .from('notifications')
          .select('*')
          .eq('omni_recipient_id', omniRecipientId)
          .maybeSingle();

        if (!notif) continue;

        // Update notification sa DLR-om
        const notifUpdates: any = { updated_at: new Date().toISOString() };
        if (channel === 'viber') {
          notifUpdates.viber_dlr = dlr;
        } else if (channel === 'sms') {
          notifUpdates.sms_dlr = dlr;
        }
        await supabase.from('notifications').update(notifUpdates).eq('id', notif.id);

        // Fallback Viber → SMS za podsjetnik
        if (
          channel === 'viber' &&
          VIBER_FAIL_STATES.has(dlr) &&
          !notif.fallbacked
        ) {
          // Ucitaj channel_mode iz reminder_settings
          const { data: settings } = await supabase
            .from('reminder_settings')
            .select('channel_mode, sms_api_key, sms_sender_name, sms_email')
            .limit(1)
            .maybeSingle();

          if (settings?.channel_mode === 'viber_then_sms' && settings.sms_api_key) {
            const smsResult = await sendSmsRakunat(
              notif.patient_telefon,
              notif.sadrzaj,
              settings.sms_api_key,
              settings.sms_sender_name || '',
              settings.sms_email || '',
            );

            await supabase
              .from('notifications')
              .update({
                channel_used: 'sms',
                kanal: 'sms',
                fallbacked: true,
                status: smsResult.success ? 'sent' : 'failed',
                sms_dlr: smsResult.success ? 'submitted' : 'not_delivered',
                error: smsResult.error || null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', notif.id);
          } else {
            // Nema fallback opcije — samo oznaci kao failed
            await supabase
              .from('notifications')
              .update({
                status: 'failed',
                error: `Viber DLR: ${dlr}`,
                updated_at: new Date().toISOString(),
              })
              .eq('id', notif.id);
          }
        }

        processed++;
        continue;
      }

      // 2. Update DLR fields
      const updates: any = { updated_at: new Date().toISOString() };
      if (channel === 'viber') {
        updates.viber_dlr = dlr;
        if (message_status) updates.viber_message_status = message_status;
      } else if (channel === 'sms') {
        updates.sms_dlr = dlr;
      }
      await supabase.from('campaign_recipients').update(updates).eq('id', recipient.id);

      processed++;

      // 3. Fallback Viber → SMS (kroz rakunat)
      const campaign = recipient.campaign;
      if (
        channel === 'viber' &&
        VIBER_FAIL_STATES.has(dlr) &&
        campaign?.channel_mode === 'viber_then_sms' &&
        !recipient.fallbacked
      ) {
        fallbackAttempts++;

        // Ucitaj SMS kredencijale
        const { data: settings } = await supabase
          .from('reminder_settings')
          .select('sms_api_key, sms_sender_name, sms_email')
          .limit(1)
          .maybeSingle();

        if (!settings?.sms_api_key) {
          await supabase
            .from('campaign_recipients')
            .update({ error: 'SMS fallback: sms_api_key nije konfigurisan', updated_at: new Date().toISOString() })
            .eq('id', recipient.id);
          continue;
        }

        const smsText = buildPersonalizedText(campaign.sms_text || campaign.viber_text || '', recipient.ime);
        const smsSender = campaign.sms_sender || settings.sms_sender_name || '';

        const smsResult = await sendSmsRakunat(
          recipient.telefon,
          smsText,
          settings.sms_api_key,
          smsSender,
          settings.sms_email || '',
        );

        await supabase
          .from('campaign_recipients')
          .update({
            channel_used: 'sms',
            fallbacked: true,
            sms_dlr: smsResult.success ? 'submitted' : 'not_delivered',
            error: smsResult.error || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', recipient.id);

        if (smsResult.success) fallbackSucceeded++;

        // Update kampanja stats
        await supabase.rpc('increment_campaign_fallback', { p_campaign_id: campaign.id }).catch(() => {
          // Fallback: direktan update ako RPC ne postoji
          supabase
            .from('campaigns')
            .update({ sent_sms: (campaign.sent_sms || 0) + (smsResult.success ? 1 : 0) })
            .eq('id', campaign.id);
        });
      }

      // 4. Update delivered count
      if (channel === 'viber' && VIBER_FINAL_OK.has(dlr)) {
        await supabase
          .from('campaigns')
          .update({ delivered_count: (campaign?.delivered_count || 0) + 1 })
          .eq('id', campaign.id);
      }
    }

    return jsonResponse({
      success: true,
      processed,
      fallback_attempts: fallbackAttempts,
      fallback_succeeded: fallbackSucceeded,
    });
  } catch (error: any) {
    return jsonResponse({ success: false, error: error.message || 'Unexpected error' }, 500);
  }
});
