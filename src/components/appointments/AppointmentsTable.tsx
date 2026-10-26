import { useEffect, useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { Download, Search, CalendarX } from 'lucide-react';
import Button from '../ui/Button';
import { useCalendar } from '../../contexts/CalendarContext';
import { usePatients } from '../../contexts/PatientsContext';
import { supabase } from '../../lib/supabase';
import { exportToExcel } from '../../lib/exportReport';
import { APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_LABELS, type AppointmentStatus } from '../../types';

type Naplata = '' | 'placeno' | 'djelimicno' | 'neplaceno';

const eur = (n: number) => `${n.toFixed(2).replace('.', ',')} €`;

// Tabela svih termina u periodu, sa filterima i izvozom u Excel.
export default function AppointmentsTable() {
  const { appointments, doctors, rooms, loading } = useCalendar();
  const { patients } = usePatients();
  const [od, setOd] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [doDatum, setDoDatum] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [doctorId, setDoctorId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [status, setStatus] = useState<'' | AppointmentStatus>('');
  const [naplata, setNaplata] = useState<Naplata>('');
  const [q, setQ] = useState('');
  const [placeno, setPlaceno] = useState<Map<string, number>>(new Map());

  const uPeriodu = useMemo(
    () =>
      appointments.filter((a) => {
        const d = a.pocetak.slice(0, 10);
        return d >= od && d <= doDatum;
      }),
    [appointments, od, doDatum]
  );

  // Uplate za termine iz perioda (za kolonu "Plaćeno" i filter naplate)
  useEffect(() => {
    const ids = uPeriodu.map((a) => a.id);
    let alive = true;
    (async () => {
      const m = new Map<string, number>();
      for (let i = 0; i < ids.length; i += 200) {
        const { data } = await supabase.from('payments').select('appointment_id, iznos').in('appointment_id', ids.slice(i, i + 200));
        for (const p of data || []) m.set(p.appointment_id, (m.get(p.appointment_id) || 0) + Number(p.iznos || 0));
      }
      if (alive) setPlaceno(m);
    })();
    return () => { alive = false; };
  }, [uPeriodu]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return uPeriodu
      .map((a) => {
        const p = a.patient || patients.find((x) => x.id === a.patient_id);
        const doc = doctors.find((d) => d.id === a.doctor_id);
        const room = rooms.find((r) => r.id === a.room_id);
        const svc = a.services || [];
        const cijena = svc.reduce((s, x) => s + Number(x.cijena || 0) * Number(x.kolicina || 1), 0);
        const ukupno = svc.reduce((s, x) => s + Number(x.ukupno || 0), 0);
        const pl = placeno.get(a.id) || 0;
        const stanjeNaplate: Naplata = ukupno <= 0 ? '' : pl >= ukupno - 0.005 ? 'placeno' : pl > 0 ? 'djelimicno' : 'neplaceno';
        return {
          a,
          pacijent: p ? `${p.ime} ${p.prezime}` : '—',
          telefon: p?.telefon || '',
          doktor: doc ? `${doc.ime} ${doc.prezime}` : '—',
          ordinacija: room?.naziv || '—',
          usluge: svc.map((s) => s.naziv).join(', '),
          cijena,
          popust: Math.max(0, cijena - ukupno),
          ukupno,
          placeno: pl,
          stanjeNaplate,
        };
      })
      .filter((r) =>
        (!doctorId || r.a.doctor_id === doctorId) &&
        (!roomId || r.a.room_id === roomId) &&
        (!status || r.a.status === status) &&
        (!naplata || r.stanjeNaplate === naplata) &&
        (!term || r.pacijent.toLowerCase().includes(term) || r.telefon.includes(term) || r.usluge.toLowerCase().includes(term))
      )
      .sort((x, y) => (x.a.pocetak < y.a.pocetak ? -1 : 1));
  }, [uPeriodu, patients, doctors, rooms, placeno, doctorId, roomId, status, naplata, q]);

  const sume = rows.reduce((s, r) => ({ ukupno: s.ukupno + r.ukupno, placeno: s.placeno + r.placeno }), { ukupno: 0, placeno: 0 });

  function handleExport() {
    exportToExcel({
      title: `Termini ${od} – ${doDatum}`,
      sheets: [{
        name: 'Termini',
        columns: [
          { key: 'datum', label: 'Datum i vrijeme' },
          { key: 'pacijent', label: 'Pacijent' },
          { key: 'telefon', label: 'Telefon' },
          { key: 'doktor', label: 'Ljekar' },
          { key: 'ordinacija', label: 'Ordinacija' },
          { key: 'usluge', label: 'Usluge' },
          { key: 'status', label: 'Status' },
          { key: 'potvrdjeno', label: 'Potvrdio pacijent' },
          { key: 'cijena', label: 'Cijena', format: 'currency' },
          { key: 'popust', label: 'Popust', format: 'currency' },
          { key: 'ukupno', label: 'Ukupno', format: 'currency' },
          { key: 'placeno', label: 'Plaćeno', format: 'currency' },
          { key: 'napomena', label: 'Napomena' },
        ],
        rows: rows.map((r) => ({
          ...r,
          datum: format(parseISO(r.a.pocetak), 'dd.MM.yyyy. HH:mm'),
          status: APPOINTMENT_STATUS_LABELS[r.a.status],
          potvrdjeno: r.a.confirmed_at ? 'da' : '',
          napomena: r.a.napomena || '',
        })),
      }],
    });
  }

  const sel = 'px-3 py-2 border border-border rounded-lg text-sm bg-white';

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-4 items-end">
        <div>
          <label htmlFor="t-od" className="block text-xs font-medium text-gray-500 mb-1">Od</label>
          <input id="t-od" type="date" value={od} onChange={(e) => setOd(e.target.value)} className={`${sel} w-full`} />
        </div>
        <div>
          <label htmlFor="t-do" className="block text-xs font-medium text-gray-500 mb-1">Do</label>
          <input id="t-do" type="date" value={doDatum} min={od} onChange={(e) => setDoDatum(e.target.value)} className={`${sel} w-full`} />
        </div>
        <div>
          <label htmlFor="t-dr" className="block text-xs font-medium text-gray-500 mb-1">Ljekar</label>
          <select id="t-dr" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className={`${sel} w-full`}>
            <option value="">Svi</option>
            {doctors.map((d) => <option key={d.id} value={d.id}>{d.ime} {d.prezime}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="t-room" className="block text-xs font-medium text-gray-500 mb-1">Ordinacija</label>
          <select id="t-room" value={roomId} onChange={(e) => setRoomId(e.target.value)} className={`${sel} w-full`}>
            <option value="">Sve</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.naziv}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="t-status" className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select id="t-status" value={status} onChange={(e) => setStatus(e.target.value as AppointmentStatus | '')} className={`${sel} w-full`}>
            <option value="">Svi</option>
            {Object.entries(APPOINTMENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="t-nap" className="block text-xs font-medium text-gray-500 mb-1">Naplata</label>
          <select id="t-nap" value={naplata} onChange={(e) => setNaplata(e.target.value as Naplata)} className={`${sel} w-full`}>
            <option value="">Sve</option>
            <option value="placeno">Plaćeno</option>
            <option value="djelimicno">Djelimično</option>
            <option value="neplaceno">Nije plaćeno</option>
          </select>
        </div>
        <div className="col-span-2 md:col-span-2 xl:col-span-1">
          <label htmlFor="t-q" className="block text-xs font-medium text-gray-500 mb-1">Pretraga</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input id="t-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pacijent, telefon, usluga"
              className={`${sel} w-full pl-8`} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900 tabular-nums">{rows.length}</span> termina ·
          ukupno <span className="font-semibold tabular-nums">{eur(sume.ukupno)}</span> ·
          plaćeno <span className="font-semibold tabular-nums">{eur(sume.placeno)}</span>
        </p>
        <Button size="sm" variant="secondary" onClick={handleExport} disabled={!rows.length}>
          <Download size={14} /> Izvoz u Excel
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <CalendarX className="mx-auto text-gray-300 mb-2" size={32} />
          <p className="text-sm text-gray-500">Nema termina za izabrane filtere.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border rounded-xl bg-white">
          <table className="w-full text-sm min-w-[960px]">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                {['Datum', 'Pacijent', 'Ljekar', 'Ordinacija', 'Usluge', 'Status', 'Ukupno', 'Plaćeno'].map((h) => (
                  <th key={h} scope="col" className={`px-3 py-2 font-semibold ${['Ukupno', 'Plaćeno'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.a.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap tabular-nums text-gray-700">{format(parseISO(r.a.pocetak), 'dd.MM. HH:mm')}</td>
                  <td className="px-3 py-2 max-w-[14rem]">
                    <p className="font-medium text-gray-900 truncate">{r.pacijent}</p>
                    {r.telefon && <p className="text-xs text-gray-400">{r.telefon}</p>}
                  </td>
                  <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{r.doktor}</td>
                  <td className="px-3 py-2 text-gray-600">{r.ordinacija}</td>
                  <td className="px-3 py-2 text-gray-600 max-w-[16rem]"><span className="line-clamp-2">{r.usluge || '—'}</span></td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: APPOINTMENT_STATUS_COLORS[r.a.status] }} />
                      {APPOINTMENT_STATUS_LABELS[r.a.status]}
                    </span>
                    {r.a.confirmed_at && <span className="block text-[11px] text-success">potvrdio pacijent</span>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {eur(r.ukupno)}
                    {r.popust > 0 && <span className="block text-[11px] text-gray-400">popust {eur(r.popust)}</span>}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums ${r.stanjeNaplate === 'neplaceno' ? 'text-danger' : r.stanjeNaplate === 'djelimicno' ? 'text-warning' : 'text-gray-700'}`}>
                    {eur(r.placeno)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
