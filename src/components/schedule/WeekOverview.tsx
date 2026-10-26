import { useState } from 'react';
import { addDays, addWeeks, format, isToday, startOfWeek } from 'date-fns';
import { srLatn as sr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../ui/Button';
import { danStatus, RAZLOZI_ODSUSTVA, type RasporedPodaci } from '../../lib/schedule';
import type { Doctor } from '../../types';

interface Props {
  doctors: Doctor[];
  data: RasporedPodaci;
}

// Sedmicni pregled: ko radi koji dan i kada, za sve ljekare odjednom.
export default function WeekOverview({ doctors, data }: Props) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1">
          <button onClick={() => setWeekStart((w) => addWeeks(w, -1))} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Prethodna sedmica">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => setWeekStart((w) => addWeeks(w, 1))} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Sljedeća sedmica">
            <ChevronRight size={18} />
          </button>
          <span className="text-sm font-medium text-gray-800 ml-1">
            {format(weekStart, 'd. MMM', { locale: sr })} – {format(addDays(weekStart, 6), 'd. MMM yyyy.', { locale: sr })}
          </span>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
          Ova sedmica
        </Button>
      </div>

      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-xs min-w-[720px]">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="text-left px-3 py-2 font-semibold text-gray-600 w-48">Osoblje</th>
              {days.map((d) => (
                <th key={d.toISOString()} scope="col"
                  className={`px-2 py-2 font-semibold capitalize ${isToday(d) ? 'text-primary-700' : 'text-gray-600'}`}>
                  {format(d, 'EEE d.', { locale: sr })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {doctors.map((doc) => (
              <tr key={doc.id}>
                <th scope="row" className="text-left px-3 py-2 font-medium text-gray-800">
                  <span className="inline-block w-2 h-2 rounded-full mr-2 align-middle" style={{ backgroundColor: doc.boja }} />
                  <span className="truncate">{doc.ime} {doc.prezime}</span>
                </th>
                {days.map((d) => {
                  const st = danStatus(doc.id, d, data);
                  let cls = 'text-gray-300';
                  let txt = '—';
                  let title = 'Raspored nije unesen';
                  if (st.status === 'radi') {
                    cls = 'bg-primary-50 text-primary-800';
                    txt = `${st.pocetak}–${st.kraj}`;
                    title = st.pauze.length ? `Pauza: ${st.pauze.map((p) => `${p.od}–${p.do}`).join(', ')}` : 'Radi';
                  } else if (st.status === 'ne_radi') {
                    cls = 'text-gray-400';
                    txt = 'slobodan';
                    title = st.napomena || 'Ne radi';
                  } else if (st.status === 'odsustvo') {
                    cls = 'bg-red-50 text-red-700';
                    txt = RAZLOZI_ODSUSTVA[st.razlog];
                    title = st.napomena || txt;
                  }
                  return (
                    <td key={d.toISOString()} className="px-1 py-1 text-center">
                      <span title={title} className={`block rounded-md px-1 py-1.5 ${cls}`}>
                        {txt}
                        {st.status === 'radi' && st.izvor === 'datum' && <span className="ml-0.5" aria-label="izuzetak">*</span>}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-gray-400">* radno vrijeme promijenjeno samo za taj datum</p>
    </div>
  );
}
