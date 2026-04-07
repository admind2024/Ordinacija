import { format, parseISO } from 'date-fns';

interface TemplateParams {
  imeIPrezime: string;
  datum: string; // ISO string
  doctor?: string;
}

function fmtDatum(iso: string): string {
  try {
    return format(parseISO(iso), 'dd.MM.yyyy.');
  } catch {
    return iso;
  }
}

function fmtVrijeme(iso: string): string {
  try {
    return format(parseISO(iso), 'HH:mm');
  } catch {
    return iso;
  }
}

export function smsPotvrda({ imeIPrezime, datum, doctor }: TemplateParams): string {
  const d = fmtDatum(datum);
  const v = fmtVrijeme(datum);
  let msg = `Postovani/a ${imeIPrezime}, vas termin je zakazan za ${d} u ${v}h.`;
  if (doctor) msg += ` Ljekar: ${doctor}.`;
  return msg;
}

export function smsPodsjetnik({ imeIPrezime, datum }: TemplateParams): string {
  const d = fmtDatum(datum);
  const v = fmtVrijeme(datum);
  return `Podsjetnik: ${imeIPrezime}, imate termin ${d} u ${v}h. Molimo potvrdite dolazak.`;
}

export function smsOtkazivanje({ imeIPrezime, datum }: TemplateParams): string {
  const d = fmtDatum(datum);
  const v = fmtVrijeme(datum);
  return `Postovani/a ${imeIPrezime}, vas termin zakazan za ${d} u ${v}h je otkazan. Molimo kontaktirajte nas za novi termin.`;
}

export function smsPotvrdjivanje({ imeIPrezime, datum, doctor }: TemplateParams): string {
  const d = fmtDatum(datum);
  const v = fmtVrijeme(datum);
  let msg = `Postovani/a ${imeIPrezime}, vas termin za ${d} u ${v}h je potvrdjen.`;
  if (doctor) msg += ` Ljekar: ${doctor}.`;
  return msg;
}
