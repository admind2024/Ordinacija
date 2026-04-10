import { useEffect, useRef } from 'react';
import { format, startOfDay, addDays, parseISO } from 'date-fns';
import { getReminderSettings } from '../lib/reminderSettings';
import { isSmsConfigured, sendSms } from '../lib/smsService';
import { smsPodsjetnik } from '../lib/smsTemplates';
import { supabase } from '../lib/supabase';
import type { Appointment } from '../types';

const CHECK_INTERVAL = 60_000; // 1 minut

/**
 * Automatski salje SMS podsjetnike za zakazane termine.
 * Pokrece se u CalendarProvider, provjerava svaki minut.
 * Podrzava tri moda:
 *  - dan_termina: na dan termina u podeseno vrijeme
 *  - dan_prije: dan prije termina u podeseno vrijeme
 *  - sat_prije: oko sat prije svakog pojedinacnog termina
 */
export function useAutoReminders(appointments: Appointment[]) {
  const sendingRef = useRef(false);

  useEffect(() => {
    async function checkAndSend() {
      if (sendingRef.current) return;

      const settings = getReminderSettings();
      if (!settings.enabled || !isSmsConfigured()) return;

      const now = new Date();
      let toSend: Appointment[] = [];

      if (settings.timing === 'sat_prije') {
        // Svaki termin koji pocinje u sledecih 65 minuta (prozor za polling)
        const windowEnd = new Date(now.getTime() + 65 * 60 * 1000);
        const candidates = appointments.filter((apt) => {
          const start = parseISO(apt.pocetak);
          return (
            start > now &&
            start <= windowEnd &&
            (apt.status === 'zakazan' || apt.status === 'potvrdjen')
          );
        });
        if (candidates.length === 0) return;

        // Provjera da li je podsjetnik za ove termine vec poslat (ikad)
        const ids = candidates.map((c) => c.id);
        const { data: sent } = await supabase
          .from('notifications')
          .select('appointment_id')
          .eq('tip', 'podsjetnik')
          .in('appointment_id', ids);
        const alreadySent = new Set((sent || []).map((r: any) => r.appointment_id));
        toSend = candidates.filter((c) => !alreadySent.has(c.id));
      } else {
        // dan_termina / dan_prije: koristi podeseno vrijeme slanja
        const [targetHour, targetMinute] = settings.vrijeme.split(':').map(Number);
        if (now.getHours() < targetHour || (now.getHours() === targetHour && now.getMinutes() < targetMinute)) {
          return; // Nije jos vrijeme
        }

        const targetDate = settings.timing === 'dan_prije'
          ? addDays(startOfDay(now), 1)
          : startOfDay(now);
        const targetDateStr = format(targetDate, 'yyyy-MM-dd');

        const targetAppointments = appointments.filter((apt) => {
          const aptDate = apt.pocetak.slice(0, 10);
          return aptDate === targetDateStr && (apt.status === 'zakazan' || apt.status === 'potvrdjen');
        });
        if (targetAppointments.length === 0) return;

        const todayStr = format(now, 'yyyy-MM-dd');
        const { data: sentReminders } = await supabase
          .from('notifications')
          .select('appointment_id')
          .eq('tip', 'podsjetnik')
          .gte('datum_slanja', `${todayStr}T00:00:00`)
          .lte('datum_slanja', `${todayStr}T23:59:59`);

        const alreadySent = new Set((sentReminders || []).map((r: any) => r.appointment_id));
        toSend = targetAppointments.filter((apt) => !alreadySent.has(apt.id));
      }

      if (toSend.length === 0) return;

      sendingRef.current = true;

      for (const apt of toSend) {
        // Dohvati patient podatke za telefon
        const patient = apt.patient;
        if (!patient?.telefon) {
          // Ako nema patient data u appointment-u, dohvati iz baze
          const { data: patientData } = await supabase
            .from('patients')
            .select('ime, prezime, telefon')
            .eq('id', apt.patient_id)
            .single();

          if (!patientData?.telefon) continue;

          const imeIPrezime = `${patientData.ime} ${patientData.prezime}`;
          const text = smsPodsjetnik({ imeIPrezime, datum: apt.pocetak });
          const result = await sendSms(patientData.telefon, text);

          await supabase.from('notifications').insert({
            patient_id: apt.patient_id,
            appointment_id: apt.id,
            kanal: 'sms',
            status: result.success ? 'sent' : 'failed',
            sadrzaj: text,
            tip: 'podsjetnik',
            error: result.error || null,
            patient_ime: imeIPrezime,
            patient_telefon: patientData.telefon,
            datum_slanja: new Date().toISOString(),
          });
        } else {
          const imeIPrezime = `${patient.ime} ${patient.prezime}`;
          const text = smsPodsjetnik({ imeIPrezime, datum: apt.pocetak });
          const result = await sendSms(patient.telefon, text);

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
        }
      }

      sendingRef.current = false;
    }

    // Pokreni odmah pri mount-u
    checkAndSend();

    // Pokreni svaki minut
    const interval = setInterval(checkAndSend, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [appointments]);
}
