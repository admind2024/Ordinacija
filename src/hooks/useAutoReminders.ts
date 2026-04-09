import { useEffect, useRef } from 'react';
import { format, startOfDay, addDays } from 'date-fns';
import { getReminderSettings } from '../lib/reminderSettings';
import { isSmsConfigured, sendSms } from '../lib/smsService';
import { smsPodsjetnik } from '../lib/smsTemplates';
import { supabase } from '../lib/supabase';
import type { Appointment } from '../types';

const CHECK_INTERVAL = 60_000; // 1 minut

/**
 * Automatski salje SMS podsjetnike za zakazane termine.
 * Pokrece se u CalendarProvider, provjerava svaki minut.
 */
export function useAutoReminders(appointments: Appointment[]) {
  const sendingRef = useRef(false);

  useEffect(() => {
    async function checkAndSend() {
      if (sendingRef.current) return;

      const settings = getReminderSettings();
      if (!settings.enabled || !isSmsConfigured()) return;

      const now = new Date();
      const [targetHour, targetMinute] = settings.vrijeme.split(':').map(Number);

      // Provjeri da li je proslo podeseno vrijeme za slanje
      if (now.getHours() < targetHour || (now.getHours() === targetHour && now.getMinutes() < targetMinute)) {
        return; // Nije jos vrijeme
      }

      // Odredi za koji dan treba slati podsjetnike
      const targetDate = settings.timing === 'dan_prije'
        ? addDays(startOfDay(now), 1) // sutra
        : startOfDay(now); // danas

      const targetDateStr = format(targetDate, 'yyyy-MM-dd');

      // Filtriraj termine za ciljni datum koji su zakazani ili potvrdjeni
      const targetAppointments = appointments.filter((apt) => {
        const aptDate = apt.pocetak.slice(0, 10); // yyyy-MM-dd
        return aptDate === targetDateStr && (apt.status === 'zakazan' || apt.status === 'potvrdjen');
      });

      if (targetAppointments.length === 0) return;

      // Dohvati vec poslane podsjetnike za danas
      const todayStr = format(now, 'yyyy-MM-dd');
      const { data: sentReminders } = await supabase
        .from('notifications')
        .select('appointment_id')
        .eq('tip', 'podsjetnik')
        .gte('datum_slanja', `${todayStr}T00:00:00`)
        .lte('datum_slanja', `${todayStr}T23:59:59`);

      const alreadySent = new Set((sentReminders || []).map((r: any) => r.appointment_id));

      // Filtriraj termine kojima nije poslan podsjetnik
      const toSend = targetAppointments.filter((apt) => !alreadySent.has(apt.id));
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
