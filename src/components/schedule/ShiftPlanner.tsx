import { useCallback, useEffect, useState } from 'react';
import { addDays, addWeeks, format, isToday, startOfWeek } from 'date-fns';
import { srLatn as sr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Copy, Eraser, Moon, Plus, Settings2, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { danStatus, RAZLOZI_ODSUSTVA, type RasporedPodaci } from '../../lib/schedule';
import {
  BOJE_SMJENA, dodijeliSmjenu, kopirajProsluSedmicu, loadSmjene, sacuvajSmjene,
  type Dodjela, type Smjena,
} from '../../lib/smjene';
import type { Doctor } from '../../types';

interface Props {
  doctors: Doctor[];
  data: RasporedPodaci;
  onSaved: () => Promise<void> | void;
}

type Alat = { vrsta: 'smjena'; id: string } | { vrsta: 'slobodan' } | { vrsta: 'obrisi' };
type RedSmjene = Omit<Smjena, 'id' | 'redoslijed'> & { id?: string };

// Raspored smjena: izaberi smjenu gore, pa klikni polje (osoba × dan) da je dodijelis.
export default function ShiftPlanner({ doctors, data, onSaved }: Props) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [smjene, setSmjene] = useState<Smjena[]>([]);
  const [alat, setAlat] = useState<Alat | null>(null);
  const [zauzeto, setZauzeto] = useState('');
  const [poruka, setPoruka] = useState('');
  const [greska, setGreska] = useState('');
  const [uredi, setUredi] = useState(false);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const ucitajSmjene = useCallback(async () => {
    try {
      const s = await loadSmjene();
      setSmjene(s);
      setAlat((a) => {
        if (a && (a.vrsta !== 'smjena' || s.some((x) => x.id === a.id))) return a;
        return s.length ? { vrsta: 'smjena', id: s[0].id } : null;
      });
    } catch (e) {
      setGreska('Smjene nisu učitane: ' + (e instanceof Error ? e.message : 'nepoznata greška'));
    }
  }, []);

  useEffect(() => { ucitajSmjene(); }, [ucitajSmjene]);

  async function klik(doctorId: string, iso: string) {
    if (!alat || zauzeto) return;
    let dodjela: Dodjela;
    if (alat.vrsta === 'smjena') {
      const s = smjene.find((x) => x.id === alat.id);
      if (!s) return;
      dodjela = { vrsta: 'smjena', smjena: s };
    } else {
      dodjela = alat;
    }
    setZauzeto(`${doctorId}|${iso}`);
    setGreska('');
    setPoruka('');
    try {
      await dodijeliSmjenu(doctorId, iso, dodjela);
      await onSaved();
    } catch (e) {
      setGreska('Nije sačuvano: ' + (e instanceof Error ? e.message : 'nepoznata greška'));
    } finally {
      setZauzeto('');
    }
  }

  async function kopiraj() {
    setGreska('');
    setPoruka('');
    setZauzeto('kopiranje');
    try {
      const n = await kopirajProsluSedmicu(weekStart, data.schedules);
      await onSaved();
      setPoruka(n > 0 ? `Prepisano ${n} dana iz prošle sedmice.` : 'Nema šta da se prepiše: prošla sedmica je prazna ili je ova već popunjena.');
    } catch (e) {
      setGreska('Kopiranje nije uspjelo: ' + (e instanceof Error ? e.message : 'nepoznata greška'));
    } finally {
      setZauzeto('');
    }
  }

  const alatCls = (aktivan: boolean) =>
    `inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
      aktivan ? 'border-gray-900 bg-gray-900 text-white' : 'border-border bg-white text-gray-700 hover:bg-gray-50'
    }`;

  return (
    <div>
      {/* Alat: sta se upisuje klikom na polje */}
      <div className="bg-white border border-border rounded-xl p-3 mb-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            1. Izaberi smjenu &nbsp;·&nbsp; 2. Klikni polje u tabeli
          </p>
          <button
            type="button"
            onClick={() => setUredi(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-700 hover:text-primary-800"
          >
            <Settings2 size={14} /> Uredi smjene
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {smjene.map((s) => {
            const aktivan = alat?.vrsta === 'smjena' && alat.id === s.id;
            return (
              <button key={s.id} type="button" aria-pressed={aktivan} onClick={() => setAlat({ vrsta: 'smjena', id: s.id })} className={alatCls(aktivan)}>
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.boja }} />
                {s.naziv}
                <span className={`text-xs tabular-nums ${aktivan ? 'text-white/70' : 'text-gray-400'}`}>{s.pocetak}–{s.kraj}</span>
              </button>
            );
          })}
          <button type="button" aria-pressed={alat?.vrsta === 'slobodan'} onClick={() => setAlat({ vrsta: 'slobodan' })} className={alatCls(alat?.vrsta === 'slobodan')}>
            <Moon size={14} /> Slobodan dan
          </button>
          <button type="button" aria-pressed={alat?.vrsta === 'obrisi'} onClick={() => setAlat({ vrsta: 'obrisi' })} className={alatCls(alat?.vrsta === 'obrisi')}>
            <Eraser size={14} /> Obriši unos
          </button>
        </div>
        {smjene.length === 0 && (
          <p className="mt-2 text-sm text-gray-500">Još nema definisanih smjena. Klikni „Uredi smjene" da dodaš prvu.</p>
        )}
      </div>

      {/* Sedmica */}
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
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
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={kopiraj} loading={zauzeto === 'kopiranje'}>
            <Copy size={14} /> Kopiraj prošlu sedmicu
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            Ova sedmica
          </Button>
        </div>
      </div>

      {greska && <div role="alert" className="mb-3 px-4 py-2.5 rounded-lg bg-red-50 text-sm text-red-700">{greska}</div>}
      {poruka && <div role="status" className="mb-3 px-4 py-2.5 rounded-lg bg-primary-50 text-sm text-primary-800">{poruka}</div>}

      <div className="overflow-x-auto border border-border rounded-xl bg-white">
        <table className="w-full text-xs min-w-[860px] border-collapse table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="text-left px-3 py-2.5 font-semibold text-gray-600 w-52">Osoblje</th>
              {days.map((d) => (
                <th key={d.toISOString()} scope="col" className={`px-1 py-2.5 font-semibold capitalize ${isToday(d) ? 'text-primary-700' : 'text-gray-600'}`}>
                  {format(d, 'EEE d.', { locale: sr })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {doctors.map((doc) => (
              <tr key={doc.id}>
                <th scope="row" className="text-left px-3 py-1.5 font-medium text-gray-800">
                  <span className="inline-block w-2 h-2 rounded-full mr-2 align-middle" style={{ backgroundColor: doc.boja }} />
                  <span>{doc.titula ? `${doc.titula} ` : ''}{doc.ime} {doc.prezime}</span>
                </th>
                {days.map((d) => {
                  const iso = format(d, 'yyyy-MM-dd');
                  const st = danStatus(doc.id, d, data);
                  const red = data.schedules.find((s) => s.doctor_id === doc.id && !s.ponavljajuci && s.datum === iso);
                  const ucitava = zauzeto === `${doc.id}|${iso}`;
                  const ime = `${doc.ime} ${doc.prezime}, ${format(d, 'EEEE d.M.', { locale: sr })}`;

                  if (st.status === 'odsustvo') {
                    return (
                      <td key={iso} className="px-1 py-1">
                        <div title={st.napomena || RAZLOZI_ODSUSTVA[st.razlog]} className="h-11 rounded-lg bg-red-50 text-red-700 flex items-center justify-center text-[11px] font-medium px-1 text-center leading-tight">
                          {RAZLOZI_ODSUSTVA[st.razlog]}
                        </div>
                      </td>
                    );
                  }

                  let sadrzaj: React.ReactNode;
                  let stil: React.CSSProperties | undefined;
                  let cls = 'border border-dashed border-gray-200 text-gray-300 hover:border-gray-400 hover:text-gray-500';
                  let opis = 'nema unosa';

                  if (red && (red.tip === 'neradni' || !red.pocetak || !red.kraj)) {
                    cls = 'bg-gray-100 text-gray-500 border border-transparent';
                    sadrzaj = <span className="font-medium">Slobodan</span>;
                    opis = 'slobodan dan';
                  } else if (red) {
                    const s = smjene.find((x) => x.naziv === red.napomena)
                      || smjene.find((x) => x.pocetak === red.pocetak && x.kraj === red.kraj);
                    const boja = s?.boja || '#6B7280';
                    stil = { backgroundColor: `${boja}22`, borderColor: `${boja}66` };
                    cls = 'border text-gray-900';
                    sadrzaj = (
                      <>
                        <span className="font-semibold leading-tight truncate max-w-full">{s?.naziv || 'Posebno'}</span>
                        <span className="text-[10px] text-gray-600 tabular-nums leading-tight">{red.pocetak}–{red.kraj}</span>
                      </>
                    );
                    opis = `${s?.naziv || 'posebno radno vrijeme'} ${red.pocetak}–${red.kraj}`;
                  } else if (st.status === 'radi') {
                    cls = 'border border-dashed border-gray-200 text-gray-500 hover:border-gray-400';
                    sadrzaj = (
                      <>
                        <span className="tabular-nums leading-tight">{st.pocetak}–{st.kraj}</span>
                        <span className="text-[10px] text-gray-400 leading-tight">šablon</span>
                      </>
                    );
                    opis = `po šablonu ${st.pocetak}–${st.kraj}`;
                  } else if (st.status === 'ne_radi') {
                    sadrzaj = <span className="text-gray-400">slobodan</span>;
                    opis = 'po šablonu slobodan';
                  } else {
                    sadrzaj = <Plus size={14} />;
                  }

                  return (
                    <td key={iso} className="px-1 py-1">
                      <button
                        type="button"
                        onClick={() => klik(doc.id, iso)}
                        disabled={!alat || !!zauzeto}
                        aria-label={`${ime}: ${opis}`}
                        style={stil}
                        className={`w-full h-11 rounded-lg px-1 flex flex-col items-center justify-center text-[11px] transition-colors ${cls} ${ucitava ? 'opacity-50' : ''} ${!alat ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {sadrzaj}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-gray-400">
        Polje sa oznakom „šablon" dolazi iz taba Radno vrijeme. Smjena upisana ovdje važi samo za taj dan i ima prednost.
        Zakazivanje termina upozorava ako je termin van dodijeljene smjene.
      </p>

      {uredi && (
        <UrediSmjene
          smjene={smjene}
          onClose={() => setUredi(false)}
          onSaved={async () => { setUredi(false); await ucitajSmjene(); }}
        />
      )}
    </div>
  );
}

function UrediSmjene({ smjene, onClose, onSaved }: { smjene: Smjena[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [redovi, setRedovi] = useState<RedSmjene[]>(() =>
    smjene.map((s) => ({ id: s.id, naziv: s.naziv, pocetak: s.pocetak, kraj: s.kraj, boja: s.boja }))
  );
  const [cuva, setCuva] = useState(false);
  const [greska, setGreska] = useState('');

  const izmijeni = (i: number, dio: Partial<RedSmjene>) =>
    setRedovi((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...dio } : r)));

  async function sacuvaj() {
    for (const r of redovi) {
      if (!r.naziv.trim()) { setGreska('Svaka smjena mora imati naziv.'); return; }
      if (!r.pocetak || !r.kraj || r.pocetak >= r.kraj) { setGreska(`Smjena „${r.naziv}": kraj mora biti poslije početka.`); return; }
    }
    setCuva(true);
    setGreska('');
    try {
      await sacuvajSmjene(smjene, redovi.map((r, i) => ({ ...r, redoslijed: i + 1 })));
      await onSaved();
    } catch (e) {
      setGreska('Nije sačuvano: ' + (e instanceof Error ? e.message : 'nepoznata greška'));
      setCuva(false);
    }
  }

  const polje = 'px-2.5 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <Modal isOpen onClose={onClose} title="Smjene" size="md">
      <div className="space-y-3">
        <p className="text-sm text-gray-500">Smjene se definišu jednom i onda se dodjeljuju klikom u tabeli.</p>
        {redovi.map((r, i) => (
          <div key={r.id || `nova-${i}`} className="flex items-center gap-2 flex-wrap">
            <input
              type="color"
              value={r.boja}
              onChange={(e) => izmijeni(i, { boja: e.target.value })}
              aria-label="Boja smjene"
              list="boje-smjena"
              className="w-9 h-9 rounded-lg border border-border p-0.5 bg-white cursor-pointer shrink-0"
            />
            <input
              type="text"
              value={r.naziv}
              onChange={(e) => izmijeni(i, { naziv: e.target.value })}
              placeholder="npr. Prva smjena"
              aria-label="Naziv smjene"
              className={`${polje} flex-1 min-w-[9rem]`}
            />
            <input type="time" value={r.pocetak} onChange={(e) => izmijeni(i, { pocetak: e.target.value })} aria-label="Početak" className={polje} />
            <span className="text-gray-400">–</span>
            <input type="time" value={r.kraj} onChange={(e) => izmijeni(i, { kraj: e.target.value })} aria-label="Kraj" className={polje} />
            <button
              type="button"
              onClick={() => setRedovi((prev) => prev.filter((_, idx) => idx !== i))}
              aria-label={`Ukloni smjenu ${r.naziv}`}
              className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <datalist id="boje-smjena">
          {BOJE_SMJENA.map((b) => <option key={b} value={b} />)}
        </datalist>
        <button
          type="button"
          onClick={() => setRedovi((prev) => [...prev, { naziv: '', pocetak: '08:00', kraj: '16:00', boja: BOJE_SMJENA[prev.length % BOJE_SMJENA.length] }])}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:text-primary-800"
        >
          <Plus size={15} /> Dodaj smjenu
        </button>
        {greska && <div role="alert" className="px-3 py-2 rounded-lg bg-red-50 text-sm text-red-700">{greska}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Otkaži</Button>
          <Button onClick={sacuvaj} loading={cuva}>Sačuvaj</Button>
        </div>
      </div>
    </Modal>
  );
}
