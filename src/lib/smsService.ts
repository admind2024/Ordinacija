import { supabase } from './supabase';

const SMS_PROXY = 'https://www.rakunat.com/_functions/smssend';

const LS_API_KEY = 'ordinacija_sms_apiKey';
const LS_SENDER = 'ordinacija_sms_senderName';
const LS_EMAIL = 'ordinacija_sms_email';

export interface SmsResult {
  success: boolean;
  message_id?: string;
  error?: string;
}

export function getSmsConfig() {
  return {
    apiKey: localStorage.getItem(LS_API_KEY) || '',
    senderName: localStorage.getItem(LS_SENDER) || '',
    email: localStorage.getItem(LS_EMAIL) || '',
  };
}

export function setSmsConfig(apiKey: string, senderName: string, email: string) {
  localStorage.setItem(LS_API_KEY, apiKey);
  localStorage.setItem(LS_SENDER, senderName);
  localStorage.setItem(LS_EMAIL, email);
}

/**
 * Sinhronizuj SMS kredencijale u Supabase reminder_settings tabelu.
 * Kreira red ako ne postoji, u suprotnom azurira samo sms_* polja.
 * Vraca true ako je upis uspio.
 */
export async function syncSmsConfigToDb(
  apiKey: string,
  senderName: string,
  email: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: existing, error: selectError } = await supabase
      .from('reminder_settings')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (selectError) {
      return { success: false, error: selectError.message };
    }

    const smsPayload = {
      sms_api_key: apiKey,
      sms_sender_name: senderName,
      sms_email: email,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { error } = await supabase
        .from('reminder_settings')
        .update(smsPayload)
        .eq('id', existing.id);
      if (error) return { success: false, error: error.message };
    } else {
      // Red ne postoji — kreiraj ga sa default reminder poljima
      const { error } = await supabase.from('reminder_settings').insert({
        ...smsPayload,
        enabled: false,
        timing: 'dan_termina',
        vrijeme: '08:00',
      });
      if (error) return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Nepoznata greska' };
  }
}

export function isSmsConfigured(): boolean {
  const { apiKey, senderName } = getSmsConfig();
  return !!apiKey && !!senderName;
}

/**
 * Ucitaj SMS konfiguraciju iz Supabase reminder_settings tabele
 * i sinhronizuj je u localStorage. Koristi se pri otvaranju stranica
 * na novom uredjaju kako bi se kredencijali automatski povukli iz baze.
 * Vraca true ako je konfiguracija uspjesno ucitana.
 */
export async function loadSmsConfigFromDb(): Promise<boolean> {
  const { data, error } = await supabase
    .from('reminder_settings')
    .select('sms_api_key, sms_sender_name, sms_email')
    .limit(1)
    .maybeSingle();

  if (error || !data) return false;

  const apiKey = data.sms_api_key ?? '';
  const senderName = data.sms_sender_name ?? '';
  const email = data.sms_email ?? '';

  if (!apiKey && !senderName && !email) return false;

  setSmsConfig(apiKey, senderName, email);
  return true;
}

export function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, '');
  cleaned = cleaned.replace(/^\+/, '');
  return cleaned;
}

export async function sendSms(phone: string, text: string): Promise<SmsResult> {
  const { apiKey, senderName, email } = getSmsConfig();

  if (!apiKey) {
    return { success: false, error: 'API kljuc nije konfigurisan. Podesiti na stranici Notifikacije.' };
  }

  if (!phone || !text) {
    return { success: false, error: 'Telefon i tekst su obavezni' };
  }

  const formattedPhone = formatPhoneNumber(phone);

  try {
    const response = await fetch(SMS_PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: formattedPhone,
        text,
        apiKey,
        senderName,
        userEmail: email,
        campaignId: '',
        source: 'ordinacija',
      }),
    });

    const result = await response.json();

    if (result.success) {
      return { success: true, message_id: result.message_id };
    }
    return { success: false, error: result.error || 'Slanje nije uspjelo' };
  } catch (error: any) {
    console.error('SMS send error:', error);
    return { success: false, error: error.message || 'Greska pri slanju' };
  }
}

export async function testSmsConnection(): Promise<SmsResult> {
  const { apiKey } = getSmsConfig();
  if (!apiKey) {
    return { success: false, error: 'API kljuc nije konfigurisan' };
  }

  try {
    const response = await fetch(SMS_PROXY, { method: 'GET' });
    const result = await response.json();
    return result.status === 'OK'
      ? { success: true }
      : { success: false, error: result.error || 'Proxy nije dostupan' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
