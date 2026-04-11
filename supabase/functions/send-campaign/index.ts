import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.101.1';

/**
 * send-campaign — pokrece kampanju (Viber kroz Omni, SMS kroz rakunat proxy).
 *
 * Input:
 *   { campaign_id: string, dry_run?: boolean }
 *
 * Logika:
 *   1. Ucita kampanju i Omni/SMS kredencijale iz reminder_settings
 *   2. Razrijesi target_type u listu primalaca (patients + contacts) sa personalization tags
 *   3. Ako dry_run: vrati samo broj primalaca i estimated cost
 *   4. Insert campaign_recipients
 *   5. Ako channel_mode je 'sms': batch SMS kroz rakunat proxy (sinhrono, jedan-po-jedan)
 *   6. Ako channel_mode je 'viber' ili 'viber_then_sms': POST /sendings na Omni sa viber channel
 *      (fallback SMS na rakunat radi webhook handler omni-delivery-report kad stigne failed DLR)
 *   7. Zapisi sending_id u campaigns, update status, vrati summary
 *
 * Scheduled kampanje:
 *   Kampanja sa scheduled_at u buducnosti ide kao `execution_timestamp` kod Omni-ja.
 *   SMS-only kampanje sa scheduled_at => pg_cron ih pokupi kad dodje vrijeme (rakunat nema schedule).
 */

const OMNI_BASE = 'https://api.omni-messaging.com/v1';
const SMS_PROXY = 'https://www.rakunat.com/_functions/smssend';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

interface Recipient {
  patient_id: string | null;
  contact_id: string | null;
  ime: string;
  prezime: string;
  telefon: string;
}

function buildPersonalizedText(template: string, r: Recipient): string {
  return template
    .replaceAll('{ime}', r.ime || '')
    .replaceAll('{prezime}', r.prezime || '')
    .replaceAll('{ime_prezime}', `${r.ime} ${r.prezime}`.trim());
}

async function resolveTargets(supabase: any, campaign: any): Promise<Recipient[]> {
  const targetType = campaign.target_type;

  if (targetType === 'svi_pacijenti') {
    const { data } = await supabase.from('patients').select('id, ime, prezime, telefon').not('telefon', 'is', null);
    return (data || [])
      .filter((p: any) => p.telefon && p.telefon.trim())
      .map((p: any) => ({ patient_id: p.id, contact_id: null, ime: p.ime, prezime: p.prezime, telefon: p.telefon }));
  }

  if (targetType === 'rucni') {
    const ids = campaign.target_rucni_ids || {};
    const patientIds: string[] = ids.patient_ids || [];
    const contactIds: string[] = ids.contact_ids || [];
    const out: Recipient[] = [];

    if (patientIds.length > 0) {
      const { data } = await supabase.from('patients').select('id, ime, prezime, telefon').in('id', patientIds);
      for (const p of data || []) {
        if (p.telefon) out.push({ patient_id: p.id, contact_id: null, ime: p.ime, prezime: p.prezime, telefon: p.telefon });
      }
    }
    if (contactIds.length > 0) {
      const { data } = await supabase.from('contacts').select('id, ime, prezime, telefon').in('id', contactIds);
      for (const c of data || []) {
        if (c.telefon) out.push({ patient_id: null, contact_id: c.id, ime: c.ime, prezime: c.prezime || '', telefon: c.telefon });
      }
    }
    return out;
  }

  if (targetType === 'grupa' && campaign.target_group_id) {
    const { data: group } = await supabase.from('contact_groups').select('*').eq('id', campaign.target_group_id).maybeSingle();
    if (!group) return [];

    if (group.tip === 'staticka') {
      const { data: members } = await supabase
        .from('contact_group_members')
        .select('patient_id, contact_id')
        .eq('group_id', group.id);

      const patientIds = (members || []).filter((m: any) => m.patient_id).map((m: any) => m.patient_id);
      const contactIds = (members || []).filter((m: any) => m.contact_id).map((m: any) => m.contact_id);

      return resolveTargets(supabase, {
        target_type: 'rucni',
        target_rucni_ids: { patient_ids: patientIds, contact_ids: contactIds },
      });
    }

    if (group.tip === 'dinamicka') {
      return resolveTargets(supabase, { target_type: 'filter', target_filter: group.filter_json });
    }
  }

  if (targetType === 'filter') {
    const filter = campaign.target_filter || {};
    let query = supabase.from('patients').select('id, ime, prezime, telefon, datum_rodjenja, grad, tagovi').not('telefon', 'is', null);

    if (filter.grad) query = query.eq('grad', filter.grad);
    if (Array.isArray(filter.tagovi) && filter.tagovi.length > 0) query = query.contains('tagovi', filter.tagovi);
    if (filter.year_from) query = query.gte('datum_rodjenja', `${filter.year_from}-01-01`);
    if (filter.year_to) query = query.lte('datum_rodjenja', `${filter.year_to}-12-31`);

    const { data } = await query;
    const rows = (data || []).filter((p: any) => p.telefon && p.telefon.trim());
    return rows.map((p: any) => ({ patient_id: p.id, contact_id: null, ime: p.ime, prezime: p.prezime, telefon: p.telefon }));
  }

  return [];
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
        source: 'ordinacija-campaign',
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

    const body = await req.json().catch(() => ({}));
    const campaignId: string = body.campaign_id;
    const dryRun: boolean = body.dry_run === true;

    if (!campaignId) {
      return jsonResponse({ success: false, error: 'campaign_id je obavezan' }, 400);
    }

    // 1. Ucitaj kampanju
    const { data: campaign, error: campError } = await supabase.from('campaigns').select('*').eq('id', campaignId).maybeSingle();
    if (campError || !campaign) {
      return jsonResponse({ success: false, error: campError?.message || 'Kampanja nije nadjena' }, 404);
    }

    // 2. Ucitaj kredencijale
    const { data: settings } = await supabase
      .from('reminder_settings')
      .select('omni_user_id, omni_auth_key, sms_api_key, sms_sender_name, sms_email')
      .limit(1)
      .maybeSingle();

    const needsOmni = campaign.channel_mode === 'viber' || campaign.channel_mode === 'viber_then_sms';
    const needsSms = campaign.channel_mode === 'sms' || campaign.channel_mode === 'viber_then_sms';

    if (needsOmni && (!settings?.omni_user_id || !settings?.omni_auth_key)) {
      return jsonResponse({ success: false, error: 'Omni kredencijali nisu konfigurisani' }, 400);
    }
    if (needsSms && !settings?.sms_api_key) {
      return jsonResponse({ success: false, error: 'SMS kredencijali nisu konfigurisani' }, 400);
    }

    // 3. Razrijesi primaoce
    const recipients = await resolveTargets(supabase, campaign);

    if (recipients.length === 0) {
      return jsonResponse({ success: false, error: 'Nema primalaca za ciljnu grupu' }, 400);
    }

    // Dry run — samo vrati broj + estimate
    if (dryRun) {
      return jsonResponse({
        success: true,
        total_recipients: recipients.length,
        cost_estimation: recipients.length * 0.1, // placeholder
      });
    }

    // 4. Update campaign na 'sending'
    await supabase
      .from('campaigns')
      .update({ status: 'sending', total_recipients: recipients.length, sent_at: new Date().toISOString() })
      .eq('id', campaignId);

    // 5. Insert campaign_recipients
    const recipientRows = recipients.map((r) => ({
      campaign_id: campaignId,
      patient_id: r.patient_id,
      contact_id: r.contact_id,
      ime: `${r.ime} ${r.prezime}`.trim(),
      telefon: r.telefon,
    }));
    await supabase.from('campaign_recipients').insert(recipientRows);

    // 6. Slanje
    let sentViber = 0;
    let sentSms = 0;
    let failed = 0;
    let sendingId: string | undefined;
    let costEstimation: number | undefined;

    // SMS-only + zakazana u buducnost: zaustavi se, pg_cron ce je pokupiti
    const scheduledTs = campaign.scheduled_at ? new Date(campaign.scheduled_at).getTime() : 0;
    const nowTs = Date.now();
    const isFutureSchedule = scheduledTs > nowTs + 30_000;

    if (campaign.channel_mode === 'sms' && isFutureSchedule) {
      await supabase
        .from('campaigns')
        .update({ status: 'scheduled', total_recipients: recipients.length })
        .eq('id', campaignId);
      return jsonResponse({
        success: true,
        status: 'scheduled',
        total_recipients: recipients.length,
        scheduled_at: campaign.scheduled_at,
      });
    }

    if (campaign.channel_mode === 'sms') {
      // SMS-only — rakunat, jedan po jedan
      for (const r of recipients) {
        const text = buildPersonalizedText(campaign.sms_text || '', r);
        const result = await sendSmsRakunat(
          r.telefon,
          text,
          settings!.sms_api_key!,
          campaign.sms_sender || settings!.sms_sender_name || '',
          settings!.sms_email || '',
        );
        await supabase
          .from('campaign_recipients')
          .update({
            channel_used: 'sms',
            sms_dlr: result.success ? 'submitted' : 'not_delivered',
            error: result.error || null,
            updated_at: new Date().toISOString(),
          })
          .eq('campaign_id', campaignId)
          .eq('telefon', r.telefon);

        if (result.success) sentSms++;
        else failed++;
      }
    } else {
      // Viber (ili Viber + SMS fallback) — Omni batch sa personalization tags
      const destinations = recipients.map((r, idx) => ({
        id: String(idx + 1),
        phone_number: formatPhone(r.telefon),
        tags: [r.ime || '', r.prezime || ''],
      }));

      const viberText = (campaign.viber_text || '').replaceAll('{ime}', '{tag 1}').replaceAll('{prezime}', '{tag 2}');
      const viberType: string = campaign.viber_type || 'text_image_button';

      // Per-tip Viber payload
      const viberMessage: any = {};

      if (viberType === 'text_only') {
        viberMessage.text = viberText;
      } else if (viberType === 'text_button') {
        viberMessage.text = viberText;
        if (campaign.viber_caption) viberMessage.caption = campaign.viber_caption;
        if (campaign.viber_action_url) viberMessage.action = campaign.viber_action_url;
      } else if (viberType === 'text_image_button') {
        viberMessage.text = viberText;
        if (campaign.viber_caption) viberMessage.caption = campaign.viber_caption;
        if (campaign.viber_action_url) viberMessage.action = campaign.viber_action_url;
        if (campaign.viber_image_url) viberMessage.image = campaign.viber_image_url;
      } else if (viberType === 'video_text') {
        viberMessage.text = viberText;
        if (campaign.viber_video_url) viberMessage.video = campaign.viber_video_url;
      } else if (viberType === 'media_only') {
        // Media only — samo slika ili video; Omni API obicno zahtijeva bar text polje
        if (campaign.viber_image_url) viberMessage.image = campaign.viber_image_url;
        if (campaign.viber_video_url) viberMessage.video = campaign.viber_video_url;
        viberMessage.text = viberText || ' ';
      }

      const viberChannel: any = {
        viber: {
          message: viberMessage,
          validity_period: 5, // 5 min — poll-omni-status ce pokupiti failed DLR-ove i trigerovati SMS fallback
          action_tracking: !!campaign.viber_action_url,
        },
      };

      const omniPayload: any = {
        transaction_id: campaign.omni_transaction_id,
        allow_duplicates: true, // potrebno sa tag personalizacijom
        channels: [viberChannel],
        destinations,
      };

      // Scheduled?
      if (campaign.scheduled_at) {
        const scheduledTs = Math.floor(new Date(campaign.scheduled_at).getTime() / 1000);
        if (scheduledTs > Math.floor(Date.now() / 1000)) {
          omniPayload.execution_timestamp = scheduledTs;
        }
      }

      const omniRes = await fetch(`${OMNI_BASE}/sendings`, {
        method: 'POST',
        headers: {
          Authorization: basicAuthHeader(settings!.omni_user_id!, settings!.omni_auth_key!),
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(omniPayload),
      });
      const omniData = await omniRes.json().catch(() => ({}));

      if (!omniRes.ok || omniData?.status !== 'success') {
        const errMsg = omniData?.errors?.[0]?.message || `Omni HTTP ${omniRes.status}`;
        await supabase.from('campaigns').update({ status: 'failed', error: errMsg }).eq('id', campaignId);
        return jsonResponse({ success: false, error: errMsg, raw: omniData });
      }

      sendingId = omniData.data?.sending_id;
      costEstimation = omniData.data?.cost_estimation;
      sentViber = recipients.length;

      // Mapiraj omni recipient IDs nazad u nas DB (Omni vraca recipients sa svojim id-jem)
      const omniRecipients = omniData.data?.recipients || [];
      for (let i = 0; i < recipients.length; i++) {
        const r = recipients[i];
        const omniId = omniRecipients[i]?.id || `${sendingId}-${String(i + 1).padStart(6, '0')}`;
        await supabase
          .from('campaign_recipients')
          .update({
            omni_recipient_id: omniId,
            channel_used: 'viber',
            viber_dlr: 'pending',
            updated_at: new Date().toISOString(),
          })
          .eq('campaign_id', campaignId)
          .eq('telefon', r.telefon);
      }
    }

    // 7. Finalni update kampanje
    const finalStatus = campaign.scheduled_at && new Date(campaign.scheduled_at) > new Date() ? 'scheduled' : 'sending';
    await supabase
      .from('campaigns')
      .update({
        status: finalStatus,
        omni_sending_id: sendingId || null,
        cost_estimation: costEstimation || null,
        sent_viber: sentViber,
        sent_sms: sentSms,
        failed_count: failed,
      })
      .eq('id', campaignId);

    return jsonResponse({
      success: true,
      total_recipients: recipients.length,
      sending_id: sendingId,
      cost_estimation: costEstimation,
      sent_viber: sentViber,
      sent_sms: sentSms,
      failed,
      status: finalStatus,
    });
  } catch (error: any) {
    return jsonResponse({ success: false, error: error.message || 'Unexpected error' }, 500);
  }
});
