import { useEffect, useRef } from 'react';
import { startOfDay, addDays, parseISO, isSameDay } from 'date-fns';
import { getReminderSettings } from '../lib/reminderSettings';
import { isSmsConfigured, sendSms, stripDiacritics } from '../lib/smsService';
import { smsPodsjetnik } from '../lib/smsTemplates';
import { supabase } from '../lib/supabase';
import type { Appointment } from '../types';

const CHECK_INTERVAL = 60_000; // 1 minut
const MAX_PER_RUN = 10; // zastita od bujice
const SEND_DELAY_MS = 500; // pauza izmedju slanja

/**
 * Automatski salje SMS podsjetnike za zakazane termine.
 * Dedupe: notifikacija sa istim appointment_id i tip='podsjetnik'
 * se nikad vise ne salje, bez obzira na datum.
 */
export function useAutoReminders(appointments: Appointment[]) {
  const sendingRef = useRef(false);
  // Dodatni in-memory guard: appointment_id-evi za koje smo vec
  // pokusali slanje u ovoj sesiji. Sprecava ponovno slanje ako DB
  // insert zakasni ili padne.
  const attemptedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    async function checkAndSend() {
      if (sendingRef.current) return;

      const settings = getReminderSettings();
      if (!settings.enabled || !isSmsConfigured()) return;

      const now = new Date();
      let candidates: Appointment[] = [];

      if (settings.timing === 'sat_prije') {
        // Termini koji pocinju u sledecih 65 minuta
        const windowEnd = new Date(now.getTime() + 65 * 60 * 1000);
        candidates = appointments.filter((apt) => {
          const start = parseISO(apt.pocetak);
          return (
            start > now &&
            start <= windowEnd &&
            (apt.status === 'zakazan' || apt.status === 'potvrdjen')
          );
        });
      } else {
        // dan_termina / dan_prije: provjera vremena
        const [targetHour, targetMinute] = settings.vrijeme.split(':').map(Number);
        if (
          now.getHours() < targetHour ||
          (now.getHours() === targetHour && now.getMinutes() < targetMinute)
        ) {
          return;
        }

        const targetDate =
          settings.timing === 'dan_prije' ? addDays(startOfDay(now), 1) : startOfDay(now);

        candidates = appointments.filter((apt) => {
          const aptDate = parseISO(apt.pocetak);
          return (
            isSameDay(aptDate, targetDate) &&
            (apt.status === 'zakazan' || apt.status === 'potvrdjen')
          );
        });
      }

      if (candidates.length === 0) return;

      // Filter: izbaci termine koje smo vec pokusali u ovoj sesiji
      candidates = candidates.filter((c) => !attemptedRef.current.has(c.id));
      if (candidates.length === 0) return;

      // Dedupe iz DB: bilo koji podsjetnik za ovaj appointment_id — ikad
      const ids = candidates.map((c) => c.id);
      const { data: sent, error: dedupeError } = await supabase
        .from('notifications')
        .select('appointment_id')
        .eq('tip', 'podsjetnik')
        .in('appointment_id', ids);

      if (dedupeError) {
        console.error('Dedupe query error, NE saljem nista:', dedupeError);
        return;
      }

      const alreadySent = new Set((sent || []).map((r: any) => r.appointment_id));
      let toSend = candidates.filter((c) => !alreadySent.has(c.id));

      if (toSend.length === 0) return;

      // Hard cap
      if (toSend.length > MAX_PER_RUN) {
        console.warn(`useAutoReminders: limit ${MAX_PER_RUN} dostignut (${toSend.length} kandidata), saljem prvih ${MAX_PER_RUN}`);
        toSend = toSend.slice(0, MAX_PER_RUN);
      }

      sendingRef.current = true;

      try {
        for (const apt of toSend) {
          // Odmah obiljezi u in-memory cache da se ne salje opet
          attemptedRef.current.add(apt.id);

          // Dohvati patient podatke za telefon
          let patientInfo: any = apt.patient;
          if (!patientInfo?.telefon) {
            const { data: pd } = await supabase
              .from('patients')
              .select('ime, prezime, telefon')
              .eq('id', apt.patient_id)
              .maybeSingle();
            patientInfo = pd;
          }
          if (!patientInfo?.telefon) continue;

          const imeIPrezime = `${patientInfo.ime ?? ''} ${patientInfo.prezime ?? ''}`.trim();
          const text = stripDiacritics(smsPodsjetnik({ imeIPrezime, datum: apt.pocetak }));
          const result = await sendSms(patientInfo.telefon, text);

          await supabase.from('notifications').insert({
            patient_id: apt.patient_id,
            appointment_id: apt.id,
            kanal: 'sms',
            status: result.success ? 'sent' : 'failed',
            sadrzaj: text,
            tip: 'podsjetnik',
            error: result.error || null,
            patient_ime: stripDiacritics(imeIPrezime),
            patient_telefon: patientInfo.telefon,
            datum_slanja: new Date().toISOString(),
          });

          // Pauza izmedju slanja
          await new Promise((r) => setTimeout(r, SEND_DELAY_MS));
        }
      } finally {
        sendingRef.current = false;
      }
    }

    // Pokreni odmah pri mount-u
    checkAndSend();

    const interval = setInterval(checkAndSend, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [appointments]);
}
