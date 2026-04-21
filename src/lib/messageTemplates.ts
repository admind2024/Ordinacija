import { format, parseISO } from 'date-fns';
import { supabase } from './supabase';

/**
 * Message templates — pohranjeni u reminder_settings.message_templates JSONB.
 * Omogucava korisniku da iz Settings menjanja Sms i Viber tekstove za svaki tip poruke.
 */

export type MessageTip = 'potvrda' | 'podsjetnik' | 'otkazivanje' | 'potvrdjivanje' | 'anketa';
export type MessageKanal = 'sms' | 'viber';

export interface TemplateSet {
  potvrda: string;
  podsjetnik: string;
  otkazivanje: string;
  potvrdjivanje: string;
  anketa: string;
}

export interface MessageTemplates {
  sms: TemplateSet;
  viber: TemplateSet;
}

export const DEFAULT_TEMPLATES: MessageTemplates = {
  sms: {
    potvrda: 'Postovani/a {ime_prezime}, vas termin je zakazan za {datum} u {vrijeme}h. Ljekar: {doktor}.',
    podsjetnik: 'Podsjetnik: {ime_prezime}, imate termin {datum} u {vrijeme}h. Potvrdite dolazak: {link}',
    otkazivanje: 'Postovani/a {ime_prezime}, vas termin zakazan za {datum} u {vrijeme}h je otkazan. Molimo kontaktirajte nas za novi termin.',
    potvrdjivanje: 'Postovani/a {ime_prezime}, vas termin za {datum} u {vrijeme}h je potvrdjen. Ljekar: {doktor}.',
    anketa: 'Hvala na posjeti MOA klinici! Molimo ocijenite vase iskustvo (30 sek): {link}',
  },
  viber: {
    potvrda: 'Postovani/a {ime_prezime}, vas termin je zakazan za {datum} u {vrijeme}h. Ljekar: {doktor}. Vidimo se u MOA klinici!',
    podsjetnik: 'Postovani/a {ime_prezime}, podsjecamo vas na vas termin {datum} u {vrijeme}h. Ljekar: {doktor}. Potvrdite dolazak klikom na link: {link}',
    otkazivanje: 'Postovani/a {ime_prezime}, vas termin zakazan za {datum} u {vrijeme}h je otkazan. Molimo kontaktirajte nas za novi termin.',
    potvrdjivanje: 'Postovani/a {ime_prezime}, vas termin za {datum} u {vrijeme}h je potvrdjen. Ljekar: {doktor}.',
    anketa: 'Hvala na posjeti MOA klinici! Molimo ocijenite vase iskustvo (30 sek): {link}',
  },
};

const LS_KEY = 'ordinacija_message_templates';

export function getTemplatesLocal(): MessageTemplates {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_TEMPLATES;
    const parsed = JSON.parse(raw);
    return {
      sms: { ...DEFAULT_TEMPLATES.sms, ...(parsed.sms || {}) },
      viber: { ...DEFAULT_TEMPLATES.viber, ...(parsed.viber || {}) },
    };
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

export function setTemplatesLocal(templates: MessageTemplates): void {
  localStorage.setItem(LS_KEY, JSON.stringify(templates));
}

export async function loadTemplatesFromDb(): Promise<MessageTemplates | null> {
  const { data } = await supabase
    .from('reminder_settings')
    .select('message_templates')
    .limit(1)
    .maybeSingle();

  if (!data?.message_templates) return null;
  const t = data.message_templates as Partial<MessageTemplates>;
  const merged: MessageTemplates = {
    sms: { ...DEFAULT_TEMPLATES.sms, ...(t.sms || {}) },
    viber: { ...DEFAULT_TEMPLATES.viber, ...(t.viber || {}) },
  };
  setTemplatesLocal(merged);
  return merged;
}

export async function saveTemplatesToDb(templates: MessageTemplates): Promise<{ success: boolean; error?: string }> {
  setTemplatesLocal(templates);

  const { data: existing } = await supabase
    .from('reminder_settings')
    .select('id')
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from('reminder_settings')
      .update({ message_templates: templates })
      .eq('id', existing.id);
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase
      .from('reminder_settings')
      .insert({ message_templates: templates });
    if (error) return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * Ispuni placeholder-e u sablonu sa stvarnim vrijednostima.
 * Podrzani: {ime}, {prezime}, {ime_prezime}, {datum}, {vrijeme}, {doktor}
 */
export interface RenderParams {
  imeIPrezime?: string;
  ime?: string;
  prezime?: string;
  datum?: string; // ISO timestamp
  doctor?: string;
  link?: string;
}

export function renderTemplate(template: string, params: RenderParams): string {
  const fullName = params.imeIPrezime ?? `${params.ime ?? ''} ${params.prezime ?? ''}`.trim();
  const ime = params.ime ?? fullName.split(' ')[0] ?? '';
  const prezime = params.prezime ?? fullName.split(' ').slice(1).join(' ');

  let d = '';
  let v = '';
  if (params.datum) {
    try {
      const dt = parseISO(params.datum);
      d = format(dt, 'dd.MM.yyyy.');
      v = format(dt, 'HH:mm');
    } catch { /* ignore */ }
  }

  let result = template
    .replaceAll('{ime_prezime}', fullName)
    .replaceAll('{ime}', ime)
    .replaceAll('{prezime}', prezime)
    .replaceAll('{datum}', d)
    .replaceAll('{vrijeme}', v)
    .replaceAll('{doktor}', params.doctor ?? '')
    .replaceAll('{link}', params.link ?? '');

  // Cleanup: ako je {doktor} prazan, ukloni "Ljekar: ." frazu da SMS ne izgleda ruzno
  if (!params.doctor) {
    result = result
      .replace(/\s*Ljekar:\s*\.?/gi, '')
      .replace(/\s*Doktor:\s*\.?/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
  // Cleanup: ako je {link} prazan, ukloni "Potvrdite dolazak: " frazu
  if (!params.link) {
    result = result
      .replace(/\s*Potvrdite dolazak(?: klikom na link)?:\s*\.?/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  return result;
}

export function getMessage(
  tip: MessageTip,
  kanal: MessageKanal,
  params: RenderParams,
): string {
  const templates = getTemplatesLocal();
  const template = templates[kanal][tip];
  return renderTemplate(template, params);
}
