import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.101.1';

/**
 * send-reminders — automatski SMS/Viber podsjetnici za termine.
 *
 * channel_mode iz reminder_settings odredjuje kanal:
 *   'sms'             -> rakunat SMS proxy (kao do sada)
 *   'viber'           -> Omni Messaging Viber (bez fallback-a)
 *   'viber_then_sms'  -> Omni Viber; ako Viber failuje, webhook omni-delivery-report
 *                       salje rakunat SMS kao fallback i postavlja fallbacked=true
 *
 * Trebalo bi da ovaj cron ide svakih 15 min; window je [45, 80] min od sada
 * (overlap sa susjednim tick-om + slack za kasno kreirane termine).
 */

const SMS_PROXY = 'https://www.rakunat.com/_functions/smssend';
const OMNI_BASE = 'https://api.omni-messaging.com/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ChannelMode = 'sms' | 'viber' | 'viber_then_sms';

interface ReminderSettings {
  enabled: boolean;
  timing: 'dan_termina' | 'dan_prije' | 'sat_prije';
  vrijeme: string;
  sms_api_key: string | null;
  sms_sender_name: string | null;
  sms_email: string | null;
  omni_user_id: string | null;
  omni_auth_key: string | null;
  channel_mode: ChannelMode | null;
}

interface AppointmentRow {
  id: string;
  patient_id: string;
  doctor_id: string;
  pocetak: string;
  status: string;
  confirm_token: string | null;
  patient: { ime: string; prezime: string; telefon: string } | null;
}

// APP_URL se koristi za gradjenje "Potvrdite dolazak" linka u SMS/Viber podsjetniku.
// Fallback na produkcijski domen ako env nije postavljen.
const APP_URL = Deno.env.get('APP_URL') || 'https://www.moa-app.me';

function formatDatum(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}.`;
}

function formatVrijeme(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function stripDiacritics(text: string): string {
  if (!text) return '';
  return text.replace(/đ/g, 'dz').replace(/Đ/g, 'Dz').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function buildReminderText(ime: string, datum: string, token: string | null): string {
  const base = `Podsjetnik: ${ime}, imate termin ${formatDatum(datum)} u ${formatVrijeme(datum)}h.`;
  const confirmLine = token ? ` Potvrdite dolazak: ${APP_URL}/potvrda/${token}` : ' Molimo potvrdite dolazak.';
  // Diakritike skidamo samo na "bosanskom" dijelu poruke — URL ostavljamo netaknut
  // jer stripDiacritics ne dira ASCII znakove, ali eksplicitno razdvajamo radi
  // predvidivog ponasanja.
  return stripDiacritics(base) + stripDiacritics(confirmLine);
}

function formatPhoneNumber(phone: string): string {
  return phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
}

function basicAuthHeader(userId: string, authKey: string): string {
  return `Basic ${btoa(`${userId}:${authKey}`)}`;
}

async function sendSmsViaRakunat(
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
        phone: formatPhoneNumber(phone),
        text,
        apiKey,
        senderName,
        userEmail: email,
        campaignId: '',
        source: 'ordinacija-cron',
      }),
    });
    const result = await res.json();
    return result.success ? { success: true } : { success: false, error: result.error || 'Slanje nije uspjelo' };
  } catch (e: any) {
    return { success: false, error: e.message || 'Greska pri slanju' };
  }
}

async function sendViberViaOmni(
  phone: string,
  text: string,
  userId: string,
  authKey: string,
  transactionId: string,
  validityPeriod = 5,
): Promise<{ success: boolean; error?: string; sendingId?: string; recipientId?: string }> {
  try {
    const payload = {
      transaction_id: transactionId,
      channels: [
        {
          viber: {
            message: { text },
            validity_period: validityPeriod,
          },
        },
      ],
      destinations: [
        {
          id: '1',
          phone_number: formatPhoneNumber(phone),
        },
      ],
    };

    const res = await fetch(`${OMNI_BASE}/sendings`, {
      method: 'POST',
      headers: {
        Authorization: basicAuthHeader(userId, authKey),
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify(payload),
    });
    const result = await res.json().catch(() => ({}));

    if (!res.ok || result?.status !== 'success') {
      return {
        success: false,
        error: result?.errors?.[0]?.message || `Omni HTTP ${res.status}`,
      };
    }

    const sendingId = result.data?.sending_id;
    const recipientId = result.data?.recipients?.[0]?.id || `${sendingId}-000001`;
    return { success: true, sendingId, recipientId };
  } catch (e: any) {
    return { success: false, error: e.message || 'Greska pri Omni slanju' };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Dohvati podesavanja
    const { data: settingsRow } = await supabase
      .from('reminder_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    const settings = settingsRow as ReminderSettings | null;

    if (!settings?.enabled) {
      return new Response(
        JSON.stringify({ message: 'Podsjetnici nisu aktivni', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const channelMode: ChannelMode = settings.channel_mode || 'sms';
    const hasSms = !!settings.sms_api_key && !!settings.sms_sender_name;
    const hasOmni = !!settings.omni_user_id && !!settings.omni_auth_key;

    // Validacija po kanalu
    if (channelMode === 'sms' && !hasSms) {
      return new Response(
        JSON.stringify({ message: 'SMS kredencijali nisu konfigurisani', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (channelMode === 'viber' && !hasOmni) {
      return new Response(
        JSON.stringify({ message: 'Omni kredencijali nisu konfigurisani', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (channelMode === 'viber_then_sms' && (!hasOmni || !hasSms)) {
      return new Response(
        JSON.stringify({ message: 'Potrebni su i Omni i SMS kredencijali za viber_then_sms', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const now = new Date();
    let toSend: AppointmentRow[] = [];

    if (settings.timing === 'sat_prije') {
      const windowStart = new Date(now.getTime() + 45 * 60 * 1000);
      const windowEnd = new Date(now.getTime() + 80 * 60 * 1000);

      const { data: appointments } = await supabase
        .from('appointments')
        .select('id, patient_id, doctor_id, pocetak, status, confirm_token, patient:patients(ime, prezime, telefon)')
        .gte('pocetak', windowStart.toISOString())
        .lte('pocetak', windowEnd.toISOString())
        .in('status', ['zakazan', 'potvrdjen']);

      if (!appointments || appointments.length === 0) {
        return new Response(
          JSON.stringify({ message: 'Nema termina u prozoru sat prije', sent: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const ids = (appointments as AppointmentRow[]).map((a) => a.id);
      const { data: sent } = await supabase
        .from('notifications')
        .select('appointment_id')
        .eq('tip', 'podsjetnik')
        .in('appointment_id', ids);
      const alreadySent = new Set((sent || []).map((r: any) => r.appointment_id));
      toSend = (appointments as AppointmentRow[]).filter((a) => !alreadySent.has(a.id));
    } else {
      // dan_termina / dan_prije
      const [targetH, targetM] = String(settings.vrijeme).split(':').map((v) => parseInt(v, 10));
      if (
        now.getHours() < targetH ||
        (now.getHours() === targetH && now.getMinutes() < targetM)
      ) {
        return new Response(
          JSON.stringify({ message: `Jos nije vrijeme za slanje (${settings.vrijeme})`, sent: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const targetDate = new Date(now);
      if (settings.timing === 'dan_prije') targetDate.setDate(targetDate.getDate() + 1);
      const yyyy = targetDate.getFullYear();
      const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
      const dd = String(targetDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const { data: appointments } = await supabase
        .from('appointments')
        .select('id, patient_id, doctor_id, pocetak, status, confirm_token, patient:patients(ime, prezime, telefon)')
        .gte('pocetak', `${dateStr}T00:00:00`)
        .lte('pocetak', `${dateStr}T23:59:59`)
        .in('status', ['zakazan', 'potvrdjen']);

      if (!appointments || appointments.length === 0) {
        return new Response(
          JSON.stringify({ message: 'Nema termina za slanje podsjetnika', sent: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const { data: sentReminders } = await supabase
        .from('notifications')
        .select('appointment_id')
        .eq('tip', 'podsjetnik')
        .gte('datum_slanja', `${todayStr}T00:00:00`)
        .lte('datum_slanja', `${todayStr}T23:59:59`);

      const alreadySent = new Set((sentReminders || []).map((r: any) => r.appointment_id));
      toSend = (appointments as AppointmentRow[]).filter((a) => !alreadySent.has(a.id));
    }

    let sentCount = 0;
    let failedCount = 0;
    let channelViber = 0;
    let channelSms = 0;

    for (const apt of toSend) {
      const patient = apt.patient as any;
      if (!patient?.telefon) continue;

      const imeIPrezime = `${patient.ime} ${patient.prezime}`;
      const text = buildReminderText(imeIPrezime, apt.pocetak, apt.confirm_token);

      let success = false;
      let errorMsg: string | null = null;
      let channelUsed: 'sms' | 'viber' = 'sms';
      let omniRecipientId: string | null = null;
      let omniSendingId: string | null = null;
      let initialDlr: string | null = null;

      if (channelMode === 'sms') {
        const result = await sendSmsViaRakunat(
          patient.telefon,
          text,
          settings.sms_api_key!,
          settings.sms_sender_name!,
          settings.sms_email || '',
        );
        success = result.success;
        errorMsg = result.error || null;
        channelUsed = 'sms';
        if (success) channelSms++;
      } else {
        // viber ili viber_then_sms — pocinje sa Viber-om
        const txnId = `rem-${apt.id}-${Date.now()}`;
        const validityMin = channelMode === 'viber_then_sms' ? 5 : 60;
        const viberResult = await sendViberViaOmni(
          patient.telefon,
          text,
          settings.omni_user_id!,
          settings.omni_auth_key!,
          txnId,
          validityMin,
        );

        if (viberResult.success) {
          success = true;
          channelUsed = 'viber';
          omniRecipientId = viberResult.recipientId || null;
          omniSendingId = viberResult.sendingId || null;
          initialDlr = 'pending';
          channelViber++;
          // Za viber_then_sms: webhook ce posle provjeriti failed DLR i poslati SMS fallback
        } else {
          // Viber direktno failed pri slanju (ne kroz DLR) — probaj SMS fallback odmah ako imamo SMS kred.
          if (channelMode === 'viber_then_sms' && hasSms) {
            const smsResult = await sendSmsViaRakunat(
              patient.telefon,
              text,
              settings.sms_api_key!,
              settings.sms_sender_name!,
              settings.sms_email || '',
            );
            success = smsResult.success;
            errorMsg = smsResult.error || `Viber: ${viberResult.error}`;
            channelUsed = 'sms';
            if (success) channelSms++;
          } else {
            success = false;
            errorMsg = viberResult.error || 'Viber slanje nije uspjelo';
          }
        }
      }

      await supabase.from('notifications').insert({
        patient_id: apt.patient_id,
        appointment_id: apt.id,
        kanal: channelUsed,
        status: success ? 'sent' : 'failed',
        sadrzaj: text,
        tip: 'podsjetnik',
        error: errorMsg,
        patient_ime: imeIPrezime,
        patient_telefon: patient.telefon,
        datum_slanja: new Date().toISOString(),
        channel_used: channelUsed,
        omni_recipient_id: omniRecipientId,
        omni_sending_id: omniSendingId,
        viber_dlr: channelUsed === 'viber' ? initialDlr : null,
        sms_dlr: channelUsed === 'sms' ? (success ? 'submitted' : 'not_delivered') : null,
      });

      if (success) sentCount++;
      else failedCount++;
    }

    return new Response(
      JSON.stringify({
        message: `Podsjetnici poslani: ${sentCount} uspjesno, ${failedCount} neuspjesno`,
        timing: settings.timing,
        channel_mode: channelMode,
        sent: sentCount,
        sent_viber: channelViber,
        sent_sms: channelSms,
        failed: failedCount,
        evaluated: toSend.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
