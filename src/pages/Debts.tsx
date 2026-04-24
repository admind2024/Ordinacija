import { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { srLatn as sr } from 'date-fns/locale';
import { Wallet, Search, Plus, ChevronRight, ChevronDown, Banknote, X, Check, Trash2, Calendar, Stethoscope, Receipt, FileText } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import type { Dugovanje, UplataDuga } from '../types';

interface DebtWithPatient extends Omit<Dugovanje, 'patient'> {
  patient?: { ime: string; prezime: string; telefon: string };
}

interface DebtDetails {
  services: { id: string; naziv: string; kolicina: number; cijena: number; ukupno: number }[];
  appointment?: { pocetak: string; doctor_name?: string };
  initialPayment?: { iznos: number; datum: string; metoda: string };
}

type FilterStatus = 'aktivan' | 'placen' | 'svi';

export default function Debts() {
  const [debts, setDebts] = useState<DebtWithPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('aktivan');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [uplate, setUplate] = useState<Record<string, UplataDuga[]>>({});
  const [details, setDetails] = useState<Record<string, DebtDetails>>({});

  // Nova uplata form
  const [showPayForm, setShowPayForm] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('kes');
  const [payNote, setPayNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Novi dug form
  const [showNewDebt, setShowNewDebt] = useState(false);
  const [newPatientSearch, setNewPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<{ id: string; ime: string; prezime: string; telefon: string }[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newNote, setNewNote] = useState('');

  const fetchDebts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('dugovanja')
      .select('*, patient:patients(ime, prezime, telefon)')
      .order('created_at', { ascending: false });
    setDebts((data || []) as DebtWithPatient[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDebts(); }, [fetchDebts]);

  async function loadUplate(debtId: string) {
    if (uplate[debtId]) return;
    const { data } = await supabase
      .from('uplate_duga')
      .select('*')
      .eq('dugovanje_id', debtId)
      .order('datum', { ascending: false });
    setUplate((prev) => ({ ...prev, [debtId]: (data || []) as UplataDuga[] }));
  }

  async function loadDebtDetails(debt: DebtWithPatient) {
    if (details[debt.id]) return;
    const d: DebtDetails = { services: [] };

    if (debt.appointment_id) {
      // Usluge iz appointment_services
      const { data: svcData } = await supabase
        .from('appointment_services')
        .select('*')
        .eq('appointment_id', debt.appointment_id);
      d.services = (svcData || []).map((s: any) => ({
        id: s.id,
        naziv: s.naziv,
        kolicina: Number(s.kolicina) || 1,
        cijena: Number(s.cijena) || 0,
        ukupno: Number(s.ukupno) || 0,
      }));

      // Termin + doktor
      const { data: aptData } = await supabase
        .from('appointments')
        .select('pocetak, doctor_id, doctors:doctors(ime, prezime, titula)')
        .eq('id', debt.appointment_id)
        .maybeSingle();
      if (aptData) {
        const doc: any = (aptData as any).doctors;
        d.appointment = {
          pocetak: (aptData as any).pocetak,
          doctor_name: doc ? `${doc.titula || 'Dr'} ${doc.ime} ${doc.prezime}` : undefined,
        };
      }

      // Inicijalna uplata iz payments
      const { data: payData } = await supabase
        .from('payments')
        .select('iznos, datum, metoda')
        .eq('appointment_id', debt.appointment_id)
        .order('datum', { ascending: true })
        .limit(1);
      if (payData && payData[0]) {
        d.initialPayment = {
          iznos: Number((payData[0] as any).iznos) || 0,
          datum: (payData[0] as any).datum,
          metoda: (payData[0] as any).metoda || '',
        };
      }
    }

    setDetails((prev) => ({ ...prev, [debt.id]: d }));
  }

  function toggleExpand(debt: DebtWithPatient) {
    if (expandedId === debt.id) {
      setExpandedId(null);
    } else {
      setExpandedId(debt.id);
      loadUplate(debt.id);
      loadDebtDetails(debt);
    }
    setShowPayForm(null);
  }

  async function handlePayment(debtId: string) {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return;
    setSaving(true);

    const debt = debts.find((d) => d.id === debtId);
    if (!debt) { setSaving(false); return; }

    const { data: inserted } = await supabase.from('uplate_duga').insert({
      dugovanje_id: debtId,
      iznos: amount,
      datum: new Date().toISOString().slice(0, 10),
      nacin_placanja: payMethod,
      napomena: payNote || null,
    }).select().single();

    const newPreostalo = Math.max(0, debt.preostalo - amount);
    const newStatus = newPreostalo <= 0 ? 'placen' : 'aktivan';

    await supabase.from('dugovanja')
      .update({ preostalo: newPreostalo, status: newStatus })
      .eq('id', debtId);

    // Update local state
    setDebts((prev) => prev.map((d) =>
      d.id === debtId ? { ...d, preostalo: newPreostalo, status: newStatus } : d
    ));
    if (inserted) {
      setUplate((prev) => ({
        ...prev,
        [debtId]: [inserted as UplataDuga, ...(prev[debtId] || [])],
      }));
    }

    setPayAmount('');
    setPayNote('');
    setShowPayForm(null);
    setSaving(false);
  }

  async function searchPatients(query: string) {
    setNewPatientSearch(query);
    if (query.length < 2) { setPatientResults([]); return; }
    const { data } = await supabase
      .from('patients')
      .select('id, ime, prezime, telefon')
      .or(`ime.ilike.%${query}%,prezime.ilike.%${query}%`)
      .limit(10);
    setPatientResults((data || []) as any[]);
  }

  async function handleNewDebt() {
    if (!selectedPatientId || !newAmount) return;
    setSaving(true);

    await supabase.from('dugovanja').insert({
      patient_id: selectedPatientId,
      iznos: parseFloat(newAmount),
      preostalo: parseFloat(newAmount),
      opis: newDesc || null,
      datum_nastanka: new Date().toISOString().slice(0, 10),
      status: 'aktivan',
      napomena: newNote || null,
    });

    setShowNewDebt(false);
    setSelectedPatientId('');
    setSelectedPatientName('');
    setNewAmount('');
    setNewDesc('');
    setNewNote('');
    setNewPatientSearch('');
    setSaving(false);
    fetchDebts();
  }

  async function handleDeleteDebt(debtId: string) {
    await supabase.from('dugovanja').delete().eq('id', debtId);
    setDebts((prev) => prev.filter((d) => d.id !== debtId));
    setExpandedId(null);
  }

  const filtered = debts.filter((d) => {
    if (filterStatus !== 'svi' && d.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = `${d.patient?.ime || ''} ${d.patient?.prezime || ''}`.toLowerCase();
      if (!name.includes(q)) return false;
    }
    return true;
  });

  const totalDug = debts.filter((d) => d.status === 'aktivan').reduce((sum, d) => sum + d.preostalo, 0);
  const aktivnihDuznika = new Set(debts.filter((d) => d.status === 'aktivan').map((d) => d.patient_id)).size;

  return (
    <div>
      {/* KPI cards */}
      <div className="mb-6 flex items-center justify-end flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="text-center px-4 py-2 bg-red-50 rounded-xl border border-red-100">
            <p className="text-2xl font-bold text-red-700">{totalDug.toFixed(0)}<span className="text-sm font-medium ml-0.5">EUR</span></p>
            <p className="text-[10px] uppercase tracking-wider text-red-500 font-medium">Ukupan dug</p>
          </div>
          <div className="text-center px-4 py-2 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-2xl font-bold text-amber-700">{aktivnihDuznika}</p>
            <p className="text-[10px] uppercase tracking-wider text-amber-500 font-medium">Duznika</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pretrazi po imenu..."
            className="w-full pl-9 pr-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          />
        </div>
        <div className="flex gap-1.5">
          {(['aktivan', 'placen', 'svi'] as FilterStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors
                ${filterStatus === s
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
            >
              {s === 'aktivan' ? 'Aktivni' : s === 'placen' ? 'Placeni' : 'Svi'}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setShowNewDebt(true)}>
          <Plus size={14} /> Novi dug
        </Button>
      </div>

      {/* Novi dug modal */}
      {showNewDebt && (
        <Card className="mb-4 border-primary-200 bg-primary-50/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Novi dug</h3>
            <button onClick={() => setShowNewDebt(false)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <label className="block text-xs font-medium text-gray-600 mb-1">Pacijent</label>
              {selectedPatientId ? (
                <div className="flex items-center gap-2 px-3 py-2.5 border border-border rounded-lg bg-white">
                  <span className="text-sm font-medium">{selectedPatientName}</span>
                  <button onClick={() => { setSelectedPatientId(''); setSelectedPatientName(''); }} className="text-gray-400 hover:text-red-500 ml-auto">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={newPatientSearch}
                    onChange={(e) => searchPatients(e.target.value)}
                    placeholder="Pretrazi pacijenta..."
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  />
                  {patientResults.length > 0 && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {patientResults.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setSelectedPatientId(p.id);
                            setSelectedPatientName(`${p.ime} ${p.prezime}`);
                            setPatientResults([]);
                            setNewPatientSearch('');
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                        >
                          {p.ime} {p.prezime} {p.telefon && <span className="text-gray-400 ml-2">{p.telefon}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Iznos (EUR)</label>
              <input
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Opis</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Za sta je dug..."
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Napomena</label>
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Dodatna napomena..."
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              />
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <Button onClick={handleNewDebt} disabled={!selectedPatientId || !newAmount || saving}>
              <Plus size={14} /> Dodaj dug
            </Button>
          </div>
        </Card>
      )}

      {/* Lista */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Ucitavanje...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Wallet size={48} className="mx-auto mb-4 text-gray-200" />
          <p className="text-gray-400 font-medium">Nema dugovanja</p>
          <p className="text-sm text-gray-300 mt-1">
            {searchQuery ? 'Probajte drugi pojam' : filterStatus === 'placen' ? 'Nema placenih dugova' : 'Svi dugovi su placeni'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((debt) => {
            const isExpanded = expandedId === debt.id;
            const paidPercent = debt.iznos > 0 ? ((debt.iznos - debt.preostalo) / debt.iznos) * 100 : 0;
            const debtUplate = uplate[debt.id] || [];

            return (
              <div key={debt.id} className="bg-white rounded-xl border border-border overflow-hidden">
                {/* Header row */}
                <button
                  onClick={() => toggleExpand(debt)}
                  className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0
                    ${debt.status === 'placen' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {debt.patient?.ime?.charAt(0)}{debt.patient?.prezime?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {debt.patient?.ime} {debt.patient?.prezime}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{debt.opis || 'Bez opisa'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-lg font-bold ${debt.status === 'placen' ? 'text-green-600' : 'text-red-600'}`}>
                      {debt.preostalo.toFixed(0)} EUR
                    </p>
                    {debt.preostalo !== debt.iznos && (
                      <p className="text-xs text-gray-400">od {debt.iznos.toFixed(0)} EUR</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold
                      ${debt.status === 'placen' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {debt.status === 'placen' ? 'Placen' : 'Aktivan'}
                    </span>
                    {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (() => {
                  const det = details[debt.id];
                  // Sastavi hronologiju: datum_nastanka + initial payment + uplate_duga
                  type TimelineEvent = { datum: string; tip: 'nastao' | 'inicijalna' | 'rata' | 'zatvoren'; iznos?: number; metoda?: string; napomena?: string };
                  const events: TimelineEvent[] = [];
                  events.push({ datum: debt.datum_nastanka, tip: 'nastao' });
                  if (det?.initialPayment && det.initialPayment.iznos > 0) {
                    events.push({ datum: det.initialPayment.datum.slice(0, 10), tip: 'inicijalna', iznos: det.initialPayment.iznos, metoda: det.initialPayment.metoda });
                  }
                  debtUplate.forEach((u) => events.push({ datum: u.datum, tip: 'rata', iznos: u.iznos, metoda: u.nacin_placanja, napomena: u.napomena }));
                  if (debt.status === 'placen') {
                    events.push({ datum: debtUplate[0]?.datum || debt.datum_nastanka, tip: 'zatvoren' });
                  }
                  events.sort((a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime());

                  const fmtD = (iso: string) => {
                    try { return format(parseISO(iso), 'dd.MM.yyyy.', { locale: sr }); } catch { return iso; }
                  };

                  return (
                    <div className="px-5 pb-5 bg-gray-50/40 border-t border-gray-100">
                      {/* Progress bar */}
                      <div className="mt-4 mb-5">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-green-700 font-medium">Placeno {(debt.iznos - debt.preostalo).toFixed(2)} EUR</span>
                          <span className="text-gray-500">od {debt.iznos.toFixed(2)} EUR</span>
                          <span className="text-red-600 font-semibold">Preostalo {debt.preostalo.toFixed(2)} EUR</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 transition-all"
                            style={{ width: `${paidPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Termin meta (ako postoji) */}
                      {det?.appointment && (
                        <div className="flex flex-wrap items-center gap-4 mb-4 text-xs text-gray-600">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar size={12} className="text-gray-400" />
                            Termin {fmtD(det.appointment.pocetak)} u {format(parseISO(det.appointment.pocetak), 'HH:mm')}
                          </span>
                          {det.appointment.doctor_name && (
                            <span className="inline-flex items-center gap-1.5">
                              <Stethoscope size={12} className="text-gray-400" />
                              {det.appointment.doctor_name}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* LIJEVO — Usluge */}
                        <div className="bg-white rounded-lg border border-border">
                          <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                            <Receipt size={14} className="text-gray-500" />
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Za šta je dug</p>
                          </div>
                          <div className="p-3 space-y-1.5">
                            {det && det.services.length > 0 ? (
                              <>
                                {det.services.map((s) => (
                                  <div key={s.id} className="flex justify-between text-sm">
                                    <span className="text-gray-700 truncate pr-2">
                                      {s.naziv}{s.kolicina > 1 ? ` × ${s.kolicina}` : ''}
                                    </span>
                                    <span className="text-gray-900 font-medium tabular-nums shrink-0">{s.ukupno.toFixed(2)} €</span>
                                  </div>
                                ))}
                                <div className="flex justify-between text-sm font-bold border-t border-gray-100 pt-1.5 mt-1.5">
                                  <span className="text-gray-800">Ukupno</span>
                                  <span className="text-gray-900 tabular-nums">{debt.iznos.toFixed(2)} €</span>
                                </div>
                              </>
                            ) : (
                              <div className="text-sm text-gray-500">
                                {debt.opis ? (
                                  <div className="flex items-start gap-2">
                                    <FileText size={13} className="text-gray-400 shrink-0 mt-0.5" />
                                    <span className="whitespace-pre-wrap">{debt.opis}</span>
                                  </div>
                                ) : (
                                  <p className="text-gray-400 italic">Bez opisa</p>
                                )}
                              </div>
                            )}
                            {debt.napomena && (
                              <p className="text-xs text-gray-500 italic pt-2 border-t border-gray-100 mt-2">{debt.napomena}</p>
                            )}
                          </div>
                        </div>

                        {/* DESNO — Hronologija */}
                        <div className="bg-white rounded-lg border border-border">
                          <div className="px-3 py-2 border-b border-border">
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Hronologija</p>
                          </div>
                          <div className="p-3">
                            <ol className="relative border-l-2 border-gray-200 ml-2 space-y-3">
                              {events.map((ev, i) => {
                                const isPayment = ev.tip === 'inicijalna' || ev.tip === 'rata';
                                const dotColor = ev.tip === 'nastao' ? 'bg-red-500' : ev.tip === 'zatvoren' ? 'bg-green-600' : 'bg-emerald-500';
                                const label = ev.tip === 'nastao' ? 'Dug nastao'
                                  : ev.tip === 'inicijalna' ? 'Djelimična uplata (na terminu)'
                                  : ev.tip === 'rata' ? 'Uplata rate'
                                  : 'Dug zatvoren';
                                return (
                                  <li key={i} className="ml-4">
                                    <span className={`absolute -left-[7px] w-3 h-3 rounded-full ring-2 ring-white ${dotColor}`} />
                                    <div className="flex items-center justify-between flex-wrap gap-1">
                                      <span className="text-xs text-gray-500">{fmtD(ev.datum)}</span>
                                      {isPayment && ev.iznos && (
                                        <span className="text-sm font-bold text-green-700">+{ev.iznos.toFixed(2)} €</span>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-800">{label}</p>
                                    {(ev.metoda || ev.napomena) && (
                                      <p className="text-xs text-gray-500 mt-0.5">
                                        {ev.metoda && <span className="inline-block bg-gray-100 text-gray-600 rounded px-1.5 py-0.5 mr-1">{ev.metoda}</span>}
                                        {ev.napomena}
                                      </p>
                                    )}
                                  </li>
                                );
                              })}
                            </ol>
                          </div>
                        </div>
                      </div>

                      {/* Uplata form */}
                      {debt.status === 'aktivan' && (
                        <div className="mt-4">
                          {showPayForm === debt.id ? (
                            <div className="bg-white border-2 border-green-300 rounded-lg p-3">
                              <p className="text-xs font-semibold text-green-700 uppercase mb-2">Nova uplata rate</p>
                              <div className="flex flex-wrap gap-2">
                                <input
                                  type="number"
                                  value={payAmount}
                                  onChange={(e) => setPayAmount(e.target.value)}
                                  placeholder={`Ostatak ${debt.preostalo.toFixed(2)} EUR`}
                                  className="flex-1 min-w-[140px] px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                                />
                                <select
                                  value={payMethod}
                                  onChange={(e) => setPayMethod(e.target.value)}
                                  className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                                >
                                  <option value="kes">Kes</option>
                                  <option value="kartica">Kartica</option>
                                  <option value="transfer">Transfer</option>
                                </select>
                                <input
                                  type="text"
                                  value={payNote}
                                  onChange={(e) => setPayNote(e.target.value)}
                                  placeholder="Napomena..."
                                  className="flex-1 min-w-[120px] px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                                />
                              </div>
                              <div className="flex gap-2 mt-2">
                                <Button size="sm" onClick={() => handlePayment(debt.id)} disabled={!payAmount || saving}>
                                  <Check size={14} /> Potvrdi uplatu
                                </Button>
                                <button
                                  onClick={() => { setShowPayForm(null); setPayAmount(''); setPayNote(''); }}
                                  className="text-sm text-gray-500 hover:text-gray-700 px-3"
                                >
                                  Odustani
                                </button>
                              </div>
                            </div>
                          ) : (
                            <Button size="sm" variant="secondary" onClick={() => { setShowPayForm(debt.id); setPayAmount(debt.preostalo.toFixed(2)); }}>
                              <Banknote size={14} /> Unesi uplatu / ratu
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex justify-end mt-3 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => { if (confirm('Obrisati ovo dugovanje?')) handleDeleteDebt(debt.id); }}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={12} /> Obrisi
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
