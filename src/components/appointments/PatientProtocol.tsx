import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Download, Printer, BookOpen, Search } from 'lucide-react';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { exportToExcel, printToPdf, type ReportExport } from '../../lib/exportReport';
import { useCalendar } from '../../contexts/CalendarContext';

interface Red {
  rb: number;
  id: string;
  datum: string;
  pacijent: string;
  roditelj: string;
  godiste: string;
  adresa: string;
  jmbg: string;
  anamnezaNalaz: string;
  dijagnoza: string;
  terapija: string;
  kontrola: string;
  cijena: number;
  ljekar: string;
}

// Protokol bolesnika: knjiga zavrsenih pregleda sa rednim brojem po godini.
export default function PatientProtocol() {
  const { doctors } = useCalendar();
  const [godina, setGodina] = useState(new Date().getFullYear());
  const [doctorId, setDoctorId] = useState('');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Red[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      setRows(null);
      const { data: ex, error: e } = await supabase
        .from('examinations')
        .select('id, datum, doctor_id, appointment_id, razlog_dolaska, nalaz, terapija, kontrolni_pregled, patient:patients(ime, prezime, ime_roditelja, datum_rodjenja, adresa, grad, jmbg)')
        .eq('status', 'zavrsen')
        .gte('datum', `${godina}-01-01`).lte('datum', `${godina}-12-31`)
        .order('datum').order('created_at');
      if (!alive) return;
      if (e) { setError('Protokol nije učitan: ' + e.message); setRows([]); return; }
      const list = ex || [];
      const exIds = list.map((x) => x.id);
      const aptIds = list.map((x) => x.appointment_id).filter(Boolean) as string[];
      const [dg, sv] = await Promise.all([
        exIds.length ? supabase.from('pacijent_dijagnoze').select('examination_id, mkb_sifra, naziv').in('examination_id', exIds) : Promise.resolve({ data: [] }),
        aptIds.length ? supabase.from('appointment_services').select('appointment_id, ukupno').in('appointment_id', aptIds) : Promise.resolve({ data: [] }),
      ]);
      if (!alive) return;
      const dgMap = new Map<string, string[]>();
      for (const d of (dg.data || []) as { examination_id: string; mkb_sifra: string; naziv: string }[]) {
        dgMap.set(d.examination_id, [...(dgMap.get(d.examination_id) || []), `${d.mkb_sifra} ${d.naziv}`]);
      }
      const cijenaMap = new Map<string, number>();
      for (const s of (sv.data || []) as { appointment_id: string; ukupno: number }[]) {
        cijenaMap.set(s.appointment_id, (cijenaMap.get(s.appointment_id) || 0) + Number(s.ukupno || 0));
      }
      setRows(list.map((x, i) => {
        const p = (Array.isArray(x.patient) ? x.patient[0] : x.patient) as Record<string, string> | null;
        const doc = doctors.find((d) => d.id === x.doctor_id);
        return {
          rb: i + 1,
          id: x.id,
          datum: x.datum,
          pacijent: p ? `${p.prezime} ${p.ime}` : '—',
          roditelj: p?.ime_roditelja || '',
          godiste: p?.datum_rodjenja ? p.datum_rodjenja.slice(0, 4) : '',
          adresa: [p?.adresa, p?.grad].filter(Boolean).join(', '),
          jmbg: p?.jmbg || '',
          anamnezaNalaz: [x.razlog_dolaska, x.nalaz].filter(Boolean).join(' — '),
          dijagnoza: (dgMap.get(x.id) || []).join('; '),
          terapija: x.terapija || '',
          kontrola: x.kontrolni_pregled || '',
          cijena: x.appointment_id ? cijenaMap.get(x.appointment_id) || 0 : 0,
          ljekar: doc ? `${doc.titula ? doc.titula + ' ' : ''}${doc.ime} ${doc.prezime}` : '',
        };
      }));
      setError('');
    })();
    return () => { alive = false; };
  }, [godina, doctors]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const doc = doctors.find((d) => d.id === doctorId);
    const docIme = doc ? `${doc.ime} ${doc.prezime}` : '';
    return (rows || []).filter((r) => (!docIme || r.ljekar.includes(docIme)) && (!t || r.pacijent.toLowerCase().includes(t) || r.dijagnoza.toLowerCase().includes(t)));
  }, [rows, q, doctorId, doctors]);

  function izvoz(): ReportExport {
    return {
      title: `Protokol bolesnika ${godina}`,
      subtitle: doctorId ? doctors.find((d) => d.id === doctorId)?.ime + ' ' + doctors.find((d) => d.id === doctorId)?.prezime : undefined,
      sheets: [{
        name: `Protokol ${godina}`,
        columns: [
          { key: 'rb', label: 'R. br.', format: 'number' },
          { key: 'datumTxt', label: 'Datum' },
          { key: 'pacijent', label: 'Prezime i ime' },
          { key: 'roditelj', label: 'Ime roditelja' },
          { key: 'godiste', label: 'Godište' },
          { key: 'adresa', label: 'Adresa' },
          { key: 'jmbg', label: 'JMBG' },
          { key: 'anamnezaNalaz', label: 'Anamneza i nalaz' },
          { key: 'dijagnoza', label: 'Dijagnoza (MKB)' },
          { key: 'terapija', label: 'Terapija' },
          { key: 'kontrola', label: 'Kontrola' },
          { key: 'cijena', label: 'Cijena', format: 'currency' },
          { key: 'ljekar', label: 'Ljekar' },
        ],
        rows: shown.map((r) => ({ ...r, datumTxt: format(parseISO(r.datum), 'dd.MM.yyyy.') })),
      }],
    };
  }

  const thisYear = new Date().getFullYear();
  const sel = 'px-3 py-2 border border-border rounded-lg text-sm bg-white';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <div>
            <label htmlFor="pr-god" className="block text-xs font-medium text-gray-500 mb-1">Godina</label>
            <select id="pr-god" value={godina} onChange={(e) => setGodina(Number(e.target.value))} className={sel}>
              {[thisYear, thisYear - 1, thisYear - 2].map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="pr-dr" className="block text-xs font-medium text-gray-500 mb-1">Ljekar</label>
            <select id="pr-dr" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className={`${sel} max-w-[16rem]`}>
              <option value="">Svi</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.ime} {d.prezime}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="pr-q" className="block text-xs font-medium text-gray-500 mb-1">Pretraga</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input id="pr-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pacijent ili dijagnoza" className={`${sel} pl-8 w-60`} />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => printToPdf(izvoz())} disabled={!shown.length}><Printer size={14} /> Štampa</Button>
          <Button variant="secondary" size="sm" onClick={() => exportToExcel(izvoz())} disabled={!shown.length}><Download size={14} /> Excel</Button>
        </div>
      </div>

      {error && <div role="alert" className="px-4 py-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>}

      {!rows ? (
        <div className="space-y-2" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />)}</div>
      ) : shown.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <BookOpen className="mx-auto text-gray-300 mb-2" size={32} />
          <p className="text-sm text-gray-500">Nema završenih pregleda za {godina}. godinu.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border rounded-xl bg-white">
          <table className="w-full text-sm min-w-[1100px]">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                {['R. br.', 'Datum', 'Pacijent', 'Godište / adresa', 'Anamneza i nalaz', 'Dijagnoza', 'Terapija', 'Kontrola', 'Cijena', 'Ljekar'].map((h) => (
                  <th key={h} scope="col" className={`px-3 py-2 font-semibold ${h === 'Cijena' || h === 'R. br.' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border align-top">
              {shown.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-500">{r.rb}</td>
                  <td className="px-3 py-2 whitespace-nowrap tabular-nums">{format(parseISO(r.datum), 'dd.MM.yyyy.')}</td>
                  <td className="px-3 py-2">
                    <p className="font-medium text-gray-900">{r.pacijent}</p>
                    {r.roditelj && <p className="text-xs text-gray-400">roditelj: {r.roditelj}</p>}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{r.godiste}{r.adresa && <span className="block text-xs text-gray-400">{r.adresa}</span>}</td>
                  <td className="px-3 py-2 text-gray-700 max-w-[18rem]"><span className="line-clamp-3">{r.anamnezaNalaz || '—'}</span></td>
                  <td className="px-3 py-2 text-gray-700 max-w-[12rem]">{r.dijagnoza || '—'}</td>
                  <td className="px-3 py-2 text-gray-700 max-w-[14rem]"><span className="line-clamp-3">{r.terapija || '—'}</span></td>
                  <td className="px-3 py-2 text-gray-600">{r.kontrola || '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.cijena ? `${r.cijena.toFixed(2)} €` : '—'}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{r.ljekar}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
