import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.101.1';

const SMS_PROXY = 'https://www.rakunat.com/_functions/smssend';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReminderSettings {
  enabled: boolean;
  timing: 'dan_termina' | 'dan_prije' | 'sat_prije';
  vrijeme: string; // HH:mm:ss or HH:mm
  sms_api_key: string;
  sms_sender_name: string;
  sms_email: string;
}

interface AppointmentRow {
  id: string;
  patient_id: string;
  doctor_id: string;
  pocetak: string;
  status: string;
  patient: { ime: string; prezime: string; telefon: string } | null;
}

function formatDatum(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}.`;
}

function formatVrijeme(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function stripDiacritics(text: string): string {
  if (!text) return '';
  return text
    .replace(/đ/g, 'dz')
    .replace(/Đ/g, 'Dz')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function buildReminderText(ime: string, datum: string): string {
  return stripDiacritics(
    `Podsjetnik: ${ime}, imate termin ${formatDatum(datum)} u ${formatVrijeme(datum)}h. Molimo potvrdite dolazak.`,
  );
}

function formatPhoneNumber(phone: string): string {
  return phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
}

async function sendSms(
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

    if (!settingsRow?.enabled || !settingsRow?.sms_api_key || !settingsRow?.sms_sender_name) {
      return new Response(
        JSON.stringify({ message: 'Podsjetnici nisu aktivni ili SMS nije konfigurisan', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const settings = settingsRow as ReminderSettings;
    const now = new Date();

    let toSend: AppointmentRow[] = [];

    if (settings.timing === 'sat_prije') {
      // Termini koji pocinju u sledecih 55-75 minuta (prozor za 15-min cron)
      const windowStart = new Date(now.getTime() + 55 * 60 * 1000);
      const windowEnd = new Date(now.getTime() + 75 * 60 * 1000);

      const { data: appointments } = await supabase
        .from('appointments')
        .select('id, patient_id, doctor_id, pocetak, status, patient:patients(ime, prezime, telefon)')
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
      // dan_termina / dan_prije: postuj settings.vrijeme (HH:mm ili HH:mm:ss)
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
      if (settings.timing === 'dan_prije') {
        targetDate.setDate(targetDate.getDate() + 1);
      }
      const yyyy = targetDate.getFullYear();
      const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
      const dd = String(targetDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const { data: appointments } = await supabase
        .from('appointments')
        .select('id, patient_id, doctor_id, pocetak, status, patient:patients(ime, prezime, telefon)')
        .gte('pocetak', `${dateStr}T00:00:00`)
        .lte('pocetak', `${dateStr}T23:59:59`)
        .in('status', ['zakazan', 'potvrdjen']);

      if (!appointments || appointments.length === 0) {
        return new Response(
          JSON.stringify({ message: 'Nema termina za slanje podsjetnika', sent: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Dedupe po danasnjem datumu
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

    for (const apt of toSend) {
      const patient = apt.patient as any;
      if (!patient?.telefon) continue;

      const imeIPrezime = `${patient.ime} ${patient.prezime}`;
      const text = buildReminderText(imeIPrezime, apt.pocetak);
      const result = await sendSms(
        patient.telefon,
        text,
        settings.sms_api_key,
        settings.sms_sender_name,
        settings.sms_email || '',
      );

      await supabase.from('notifications').insert({
        patient_id: apt.patient_id,
        appointment_id: apt.id,
        kanal: 'sms',
        status: result.success ? 'sent' : 'failed',
        sadrzaj: text,
        tip: 'podsjetnik',
        error: result.error || null,
        patient_ime: imeIPrezime,
        patient_telefon: patient.telefon,
        datum_slanja: new Date().toISOString(),
      });

      if (result.success) sentCount++;
      else failedCount++;
    }

    return new Response(
      JSON.stringify({
        message: `Podsjetnici poslani: ${sentCount} uspjesno, ${failedCount} neuspjesno`,
        timing: settings.timing,
        sent: sentCount,
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
