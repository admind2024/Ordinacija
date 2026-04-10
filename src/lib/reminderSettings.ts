import { supabase } from './supabase';
import { getSmsConfig } from './smsService';

const LS_KEY = 'ordinacija_reminder_settings';

export type ReminderTiming = 'dan_termina' | 'dan_prije' | 'sat_prije';

export interface ReminderSettings {
  enabled: boolean;
  timing: ReminderTiming;
  vrijeme: string; // HH:mm format, e.g. "08:00"
}

const DEFAULTS: ReminderSettings = {
  enabled: false,
  timing: 'dan_termina',
  vrijeme: '08:00',
};

export function getReminderSettings(): ReminderSettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function setReminderSettings(settings: ReminderSettings): void {
  localStorage.setItem(LS_KEY, JSON.stringify(settings));
}

/**
 * Sinhronizuje podesavanja u Supabase reminder_settings tabelu
 * tako da Edge Function moze da ih cita.
 */
export async function syncReminderSettingsToDb(settings: ReminderSettings): Promise<void> {
  const smsConfig = getSmsConfig();

  // Dohvati postojeci red (maybeSingle da ne puca ako red ne postoji)
  const { data: existing } = await supabase
    .from('reminder_settings')
    .select('id')
    .limit(1)
    .maybeSingle();

  const payload = {
    enabled: settings.enabled,
    timing: settings.timing,
    vrijeme: settings.vrijeme,
    sms_api_key: smsConfig.apiKey,
    sms_sender_name: smsConfig.senderName,
    sms_email: smsConfig.email,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    await supabase.from('reminder_settings').update(payload).eq('id', existing.id);
  } else {
    await supabase.from('reminder_settings').insert(payload);
  }
}

/**
 * Ucitaj podesavanja iz baze (za inicijalni sync).
 */
export async function loadReminderSettingsFromDb(): Promise<ReminderSettings | null> {
  const { data } = await supabase
    .from('reminder_settings')
    .select('enabled, timing, vrijeme')
    .limit(1)
    .single();

  if (!data) return null;
  return {
    enabled: data.enabled ?? false,
    timing: (data.timing as ReminderTiming) ?? 'dan_termina',
    vrijeme: data.vrijeme ?? '08:00',
  };
}
