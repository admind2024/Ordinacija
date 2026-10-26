import { useEffect, useState } from 'react';
import { parseISO, differenceInMinutes, isSameDay, format } from 'date-fns';
import { CalendarOff } from 'lucide-react';
import { useCalendar } from '../../contexts/CalendarContext';
import AppointmentCard from './AppointmentCard';
import { loadDogadjaji, type Dogadjaj } from '../../lib/events';
import { danStatus, loadRaspored, RAZLOZI_ODSUSTVA, type RasporedPodaci } from '../../lib/schedule';
import type { Appointment } from '../../types';

const HOUR_START = 7;
const HOUR_END = 23;
const SLOT_HEIGHT = 48;
const HOUR_HEIGHT = SLOT_HEIGHT * 2;
const TOTAL_HOURS = HOUR_END - HOUR_START;
const LS_MODE = 'moa_day_columns';

type Kolone = 'ljekari' | 'ordinacije';

interface DayViewProps {
  onAppointmentClick: (appointment: Appointment, e: React.MouseEvent) => void;
  onSlotClick: (date: Date, time: string) => void;
  onEventClick?: (dogadjaj: Dogadjaj) => void;
  eventsVersion?: number; // poveca se kad se dogadjaj sacuva, da se ponovo ucita
}

const minOd = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const topZa = (min: number) => ((min - HOUR_START * 60) / 30) * SLOT_HEIGHT;

export default function DayView({ onAppointmentClick, onSlotClick, onEventClick, eventsVersion = 0 }: DayViewProps) {
  const { selectedDate, getFilteredAppointments, filters, doctors, rooms } = useCalendar();
  const [kolone, setKolone] = useState<Kolone>(() => {
    try { return localStorage.getItem(LS_MODE) === 'ordinacije' ? 'ordinacije' : 'ljekari'; } catch { return 'ljekari'; }
  });
  const [dogadjaji, setDogadjaji] = useState<Dogadjaj[]>([]);
  const [raspored, setRaspored] = useState<RasporedPodaci | null>(null);

  const dayStart = new Date(selectedDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(selectedDate);
  dayEnd.setHours(23, 59, 59, 999);
  const dayKey = format(dayStart, 'yyyy-MM-dd');

  useEffect(() => {
    let alive = true;
    const od = new Date(`${dayKey}T00:00:00`);
    const doVr = new Date(`${dayKey}T23:59:59`);
    loadDogadjaji(od, doVr).then((d) => { if (alive) setDogadjaji(d); }).catch(() => { if (alive) setDogadjaji([]); });
    return () => { alive = false; };
  }, [dayKey, eventsVersion]);

  useEffect(() => {
    loadRaspored().then(setRaspored).catch(() => setRaspored(null));
  }, []);

  function promijeniKolone(k: Kolone) {
    setKolone(k);
    try { localStorage.setItem(LS_MODE, k); } catch { /* privatni prozor */ }
  }

  const visibleDoctors = doctors.filter((d) => filters.doctorIds.includes(d.id));
  const visibleRooms = rooms.filter((r) => filters.roomIds.includes(r.id));
  const appointments = getFilteredAppointments(dayStart, dayEnd);
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => HOUR_START + i);
  const isToday = isSameDay(selectedDate, new Date());

  const columns = kolone === 'ljekari'
    ? visibleDoctors.map((d) => ({
        id: d.id,
        naslov: `${d.titula || ''} ${d.ime} ${d.prezime.charAt(0)}.`.trim(),
        podnaslov: d.specijalizacija,
        boja: d.boja,
        apts: appointments.filter((a) => a.doctor_id === d.id),
        evs: dogadjaji.filter((e) => e.ucesnici.includes(d.id)),
      }))
    : visibleRooms.map((r) => ({
        id: r.id,
        naslov: r.naziv,
        podnaslov: r.tip === 'oprema' ? 'Oprema' : 'Ordinacija',
        boja: r.boja,
        apts: appointments.filter((a) => a.room_id === r.id),
        evs: dogadjaji.filter((e) => e.room_id === r.id),
      }));

  function getAppointmentStyle(apt: { pocetak: string; kraj: string }) {
    const start = parseISO(apt.pocetak);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const duration = differenceInMinutes(parseISO(apt.kraj), start);
    const height = (duration / 30) * SLOT_HEIGHT;
    return { top: `${topZa(startMinutes)}px`, height: `${Math.max(height, 20)}px` };
  }

  // Zasivljeni periodi kad ljekar ne radi (van radnog vremena, pauza, odsustvo)
  function neradniBlokovi(doctorId: string): { od: number; do: number; tekst?: string }[] {
    if (!raspored) return [];
    const st = danStatus(doctorId, selectedDate, raspored);
    const kraj = HOUR_END * 60;
    const pocetak = HOUR_START * 60;
    if (st.status === 'nije_definisano') return [];
    if (st.status === 'odsustvo') return [{ od: pocetak, do: kraj, tekst: RAZLOZI_ODSUSTVA[st.razlog] }];
    if (st.status === 'ne_radi') return [{ od: pocetak, do: kraj, tekst: 'Ne radi' }];
    return [
      { od: pocetak, do: minOd(st.pocetak) },
      ...st.pauze.map((p) => ({ od: minOd(p.od), do: minOd(p.do), tekst: 'Pauza' })),
      { od: minOd(st.kraj), do: kraj },
    ].filter((b) => b.do > b.od);
  }

  const grid = { gridTemplateColumns: `60px repeat(${Math.max(columns.length, 1)}, minmax(140px, 1fr))` };

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-end gap-2 px-3 py-2 border-b border-border">
        <span className="text-xs text-gray-500">Kolone:</span>
        <div className="flex bg-gray-100 rounded-lg p-0.5" role="group" aria-label="Kolone dnevnog prikaza">
          {([['ljekari', 'Ljekari'], ['ordinacije', 'Ordinacije / oprema']] as [Kolone, string][]).map(([k, l]) => (
            <button key={k} onClick={() => promijeniKolone(k)} aria-pressed={kolone === k}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${kolone === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        {/* Header */}
        <div className="grid border-b border-border" style={grid}>
          <div className="p-2 border-r border-border" />
          {columns.map((c) => (
            <div key={c.id} className="p-2 text-center border-l border-border">
              <div className="flex items-center justify-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.boja }} />
                <span className="text-sm font-medium text-gray-900 truncate">{c.naslov}</span>
              </div>
              <p className="text-xs text-gray-400 truncate">{c.podnaslov}</p>
            </div>
          ))}
          {columns.length === 0 && <div className="p-2 text-sm text-gray-400 border-l border-border">Nijedna kolona nije izabrana u filterima.</div>}
        </div>

        {/* Grid */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          <div className="grid" style={grid}>
            <div className="border-r border-border">
              {hours.map((hour) => (
                <div key={hour} className="border-b border-border text-right pr-2 text-xs text-gray-400 flex items-start justify-end" style={{ height: `${HOUR_HEIGHT}px` }}>
                  <span className="relative -top-2 select-none">{String(hour).padStart(2, '0')}:00</span>
                </div>
              ))}
            </div>

            {columns.map((c) => (
              <div key={c.id} className="border-l border-border relative">
                {hours.map((hour) => (
                  <div key={hour} style={{ height: `${HOUR_HEIGHT}px` }}>
                    <div className="border-b border-border h-1/2 hover:bg-primary-50 cursor-pointer transition-colors"
                      onClick={() => onSlotClick(selectedDate, `${String(hour).padStart(2, '0')}:00`)} />
                    <div className="border-b border-dashed border-gray-100 h-1/2 hover:bg-primary-50 cursor-pointer transition-colors"
                      onClick={() => onSlotClick(selectedDate, `${String(hour).padStart(2, '0')}:30`)} />
                  </div>
                ))}

                {kolone === 'ljekari' && neradniBlokovi(c.id).map((b, i) => (
                  <div key={i} aria-hidden="true"
                    className="absolute left-0 right-0 pointer-events-none bg-gray-100/70 bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgba(0,0,0,0.035)_6px_12px)]"
                    style={{ top: `${topZa(b.od)}px`, height: `${((b.do - b.od) / 30) * SLOT_HEIGHT}px` }}>
                    {b.tekst && <span className="sticky top-1 block px-2 pt-1 text-[11px] text-gray-500">{b.tekst}</span>}
                  </div>
                ))}

                {c.evs.map((ev) => (
                  <button key={ev.id} type="button" onClick={() => onEventClick?.(ev)}
                    style={{ ...getAppointmentStyle(ev), borderLeftColor: ev.boja }}
                    className="absolute left-0.5 right-0.5 z-10 text-left rounded-md border border-l-4 border-gray-300 bg-white/95 px-2 py-1 shadow-sm overflow-hidden hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-800 truncate">
                      <CalendarOff size={11} className="shrink-0" /> {ev.naslov}
                    </span>
                    <span className="block text-[10px] text-gray-500">
                      {format(parseISO(ev.pocetak), 'HH:mm')}–{format(parseISO(ev.kraj), 'HH:mm')}
                    </span>
                  </button>
                ))}

                {c.apts.map((apt) => (
                  <div key={apt.id} style={getAppointmentStyle(apt)} className="absolute left-0 right-0 px-0.5 z-[5]">
                    <AppointmentCard appointment={apt} onClick={(a) => onAppointmentClick(a, {} as React.MouseEvent)} />
                  </div>
                ))}

                {isToday && <CurrentTimeLine />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CurrentTimeLine() {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const topOffset = topZa(minutes);
  if (topOffset < 0 || topOffset > TOTAL_HOURS * HOUR_HEIGHT) return null;

  return (
    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${topOffset}px` }}>
      <div className="h-0.5 bg-danger" />
    </div>
  );
}
