import { useCallback, useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import Card from '../components/ui/Card';
import Tabs from '../components/ui/Tabs';
import WeeklyTemplateEditor from '../components/schedule/WeeklyTemplateEditor';
import DateExceptions from '../components/schedule/DateExceptions';
import WeekOverview from '../components/schedule/WeekOverview';
import AbsenceList from '../components/schedule/AbsenceList';
import { useCalendar } from '../contexts/CalendarContext';
import { loadRaspored, type RasporedPodaci } from '../lib/schedule';

type Tab = 'pregled' | 'radno' | 'odsustva';

export default function Schedule() {
  const { doctors } = useCalendar();
  const [tab, setTab] = useState<Tab>('pregled');
  const [data, setData] = useState<RasporedPodaci>({ schedules: [], odsustva: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState('');

  const refresh = useCallback(async () => {
    try {
      setData(await loadRaspored());
      setError('');
    } catch (e) {
      setError('Raspored nije učitan: ' + (e instanceof Error ? e.message : 'nepoznata greška'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (!selectedId && doctors.length) setSelectedId(doctors[0].id);
  }, [doctors, selectedId]);

  const selected = doctors.find((d) => d.id === selectedId);

  return (
    <div>
      <Tabs
        label="Raspored rada"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'pregled', label: 'Sedmični pregled' },
          { id: 'radno', label: 'Radno vrijeme' },
          { id: 'odsustva', label: 'Odsustva', count: data.odsustva.length },
        ]}
      />

      {error && (
        <div role="alert" className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />)}
        </div>
      ) : doctors.length === 0 ? (
        <Card className="text-center">
          <CalendarClock className="mx-auto text-gray-300 mb-2" size={32} />
          <p className="text-sm text-gray-500">Prvo dodajte osoblje u meniju Osoblje.</p>
        </Card>
      ) : tab === 'pregled' ? (
        <WeekOverview doctors={doctors} data={data} />
      ) : tab === 'odsustva' ? (
        <AbsenceList doctors={doctors} odsustva={data.odsustva} onSaved={refresh} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-6">
          <nav aria-label="Osoblje" className="bg-white border border-border rounded-xl p-2 max-h-[70vh] overflow-y-auto">
            <ul className="space-y-0.5">
              {doctors.map((d) => (
                <li key={d.id}>
                  <button
                    onClick={() => setSelectedId(d.id)}
                    aria-current={d.id === selectedId}
                    className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                      ${d.id === selectedId ? 'bg-primary-50 text-primary-800 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.boja }} />
                    <span className="truncate">{d.titula ? `${d.titula} ` : ''}{d.ime} {d.prezime}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          {selected && (
            <div className="space-y-6 min-w-0">
              <Card>
                <h2 className="text-base font-semibold text-gray-900 mb-1">Sedmični raspored</h2>
                <p className="text-sm text-gray-500 mb-4">Važi svake sedmice dok se ne promijeni.</p>
                <WeeklyTemplateEditor key={selected.id} doctor={selected} schedules={data.schedules} onSaved={refresh} />
              </Card>
              <Card>
                <h2 className="text-base font-semibold text-gray-900 mb-3">Izuzeci za datum</h2>
                <DateExceptions doctor={selected} schedules={data.schedules} onSaved={refresh} />
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
