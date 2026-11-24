import { useCallback, useEffect, useState } from 'react';
import { addDays, addWeeks, format, getISODay, isToday, startOfWeek } from 'date-fns';
import { srLatn as sr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Copy, Eraser, Moon, Plus, Settings2, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { DANI, danStatus, RAZLOZI_ODSUSTVA, type RasporedPodaci } from '../../lib/schedule';
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

type Opseg = 'dan' | 'radna' | 'sedmica';
type RedSmjene = Omit<Smjena, 'id' | 'redoslijed'> & { id?: string };

const osobaIme = (d: Doctor) => `${d.titula ? `${d.titula} ` : ''}${d.ime} ${d.prezime}`;
const danNaziv = (d: Date) => `${DANI[getISODay(d) - 1]}, ${format(d, 'd.M.yyyy.')}`;

// Raspored smjena: klik na polje (osoba × dan) otvara izbor smjene za taj dan ili cijelu sedmicu.
export default function ShiftPlanner({ doctors, data, onSaved }: Props) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [smjene, setSmjene] = useState<Smjena[]>([]);
  const [izbor, setIzbor] = useState<{ doc: Doctor; dan: Date } | null>(null);
  const [opseg, setOpseg] = useState<Opseg>('dan');
  const [zauzeto, setZauzeto] = useState('');
  const [poruka, setPoruka] = useState('');
  const [greska, setGreska] = useState('');
  const [uredi, setUredi] = useState(false);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const ucitajSmjene = useCallback(async () => {
    try {
      setSmjene(await loadSmjene());
    } catch (e) {
      setGreska('Smjene nisu učitane: ' + (e instanceof Error ? e.message : 'nepoznata greška'));
    }
  }, []);

  useEffect(() => { ucitajSmjene(); }, [ucitajSmjene]);

  function otvori(doc: Doctor, dan: Date) {
    setOpseg('dan');
    setGreska('');
    setPoruka('');
    setIzbor({ doc, dan });
  }

  // Upisuje izabranu smjenu za dan, radnu sedmicu (pon–pet) ili cijelu sedmicu. Dani odsustva se preskacu.
  async function primijeni(dodjela: Dodjela) {
    if (!izbor || zauzeto) return;
    const { doc, dan } = izbor;
    const ciljevi = (opseg === 'dan' ? [dan] : opseg === 'radna' ? days.slice(0, 5) : days)
      .filter((d) => danStatus(doc.id, d, data).status !== 'odsustvo');
    setZauzeto('upis');
    setGreska('');
    try {
      for (const d of ciljevi) {
        await dodijeliSmjenu(doc.id, format(d, 'yyyy-MM-dd'), dodjela);
      }
      await onSaved();
      setIzbor(null);
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

  const izborRed = izbor
    ? data.schedules.find((s) => s.doctor_id === izbor.doc.id && !s.ponavljajuci && s.datum === format(izbor.dan, 'yyyy-MM-dd'))
    : undefined;

  return (
    <div>
      {/* Legenda smjena */}
      <div className="bg-white border border-border rounded-xl p-3 mb-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-sm text-gray-600">
            Klikni polje u tabeli da dodijeliš smjenu — za jedan dan ili cijelu sedmicu.
          </p>
          <button
            type="button"
            onClick={() => setUredi(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-700 hover:text-primary-800 shrink-0"
          >
            <Settings2 size={14} /> Uredi smjene
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {smjene.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border"
              style={{ backgroundColor: `${s.boja}22`, borderColor: `${s.boja}66` }}>
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.boja }} />
              <span className="font-medium text-gray-900">{s.naziv}</span>
              <span className="text-xs tabular-nums text-gray-600">{s.pocetak}–{s.kraj}</span>
            </span>
          ))}
          {smjene.length === 0 && (
            <p className="text-sm text-gray-500">Još nema definisanih smjena. Klikni „Uredi smjene" da dodaš prvu.</p>
          )}
        </div>
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

      {greska && !izbor && <div role="alert" className="mb-3 px-4 py-2.5 rounded-lg bg-red-50 text-sm text-red-700">{greska}</div>}
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
                  <span>{osobaIme(doc)}</span>
                </th>
                {days.map((d) => {
                  const iso = format(d, 'yyyy-MM-dd');
                  const st = danStatus(doc.id, d, data);
                  const red = data.schedules.find((s) => s.doctor_id === doc.id && !s.ponavljajuci && s.datum === iso);

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
                  let cls = 'border border-dashed border-gray-200 text-gray-300 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50';
                  let opis = 'nema unosa';

                  if (red && (red.tip === 'neradni' || !red.pocetak || !red.kraj)) {
                    cls = 'bg-gray-100 text-gray-500 border border-transparent hover:border-gray-300';
                    sadrzaj = <span className="font-medium">Slobodan</span>;
                    opis = 'slobodan dan';
                  } else if (red) {
                    const s = smjene.find((x) => x.naziv === red.napomena)
                      || smjene.find((x) => x.pocetak === red.pocetak && x.kraj === red.kraj);
                    const boja = s?.boja || '#6B7280';
                    stil = { backgroundColor: `${boja}22`, borderColor: `${boja}66` };
                    cls = 'border text-gray-900 hover:brightness-95';
                    sadrzaj = (
                      <>
                        <span className="font-semibold leading-tight truncate max-w-full">{s?.naziv || 'Posebno'}</span>
                        <span className="text-[10px] text-gray-600 tabular-nums leading-tight">{red.pocetak}–{red.kraj}</span>
                      </>
                    );
                    opis = `${s?.naziv || 'posebno radno vrijeme'} ${red.pocetak}–${red.kraj}`;
                  } else if (st.status === 'radi') {
                    cls = 'border border-dashed border-gray-200 text-gray-500 hover:border-primary-400 hover:bg-primary-50';
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
                        onClick={() => otvori(doc, d)}
                        aria-label={`${doc.ime} ${doc.prezime}, ${danNaziv(d)}: ${opis}. Promijeni`}
                        style={stil}
                        className={`w-full h-11 rounded-lg px-1 flex flex-col items-center justify-center text-[11px] transition-colors cursor-pointer ${cls}`}
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

      {/* Izbor smjene za kliknuto polje */}
      {izbor && (
        <Modal isOpen onClose={() => { if (!zauzeto) setIzbor(null); }} title="Dodijeli smjenu" size="sm">
          <div className="space-y-4">
            <div>
              <p className="text-base font-semibold text-gray-900">{osobaIme(izbor.doc)}</p>
              <p className="text-sm text-gray-500">{danNaziv(izbor.dan)}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Važi za</p>
              <div className="grid grid-cols-3 gap-1 bg-gray-100 rounded-lg p-0.5">
                {([['dan', 'Samo ovaj dan'], ['radna', 'Pon–pet'], ['sedmica', 'Cijelu sedmicu']] as [Opseg, string][]).map(([id, naziv]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={opseg === id}
                    onClick={() => setOpseg(id)}
                    className={`px-2 py-2 text-xs font-medium rounded-md transition-colors ${
                      opseg === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {naziv}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {smjene.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={!!zauzeto}
                  onClick={() => primijeni({ vrsta: 'smjena', smjena: s })}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors hover:brightness-95 disabled:opacity-50"
                  style={{ backgroundColor: `${s.boja}22`, borderColor: `${s.boja}66` }}
                >
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.boja }} />
                  <span className="text-sm font-semibold text-gray-900 flex-1">{s.naziv}</span>
                  <span className="text-sm tabular-nums text-gray-700">{s.pocetak}–{s.kraj}</span>
                </button>
              ))}
              {smjene.length === 0 && (
                <p className="text-sm text-gray-500">Nema definisanih smjena. Zatvori ovaj prozor i klikni „Uredi smjene".</p>
              )}
              <button
                type="button"
                disabled={!!zauzeto}
                onClick={() => primijeni({ vrsta: 'slobodan' })}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-gray-50 text-left text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                <Moon size={15} className="shrink-0" /> Slobodan dan
              </button>
              {(izborRed || opseg !== 'dan') && (
                <button
                  type="button"
                  disabled={!!zauzeto}
                  onClick={() => primijeni({ vrsta: 'obrisi' })}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-red-200 bg-white text-left text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Eraser size={15} className="shrink-0" /> Obriši unos
                </button>
              )}
            </div>

            {zauzeto === 'upis' && <p className="text-sm text-gray-500">Čuvam…</p>}
            {greska && <div role="alert" className="px-3 py-2 rounded-lg bg-red-50 text-sm text-red-700">{greska}</div>}
          </div>
        </Modal>
      )}

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
