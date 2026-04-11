import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.101.1';

/**
 * poll-omni-status — umjesto webhook-a, aktivno povlaci status iz Omni-ja.
 *
 * Za svaki unique omni_sending_id koji jos nije "final":
 *   1. GET /v1/sendings/{sending_id}/recipients
 *   2. Za svaki recipient, azuriraj viber_dlr/sms_dlr u nasim tabelama
 *      (campaign_recipients i notifications) po omni_recipient_id
 *   3. Ako je Viber failed i channel_mode=viber_then_sms i jos nije fallbacked:
 *      posalji SMS kroz rakunat, oznaci fallbacked=true
 *
 * Zove se iz pg_cron svaki 2 minuta.
 * Alternativa za webhook omni-delivery-report (koji je sad deprecated).
 */

const OMNI_BASE = 'https://api.omni-messaging.com/v1';
const SMS_PROXY = 'https://www.rakunat.com/_functions/smssend';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VIBER_FAIL_STATES = new Set(['failed', 'expired', 'blocked', 'no_suitable_device', 'not_viber_user']);
const VIBER_FINAL_STATES = new Set([...VIBER_FAIL_STATES, 'delivered']);
const SMS_FINAL_STATES = new Set(['delivered', 'not_delivered', 'invalid_msisdn', 'expired', 'call_barred']);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function basicAuthHeader(userId: string, authKey: string): string {
  return `Basic ${btoa(`${userId}:${authKey}`)}`;
}

function formatPhone(phone: string): string {
  return (phone || '').replace(/[^\d+]/g, '').replace(/^\+/, '');
}

function stripDiacritics(text: string): string {
  if (!text) return '';
  return text.replace(/đ/g, 'dz').replace(/Đ/g, 'Dz').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function buildPersonalizedText(template: string, ime: string): string {
  const parts = (ime || '').split(' ');
  const first = parts[0] || '';
  const last = parts.slice(1).join(' ');
  return template
    .replaceAll('{ime}', first)
    .replaceAll('{prezime}', last)
    .replaceAll('{ime_prezime}', ime || '')
    .replaceAll('{tag 1}', first)
    .replaceAll('{tag 2}', last);
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
        source: 'ordinacija-poll-fallback',
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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Omni kredencijali + SMS fallback kredencijali
    const { data: settings } = await supabase
      .from('reminder_settings')
      .select('omni_user_id, omni_auth_key, sms_api_key, sms_sender_name, sms_email, channel_mode')
      .limit(1)
      .maybeSingle();

    if (!settings?.omni_user_id || !settings?.omni_auth_key) {
      return jsonResponse({ success: false, error: 'Omni kredencijali nisu konfigurisani' });
    }

    const authHeader = basicAuthHeader(settings.omni_user_id, settings.omni_auth_key);

    // 2. Skupi unique sending_id-jeve iz oba izvora
    const sendingIds = new Set<string>();

    // 2a. Kampanje koje jos nisu zavrsene
    const { data: activeCampaigns } = await supabase
      .from('campaigns')
      .select('id, omni_sending_id, channel_mode')
      .not('omni_sending_id', 'is', null)
      .in('status', ['sending', 'scheduled']);

    for (const c of activeCampaigns || []) {
      if (c.omni_sending_id) sendingIds.add(c.omni_sending_id);
    }

    // 2b. Podsjetnici (notifications) sa pending Viber DLR
    const { data: pendingReminders } = await supabase
      .from('notifications')
      .select('omni_sending_id')
      .not('omni_sending_id', 'is', null)
      .eq('channel_used', 'viber')
      .or('viber_dlr.is.null,viber_dlr.eq.pending');

    for (const n of pendingReminders || []) {
      if (n.omni_sending_id) sendingIds.add(n.omni_sending_id);
    }

    if (sendingIds.size === 0) {
      return jsonResponse({ success: true, polled: 0, message: 'Nema pending sending_id-jeva' });
    }

    let totalRecipients = 0;
    let updatedViber = 0;
    let updatedSms = 0;
    let fallbacksTriggered = 0;
    let fallbacksOk = 0;

    // 3. Za svaki sending_id, povlaci recipients
    for (const sid of sendingIds) {
      const res = await fetch(`${OMNI_BASE}/sendings/${sid}/recipients`, {
        method: 'GET',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json; charset=UTF-8',
        },
      });

      if (!res.ok) continue;
      const data = await res.json().catch(() => ({}));
      if (data?.status !== 'success') continue;

      const recipients = data.data || [];
      totalRecipients += recipients.length;

      for (const rcp of recipients) {
        const omniRecipientId = rcp.id;
        const viberMsg = rcp.messages?.viber;
        const smsMsg = rcp.messages?.sms;

        const viberDlr = viberMsg?.dlr || null;
        const viberMessageStatus = viberMsg?.message_status || null;
        const smsDlr = smsMsg?.dlr || null;

        // 3a. Update campaign_recipients (ako postoji)
        const { data: camp } = await supabase
          .from('campaign_recipients')
          .select('*, campaign:campaigns(channel_mode, sms_text, viber_text, sms_sender)')
          .eq('omni_recipient_id', omniRecipientId)
          .maybeSingle();

        if (camp) {
          const updates: any = { updated_at: new Date().toISOString() };
          if (viberDlr && viberDlr !== camp.viber_dlr) {
            updates.viber_dlr = viberDlr;
            updatedViber++;
          }
          if (viberMessageStatus) updates.viber_message_status = viberMessageStatus;
          if (smsDlr && smsDlr !== camp.sms_dlr) {
            updates.sms_dlr = smsDlr;
            updatedSms++;
          }
          if (Object.keys(updates).length > 1) {
            await supabase.from('campaign_recipients').update(updates).eq('id', camp.id);
          }

          // Fallback Viber -> SMS za kampanju
          const c = camp.campaign;
          if (
            viberDlr &&
            VIBER_FAIL_STATES.has(viberDlr) &&
            c?.channel_mode === 'viber_then_sms' &&
            !camp.fallbacked &&
            settings.sms_api_key
          ) {
            fallbacksTriggered++;
            const smsText = buildPersonalizedText(c.sms_text || c.viber_text || '', camp.ime);
            const smsSender = c.sms_sender || settings.sms_sender_name || '';

            const smsResult = await sendSmsRakunat(
              camp.telefon,
              smsText,
              settings.sms_api_key,
              smsSender,
              settings.sms_email || '',
            );

            await supabase.from('campaign_recipients').update({
              channel_used: 'sms',
              fallbacked: true,
              sms_dlr: smsResult.success ? 'submitted' : 'not_delivered',
              error: smsResult.error || null,
              updated_at: new Date().toISOString(),
            }).eq('id', camp.id);

            if (smsResult.success) fallbacksOk++;
          }
          continue;
        }

        // 3b. Ako nije kampanja, probaj notifications (podsjetnik)
        const { data: notif } = await supabase
          .from('notifications')
          .select('*')
          .eq('omni_recipient_id', omniRecipientId)
          .maybeSingle();

        if (notif) {
          const updates: any = { updated_at: new Date().toISOString() };
          if (viberDlr && viberDlr !== notif.viber_dlr) {
            updates.viber_dlr = viberDlr;
            updatedViber++;
          }
          if (smsDlr && smsDlr !== notif.sms_dlr) {
            updates.sms_dlr = smsDlr;
            updatedSms++;
          }
          if (Object.keys(updates).length > 1) {
            await supabase.from('notifications').update(updates).eq('id', notif.id);
          }

          // Fallback za podsjetnik
          if (
            viberDlr &&
            VIBER_FAIL_STATES.has(viberDlr) &&
            settings.channel_mode === 'viber_then_sms' &&
            !notif.fallbacked &&
            settings.sms_api_key
          ) {
            fallbacksTriggered++;
            const smsResult = await sendSmsRakunat(
              notif.patient_telefon,
              notif.sadrzaj,
              settings.sms_api_key,
              settings.sms_sender_name || '',
              settings.sms_email || '',
            );

            await supabase.from('notifications').update({
              channel_used: 'sms',
              kanal: 'sms',
              fallbacked: true,
              status: smsResult.success ? 'sent' : 'failed',
              sms_dlr: smsResult.success ? 'submitted' : 'not_delivered',
              error: smsResult.error || null,
              updated_at: new Date().toISOString(),
            }).eq('id', notif.id);

            if (smsResult.success) fallbacksOk++;
          }
        }
      }

      // 4. Rekalkulisi aggregate stats iz campaign_recipients (idempotentno)
      const camp = (activeCampaigns || []).find((c) => c.omni_sending_id === sid);
      if (camp) {
        const { data: allRec } = await supabase
          .from('campaign_recipients')
          .select('viber_dlr, viber_message_status, sms_dlr, channel_used, fallbacked, clicked')
          .eq('campaign_id', camp.id);

        if (allRec) {
          const viberDelivered = allRec.filter((r: any) => r.viber_dlr === 'delivered').length;
          const smsDelivered = allRec.filter((r: any) => r.sms_dlr === 'delivered' || r.sms_dlr === 'submitted').length;
          const seen = allRec.filter((r: any) => r.viber_message_status === 'seen').length;
          const clicked = allRec.filter((r: any) => r.clicked === true).length;
          const fallback = allRec.filter((r: any) => r.fallbacked === true).length;
          const failed = allRec.filter((r: any) =>
            (r.viber_dlr && VIBER_FAIL_STATES.has(r.viber_dlr) && !r.fallbacked) ||
            (r.sms_dlr && ['not_delivered', 'invalid_msisdn', 'expired', 'call_barred'].includes(r.sms_dlr))
          ).length;
          const deliveredTotal = viberDelivered + smsDelivered;

          const allDone = (recipients as any[]).every((r) => {
            const vdlr = r.messages?.viber?.dlr;
            const sdlr = r.messages?.sms?.dlr;
            return (
              (!vdlr || VIBER_FINAL_STATES.has(vdlr)) &&
              (!sdlr || SMS_FINAL_STATES.has(sdlr))
            );
          });

          const updates: any = {
            delivered_count: deliveredTotal,
            viber_delivered_count: viberDelivered,
            sms_delivered_count: smsDelivered,
            seen_count: seen,
            clicked_count: clicked,
            fallback_count: fallback,
            failed_count: failed,
          };

          if (allDone) {
            updates.status = 'completed';
            updates.completed_at = new Date().toISOString();
          }

          await supabase.from('campaigns').update(updates).eq('id', camp.id);
        }
      }
    }

    return jsonResponse({
      success: true,
      polled: sendingIds.size,
      total_recipients: totalRecipients,
      updated_viber: updatedViber,
      updated_sms: updatedSms,
      fallbacks_triggered: fallbacksTriggered,
      fallbacks_succeeded: fallbacksOk,
    });
  } catch (error: any) {
    return jsonResponse({ success: false, error: error.message || 'Unexpected error' }, 500);
  }
});
