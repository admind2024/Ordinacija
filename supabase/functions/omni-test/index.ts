import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.101.1';

/**
 * omni-test — diagnostic edge function za Omni Messaging.
 *
 * Actions:
 *   { action: 'account' }               -> GET /v1/account, vraca balance/status
 *   { action: 'send', phone, text, channel: 'viber' | 'sms' } -> POST /v1/sendings
 *
 * Kredencijali se citaju iz reminder_settings (nikad iz body-ja).
 */

const OMNI_BASE = 'https://api.omni-messaging.com/v1';

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
  const token = btoa(`${userId}:${authKey}`);
  return `Basic ${token}`;
}

function formatPhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Dohvati Omni kredencijale iz reminder_settings
    const { data: settings, error: settingsError } = await supabase
      .from('reminder_settings')
      .select('omni_user_id, omni_auth_key')
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      return jsonResponse({ success: false, error: `DB greska: ${settingsError.message}` }, 500);
    }

    if (!settings?.omni_user_id || !settings?.omni_auth_key) {
      return jsonResponse({
        success: false,
        error: 'Omni kredencijali nisu konfigurisani. Podesiti u Notifikacije > Konfiguracija.',
      }, 400);
    }

    const authHeader = basicAuthHeader(settings.omni_user_id, settings.omni_auth_key);

    let body: any;
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const action = body.action || 'account';

    // ===== action: account — GET /v1/account =====
    if (action === 'account') {
      const res = await fetch(`${OMNI_BASE}/account`, {
        method: 'GET',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json; charset=UTF-8',
        },
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.status !== 'success') {
        return jsonResponse({
          success: false,
          error: data?.errors?.[0]?.message || `HTTP ${res.status}`,
        });
      }

      return jsonResponse({
        success: true,
        balance: data.data?.balance,
        username: data.data?.username,
        account_status: data.data?.account_status,
        email: data.data?.email,
      });
    }

    // ===== action: send — POST /v1/sendings (TEST SLANJE) =====
    if (action === 'send') {
      const phone: string = body.phone;
      const text: string = body.text;
      const channel: 'viber' | 'sms' = body.channel || 'viber';

      if (!phone || !text) {
        return jsonResponse({ success: false, error: 'phone i text su obavezni' }, 400);
      }
      if (text.length > 1000) {
        return jsonResponse({ success: false, error: 'Viber tekst ne moze biti duzi od 1000 karaktera' }, 400);
      }

      const transactionId = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const channelsPayload: any[] = [];
      if (channel === 'viber') {
        channelsPayload.push({
          viber: {
            message: { text },
            validity_period: 60,
          },
        });
      } else {
        channelsPayload.push({
          sms: {
            from: 'Test',
            text,
            encoding: 1,
            type: 1,
            validity_period: 120,
          },
        });
      }

      const payload = {
        transaction_id: transactionId,
        channels: channelsPayload,
        destinations: [
          {
            id: '1',
            phone_number: formatPhone(phone),
          },
        ],
      };

      const res = await fetch(`${OMNI_BASE}/sendings`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.status !== 'success') {
        // Upisi i neuspjesan pokusaj u log
        await supabase.from('notifications').insert({
          tip: 'test',
          kanal: channel,
          status: 'failed',
          sadrzaj: text,
          patient_ime: 'Test',
          patient_telefon: phone,
          error: data?.errors?.[0]?.message || `HTTP ${res.status}`,
          datum_slanja: new Date().toISOString(),
          channel_used: channel,
        });

        return jsonResponse({
          success: false,
          error: data?.errors?.[0]?.message || `HTTP ${res.status}`,
          raw: data,
        });
      }

      const sendingId = data.data?.sending_id;
      const recipientId = data.data?.recipients?.[0]?.id || `${sendingId}-000001`;

      // Log uspjesan test u notifications da bude vidljivo u Marketing > Izvjestaj
      await supabase.from('notifications').insert({
        tip: 'test',
        kanal: channel,
        status: 'sent',
        sadrzaj: text,
        patient_ime: 'Test',
        patient_telefon: phone,
        datum_slanja: new Date().toISOString(),
        channel_used: channel,
        omni_sending_id: sendingId,
        omni_recipient_id: recipientId,
        viber_dlr: channel === 'viber' ? 'pending' : null,
        sms_dlr: channel === 'sms' ? 'submitted' : null,
      });

      return jsonResponse({
        success: true,
        sending_id: sendingId,
        cost_estimation: data.data?.cost_estimation,
        status: data.data?.status,
      });
    }

    return jsonResponse({ success: false, error: `Nepoznata akcija: ${action}` }, 400);
  } catch (error: any) {
    return jsonResponse({ success: false, error: error.message || 'Unexpected error' }, 500);
  }
});
