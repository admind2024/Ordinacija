import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.101.1';

/**
 * send-survey-sms — procesira survey_sms_queue.
 * Pozvana iz pg_cron svaki 5 minuta.
 * Pokupi redove gdje status='pending' AND scheduled_at <= now(), posalje SMS i azurira.
 */

const SMS_PROXY = 'https://www.rakunat.com/_functions/smssend';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function formatPhone(phone: string): string {
  return (phone || '').replace(/[^\d+]/g, '').replace(/^\+/, '');
}

function stripDiacritics(text: string): string {
  if (!text) return '';
  return text.replace(/đ/g, 'dz').replace(/Đ/g, 'Dz').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. SMS kredencijali i sablon iz reminder_settings
    const { data: settings } = await supabase
      .from('reminder_settings')
      .select('sms_api_key, sms_sender_name, sms_email, message_templates')
      .limit(1)
      .maybeSingle();

    if (!settings?.sms_api_key || !settings?.sms_sender_name) {
      return new Response(JSON.stringify({ success: false, error: 'SMS nije konfigurisan' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const DEFAULT_SMS_TEMPLATE = 'Hvala na posjeti MOA klinici! Molimo ocijenite vase iskustvo (30 sek): {link}';
    const smsTemplate: string = settings?.message_templates?.survey_sms || DEFAULT_SMS_TEMPLATE;

    // 2. Pokupi pending redove ciji je scheduled_at prosao
    const { data: queue } = await supabase
      .from('survey_sms_queue')
      .select('*, survey:surveys(id, naziv, aktivan)')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(20);

    if (!queue || queue.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: 'Nema zakazanih anketa' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let sent = 0;
    let failed = 0;

    for (const item of queue) {
      // Preskoci ako anketa vise nije aktivna
      if (!item.survey?.aktivan) {
        await supabase.from('survey_sms_queue').update({ status: 'skipped', error: 'Anketa deaktivirana' }).eq('id', item.id);
        continue;
      }

      // Generiši link — koristimo SUPABASE_URL kao proxy za origin (edge function nema window.location)
      // Ali zapravo treba produkcijski URL — dohvati iz env ili hardcode
      const appUrl = Deno.env.get('APP_URL') || 'https://ordinacija-rademilosevic87-3335s-projects.vercel.app';
      const surveyLink = `${appUrl}/anketa/${item.survey_id}`;
      const text = stripDiacritics(smsTemplate.replace('{link}', surveyLink));

      try {
        const res = await fetch(SMS_PROXY, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: formatPhone(item.patient_telefon),
            text,
            apiKey: settings.sms_api_key,
            senderName: settings.sms_sender_name,
            userEmail: settings.sms_email || '',
            campaignId: '',
            source: 'ordinacija-survey',
          }),
        });
        const result = await res.json();

        if (result.success) {
          await supabase.from('survey_sms_queue').update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          }).eq('id', item.id);

          // Log u notifications
          await supabase.from('notifications').insert({
            patient_id: item.patient_id,
            appointment_id: item.appointment_id,
            kanal: 'sms',
            status: 'sent',
            sadrzaj: text,
            tip: 'anketa',
            patient_ime: item.patient_ime,
            patient_telefon: item.patient_telefon,
            datum_slanja: new Date().toISOString(),
            channel_used: 'sms',
          });

          sent++;
        } else {
          await supabase.from('survey_sms_queue').update({
            status: 'failed',
            error: result.error || 'SMS slanje neuspjesno',
          }).eq('id', item.id);
          failed++;
        }
      } catch (e: any) {
        await supabase.from('survey_sms_queue').update({
          status: 'failed',
          error: e.message || 'Greska pri slanju',
        }).eq('id', item.id);
        failed++;
      }
    }

    return new Response(JSON.stringify({ success: true, sent, failed, total: queue.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
