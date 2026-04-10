import { supabase } from './supabase';

/**
 * Omni Messaging servis — tanak wrapper nad Edge Function-ima.
 *
 * Zasto ne zovemo Omni direktno iz browsera:
 * 1) Omni REST API (api.omni-messaging.com) nije CORS-enabled
 * 2) Basic Auth kredencijali ne bi smjeli zivjeti u browseru
 * Zato sav pravi traffic ide kroz Edge Functions (omni-test, send-campaign, itd.)
 * Kredencijali se cuvaju u Supabase `reminder_settings` tabeli (kao i SMS config).
 *
 * SMS se NE salje kroz Omni — za SMS se koristi postojeci rakunat proxy
 * (korisnikov licni SMS nalog). Fallback Viber -> SMS radi webhook handler
 * `omni-delivery-report` Edge Function koji zove rakunat smsService pri failed Viber dlr.
 */

export type ChannelMode = 'sms' | 'viber' | 'viber_then_sms';

export interface OmniConfig {
  userId: string;
  authKey: string;
  channelMode: ChannelMode;
}

const LS_USER_ID = 'ordinacija_omni_userId';
const LS_AUTH_KEY = 'ordinacija_omni_authKey';
const LS_CHANNEL_MODE = 'ordinacija_omni_channelMode';

export function getOmniConfig(): OmniConfig {
  return {
    userId: localStorage.getItem(LS_USER_ID) || '',
    authKey: localStorage.getItem(LS_AUTH_KEY) || '',
    channelMode: (localStorage.getItem(LS_CHANNEL_MODE) as ChannelMode) || 'sms',
  };
}

export function setOmniConfig(cfg: OmniConfig) {
  localStorage.setItem(LS_USER_ID, cfg.userId);
  localStorage.setItem(LS_AUTH_KEY, cfg.authKey);
  localStorage.setItem(LS_CHANNEL_MODE, cfg.channelMode);
}

export function isOmniConfigured(): boolean {
  const { userId, authKey } = getOmniConfig();
  return !!userId && !!authKey;
}

/** Sinhronizuj Omni config u reminder_settings (single row). */
export async function syncOmniConfigToDb(cfg: OmniConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: existing, error: selectError } = await supabase
      .from('reminder_settings')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (selectError) return { success: false, error: selectError.message };

    const payload = {
      omni_user_id: cfg.userId,
      omni_auth_key: cfg.authKey,
      channel_mode: cfg.channelMode,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { error } = await supabase.from('reminder_settings').update(payload).eq('id', existing.id);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase.from('reminder_settings').insert({
        ...payload,
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

/** Ucitaj Omni config iz baze u localStorage (za novi uredjaj). */
export async function loadOmniConfigFromDb(): Promise<boolean> {
  const { data, error } = await supabase
    .from('reminder_settings')
    .select('omni_user_id, omni_auth_key, channel_mode')
    .limit(1)
    .maybeSingle();

  if (error || !data) return false;

  const userId = data.omni_user_id ?? '';
  const authKey = data.omni_auth_key ?? '';
  const channelMode = (data.channel_mode as ChannelMode) ?? 'sms';

  if (!userId && !authKey) return false;

  setOmniConfig({ userId, authKey, channelMode });
  return true;
}

/** Test konekcije — vraca balance sa Omni accounta. Ide kroz omni-test Edge Function. */
export async function testOmniConnection(): Promise<{
  success: boolean;
  error?: string;
  balance?: number;
  username?: string;
  account_status?: string;
}> {
  const { data, error } = await supabase.functions.invoke('omni-test', {
    body: { action: 'account' },
  });
  if (error) return { success: false, error: error.message };
  if (data?.success) {
    return {
      success: true,
      balance: data.balance,
      username: data.username,
      account_status: data.account_status,
    };
  }
  return { success: false, error: data?.error || 'Nepoznata greska' };
}

/** Posalji test poruku (Viber ili SMS) kroz omni-test Edge Function. */
export async function sendTestOmniMessage(
  phone: string,
  text: string,
  channel: 'viber' | 'sms' = 'viber',
): Promise<{ success: boolean; error?: string; sending_id?: string; cost_estimation?: number }> {
  const { data, error } = await supabase.functions.invoke('omni-test', {
    body: { action: 'send', phone, text, channel },
  });
  if (error) return { success: false, error: error.message };
  if (data?.success) {
    return {
      success: true,
      sending_id: data.sending_id,
      cost_estimation: data.cost_estimation,
    };
  }
  return { success: false, error: data?.error || 'Slanje nije uspjelo' };
}

/** Zatrazi broj primalaca i procenu cijene za potencijalnu kampanju (bez slanja). */
export async function estimateCampaignCost(campaignId: string): Promise<{
  success: boolean;
  error?: string;
  total_recipients?: number;
  cost_estimation?: number;
}> {
  const { data, error } = await supabase.functions.invoke('send-campaign', {
    body: { campaign_id: campaignId, dry_run: true },
  });
  if (error) return { success: false, error: error.message };
  if (data?.success) {
    return {
      success: true,
      total_recipients: data.total_recipients,
      cost_estimation: data.cost_estimation,
    };
  }
  return { success: false, error: data?.error || 'Greska pri procjeni' };
}

/** Pokreni kampanju (salje odmah ili zakaze za kasnije u zavisnosti od scheduled_at). */
export async function sendCampaign(campaignId: string): Promise<{
  success: boolean;
  error?: string;
  sending_id?: string;
  total_recipients?: number;
  status?: string;
}> {
  const { data, error } = await supabase.functions.invoke('send-campaign', {
    body: { campaign_id: campaignId },
  });
  if (error) return { success: false, error: error.message };
  if (data?.success) {
    return {
      success: true,
      sending_id: data.sending_id,
      total_recipients: data.total_recipients,
      status: data.status,
    };
  }
  return { success: false, error: data?.error || 'Greska pri slanju' };
}

/**
 * Helper: procijeni SMS parts (delova) za tekst.
 * GSM 7-bit: 160 chars / 306 / 459 / 612...
 * UTF-8: 70 / 134 / 201 / 268...
 */
export function estimateSmsParts(text: string): { parts: number; chars: number; encoding: 'gsm' | 'utf8' } {
  const gsmChars = /^[\u0000-\u007F@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#$%&'()*+,\-./0-9:;<=>?@A-Za-z€^{}\[\]~|\\]*$/;
  const isGsm = gsmChars.test(text);
  const chars = text.length;
  if (isGsm) {
    const parts = chars <= 160 ? 1 : Math.ceil(chars / 153);
    return { parts, chars, encoding: 'gsm' };
  }
  const parts = chars <= 70 ? 1 : Math.ceil(chars / 67);
  return { parts, chars, encoding: 'utf8' };
}
