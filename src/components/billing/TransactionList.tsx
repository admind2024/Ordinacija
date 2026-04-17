import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { FileText, CreditCard, Receipt, ReceiptText, Wallet, TrendingUp } from 'lucide-react';
import Card from '../ui/Card';
import { supabase } from '../../lib/supabase';

interface ExamWithServices {
  id: string;
  patient_id: string;
  doctor_id: string;
  datum: string;
  appointment_id?: string;
  status: string;
  patient?: { ime: string; prezime: string };
  doctor?: { ime: string; prezime: string; titula?: string };
  services: { naziv: string; kolicina: number; ukupno: number }[];
  total: number;
}

interface PaymentRow {
  id: string;
  appointment_id: string;
  iznos: number;
  metoda: string;
  datum: string;
  fiskalni_status: string | null;
  fiskalizovano: boolean;
  patient_ime?: string;
}

interface DebtSummary {
  totalDug: number;
  aktivnihDuznika: number;
}

const METODA_LABELS: Record<string, string> = {
  gotovina: 'Gotovina',
  kartica: 'Kartica',
  racun: 'Racun',
  transfer: 'Transfer',
};

export default function TransactionList() {
  const [exams, setExams] = useState<ExamWithServices[]>([]);
  const [paymentsList, setPaymentsList] = useState<PaymentRow[]>([]);
  const [debtSummary, setDebtSummary] = useState<DebtSummary>({ totalDug: 0, aktivnihDuznika: 0 });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'danas' | 'sedmica' | 'mjesec' | 'sve'>('mjesec');
  const [paymentFilter, setPaymentFilter] = useState<'sve' | 'fiskal' | 'nefiskal'>('sve');

  useEffect(() => {
    loadData();
  }, [period]);

  async function loadData() {
    setLoading(true);

    // Date filter
    const now = new Date();
    let dateFrom: string | null = null;
    if (period === 'danas') dateFrom = format(now, 'yyyy-MM-dd');
    else if (period === 'sedmica') {
      const d = new Date(now); d.setDate(d.getDate() - 7);
      dateFrom = format(d, 'yyyy-MM-dd');
    } else if (period === 'mjesec') {
      const d = new Date(now); d.setMonth(d.getMonth() - 1);
      dateFrom = format(d, 'yyyy-MM-dd');
    }

    // Load completed exams with appointment services
    let query = supabase.from('examinations')
      .select('id, patient_id, doctor_id, datum, appointment_id, status, patient:patients(ime, prezime), doctor:doctors(ime, prezime, titula)')
      .eq('status', 'zavrsen')
      .order('datum', { ascending: false });

    if (dateFrom) query = query.gte('datum', dateFrom);

    const { data: examData } = await query;

    // For each exam, load appointment services
    const enriched: ExamWithServices[] = [];
    for (const exam of (examData || [])) {
      let services: { naziv: string; kolicina: number; ukupno: number }[] = [];
      let total = 0;

      if (exam.appointment_id) {
        const { data: svcData } = await supabase
          .from('appointment_services')
          .select('naziv, kolicina, ukupno')
          .eq('appointment_id', exam.appointment_id);
        services = (svcData || []).map((s: any) => ({
          naziv: s.naziv,
          kolicina: Number(s.kolicina) || 1,
          ukupno: Number(s.ukupno) || 0,
        }));
        total = services.reduce((sum, s) => sum + s.ukupno, 0);
      }

      enriched.push({
        ...exam,
        patient: exam.patient as any,
        doctor: exam.doctor as any,
        services,
        total,
      });
    }
    setExams(enriched);

    // Load actual payments in period (iz payments tabele)
    let pQuery = supabase
      .from('payments')
      .select('id, appointment_id, iznos, metoda, datum, fiskalni_status, appointment:appointments(patient:patients(ime, prezime))')
      .order('datum', { ascending: false });
    if (dateFrom) pQuery = pQuery.gte('datum', dateFrom);
    const { data: paysData } = await pQuery;
    const paysList: PaymentRow[] = (paysData || []).map((p: any) => {
      const metoda = p.metoda || '';
      const isFiskal = metoda.endsWith('_fiskalni') || p.fiskalni_status === 'done';
      return {
        id: p.id,
        appointment_id: p.appointment_id,
        iznos: Number(p.iznos) || 0,
        metoda,
        datum: p.datum,
        fiskalni_status: p.fiskalni_status,
        fiskalizovano: isFiskal,
        patient_ime: p.appointment?.patient
          ? `${p.appointment.patient.ime} ${p.appointment.patient.prezime}`
          : undefined,
      };
    });
    setPaymentsList(paysList);

    // Load debt summary
    const { data: debts } = await supabase.from('dugovanja')
      .select('preostalo, patient_id')
      .eq('status', 'aktivan');
    const totalDug = (debts || []).reduce((sum, d) => sum + Number(d.preostalo), 0);
    const aktivnihDuznika = new Set((debts || []).map(d => d.patient_id)).size;
    setDebtSummary({ totalDug, aktivnihDuznika });

    setLoading(false);
  }

  const totalFakturisano = exams.reduce((sum, e) => sum + e.total, 0);
  // Stvarno naplaceno iz payments tabele (ne procjena)
  const totalNaplaceno = paymentsList.reduce((sum, p) => sum + p.iznos, 0);

  // Podjela: fiskalizovano vs bez fiskala
  const fiskalPayments = paymentsList.filter((p) => p.fiskalizovano);
  const neFiskalPayments = paymentsList.filter((p) => !p.fiskalizovano);
  const totalFiskal = fiskalPayments.reduce((sum, p) => sum + p.iznos, 0);
  const totalNeFiskal = neFiskalPayments.reduce((sum, p) => sum + p.iznos, 0);

  const examCount = exams.length;
  const paymentCount = paymentsList.length;

  if (loading) return <div className="text-center py-16 text-gray-400">Ucitavanje...</div>;

  const filteredPayments = paymentFilter === 'fiskal'
    ? fiskalPayments
    : paymentFilter === 'nefiskal'
      ? neFiskalPayments
      : paymentsList;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Sumari — 2 po redu na mobilnom, 3/6 na desktopu */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 xs:gap-3">
        {/* Fakturisano */}
        <div className="bg-white border border-border rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={14} className="text-gray-400" />
            <p className="text-[10px] xs:text-xs text-gray-500 uppercase tracking-wider">Fakturisano</p>
          </div>
          <p className="fluid-h2 font-bold text-gray-900 leading-tight">{totalFakturisano.toFixed(0)} €</p>
          <p className="text-[10px] xs:text-xs text-gray-400 mt-0.5">{examCount} pregleda</p>
        </div>

        {/* Naplaceno ukupno */}
        <div className="bg-white border border-border rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard size={14} className="text-green-500" />
            <p className="text-[10px] xs:text-xs text-gray-500 uppercase tracking-wider">Naplaceno</p>
          </div>
          <p className="fluid-h2 font-bold text-green-600 leading-tight">{totalNaplaceno.toFixed(0)} €</p>
          <p className="text-[10px] xs:text-xs text-gray-400 mt-0.5">{paymentCount} uplata</p>
        </div>

        {/* Fiskalizovano */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-2 mb-1">
            <Receipt size={14} className="text-emerald-600" />
            <p className="text-[10px] xs:text-xs text-emerald-700 uppercase tracking-wider font-medium">Fiskalizovano</p>
          </div>
          <p className="fluid-h2 font-bold text-emerald-700 leading-tight">{totalFiskal.toFixed(0)} €</p>
          <p className="text-[10px] xs:text-xs text-emerald-600/70 mt-0.5">{fiskalPayments.length} uplata</p>
        </div>

        {/* Bez fiskala */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-2 mb-1">
            <ReceiptText size={14} className="text-amber-600" />
            <p className="text-[10px] xs:text-xs text-amber-700 uppercase tracking-wider font-medium">Bez fiskala</p>
          </div>
          <p className="fluid-h2 font-bold text-amber-700 leading-tight">{totalNeFiskal.toFixed(0)} €</p>
          <p className="text-[10px] xs:text-xs text-amber-600/70 mt-0.5">{neFiskalPayments.length} uplata</p>
        </div>

        {/* Ukupan dug */}
        <div className="bg-white border border-border rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wallet size={14} className="text-red-500" />
            <p className="text-[10px] xs:text-xs text-gray-500 uppercase tracking-wider">Dug</p>
          </div>
          <p className="fluid-h2 font-bold text-red-600 leading-tight">{debtSummary.totalDug.toFixed(0)} €</p>
          <p className="text-[10px] xs:text-xs text-gray-400 mt-0.5">{debtSummary.aktivnihDuznika} duznika</p>
        </div>

        {/* Prosjecna naplata */}
        <div className="bg-white border border-border rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-primary-500" />
            <p className="text-[10px] xs:text-xs text-gray-500 uppercase tracking-wider">Prosjek</p>
          </div>
          <p className="fluid-h2 font-bold text-gray-900 leading-tight">
            {examCount > 0 ? (totalFakturisano / examCount).toFixed(0) : '0'} €
          </p>
          <p className="text-[10px] xs:text-xs text-gray-400 mt-0.5">po pregledu</p>
        </div>
      </div>

      {/* Period filter */}
      <div className="flex gap-1.5">
        {([['danas', 'Danas'], ['sedmica', 'Sedmica'], ['mjesec', 'Mjesec'], ['sve', 'Sve']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors
              ${period === key
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Lista zavrsenih pregleda sa cijenama */}
      <Card padding={false}>
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Zavrseni pregledi</h3>
          <span className="text-xs text-gray-400">{exams.length} pregleda</span>
        </div>
        <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
          {exams.length === 0 ? (
            <p className="px-6 py-8 text-sm text-gray-400 text-center">Nema zavrsenih pregleda u ovom periodu</p>
          ) : (
            exams.map((exam) => (
              <div key={exam.id} className="px-6 py-3 flex items-center gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {exam.patient ? `${exam.patient.ime} ${exam.patient.prezime}` : 'Nepoznat'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {exam.doctor ? `${exam.doctor.titula || 'Dr'} ${exam.doctor.ime} ${exam.doctor.prezime}` : ''}
                    {exam.services.length > 0 && ` — ${exam.services.map(s => s.naziv).join(', ')}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {exam.total > 0 ? (
                    <p className="text-sm font-semibold text-green-600">{exam.total.toFixed(2)} EUR</p>
                  ) : (
                    <p className="text-sm text-gray-400">0 EUR</p>
                  )}
                  <p className="text-xs text-gray-400">{exam.datum}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Lista stvarnih uplata iz payments tabele sa filterom fiskal/bez */}
      <Card padding={false}>
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-border">
          <div className="flex items-center justify-between mb-2 md:mb-3 flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Uplate</h3>
            <span className="text-xs text-gray-400">
              {filteredPayments.length} uplata · {filteredPayments.reduce((s, p) => s + p.iznos, 0).toFixed(2)} €
            </span>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit">
            {([
              ['sve', 'Sve', paymentsList.length],
              ['fiskal', 'Fiskalne', fiskalPayments.length],
              ['nefiskal', 'Bez fiskala', neFiskalPayments.length],
            ] as const).map(([key, label, count]) => (
              <button
                key={key}
                onClick={() => setPaymentFilter(key)}
                className={`px-2.5 md:px-3 py-1 md:py-1.5 text-[11px] md:text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  paymentFilter === key
                    ? key === 'fiskal'
                      ? 'bg-emerald-100 text-emerald-700'
                      : key === 'nefiskal'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label} <span className="opacity-60">({count})</span>
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
          {filteredPayments.length === 0 ? (
            <p className="px-4 md:px-6 py-8 text-sm text-gray-400 text-center">Nema uplata</p>
          ) : (
            filteredPayments.map((p) => (
              <div key={p.id} className="px-3 md:px-6 py-3 flex items-center gap-3">
                <div className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 ${
                  p.fiskalizovano ? 'bg-emerald-50' : 'bg-amber-50'
                }`}>
                  {p.fiskalizovano ? (
                    <Receipt size={16} className="text-emerald-600" />
                  ) : (
                    <CreditCard size={16} className="text-amber-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.patient_ime || 'Nepoznat pacijent'}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] md:text-xs text-gray-500">{METODA_LABELS[p.metoda] || p.metoda.replace('_fiskalni', '')}</span>
                    <span className={`text-[9px] md:text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider ${
                      p.fiskalizovano ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {p.fiskalizovano ? 'fiskal' : 'bez fiskala'}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${p.fiskalizovano ? 'text-emerald-700' : 'text-amber-700'}`}>{p.iznos.toFixed(2)} €</p>
                  <p className="text-[10px] md:text-xs text-gray-400">{format(new Date(p.datum), 'dd.MM HH:mm')}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
