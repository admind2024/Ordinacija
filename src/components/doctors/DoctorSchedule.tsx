import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays, startOfWeek } from 'date-fns';
import { Clock } from 'lucide-react';
import Card from '../ui/Card';
import { DANI_KRATKO, danStatus, loadRaspored, RAZLOZI_ODSUSTVA, type RasporedPodaci } from '../../lib/schedule';
import type { Doctor } from '../../types';

interface DoctorScheduleProps {
  doctor: Doctor;
}

// Raspored ove sedmice za jednu osobu (iz doctor_schedules + odsustva).
export default function DoctorScheduleView({ doctor }: DoctorScheduleProps) {
  const [data, setData] = useState<RasporedPodaci | null>(null);

  useEffect(() => {
    let alive = true;
    loadRaspored([doctor.id])
      .then((d) => { if (alive) setData(d); })
      .catch(() => { if (alive) setData({ schedules: [], odsustva: [] }); });
    return () => { alive = false; };
  }, [doctor.id]);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Raspored ove sedmice</h3>
        <Link to="/raspored" className="text-xs text-primary-700 hover:underline">Uredi raspored</Link>
      </div>

      {!data ? (
        <div className="grid grid-cols-7 gap-2" aria-busy="true">
          {DANI_KRATKO.map((d) => <div key={d} className="h-20 rounded-lg bg-gray-100 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {DANI_KRATKO.map((dan, i) => {
            const st = danStatus(doctor.id, addDays(weekStart, i), data);
            const cls =
              st.status === 'radi' ? 'bg-primary-50 border-primary-200 text-primary-800'
              : st.status === 'odsustvo' ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-gray-50 border-gray-200 text-gray-400';
            return (
              <div key={dan} className={`rounded-lg border p-2 text-center ${cls}`}>
                <p className="text-xs font-semibold">{dan}</p>
                {st.status === 'radi' ? (
                  <div className="mt-2 text-[11px] leading-tight">
                    <Clock size={12} className="mx-auto mb-1" />
                    {st.pocetak}<br />{st.kraj}
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] leading-tight">
                    {st.status === 'odsustvo' ? RAZLOZI_ODSUSTVA[st.razlog]
                      : st.status === 'ne_radi' ? 'Slobodan' : 'Nije uneseno'}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
