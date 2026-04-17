import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { FileText, CreditCard } from 'lucide-react';
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
      .select('id, appointment_id, iznos, metoda, datum, appointment:appointments(patient:patients(ime, prezime))')
      .order('datum', { ascending: false });
    if (dateFrom) pQuery = pQuery.gte('datum', dateFrom);
    const { data: paysData } = await pQuery;
    const paysList: PaymentRow[] = (paysData || []).map((p: any) => ({
      id: p.id,
      appointment_id: p.appointment_id,
      iznos: Number(p.iznos) || 0,
      metoda: p.metoda,
      datum: p.datum,
      patient_ime: p.appointment?.patient
        ? `${p.appointment.patient.ime} ${p.appointment.patient.prezime}`
        : undefined,
    }));
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

  // Count by payment type estimate (from procedure_log)
  const examCount = exams.length;
  const paymentCount = paymentsList.length;

  if (loading) return <div className="text-center py-16 text-gray-400">Ucitavanje...</div>;

  return (
    <div className="space-y-6">
      {/* Sumari */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <p className="text-sm text-gray-500">Fakturisano</p>
          <p className="text-2xl font-bold text-gray-900">{totalFakturisano.toFixed(2)} EUR</p>
          <p className="text-xs text-gray-400 mt-1">{examCount} pregleda</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Naplaceno</p>
          <p className="text-2xl font-bold text-green-600">{totalNaplaceno.toFixed(2)} EUR</p>
          <p className="text-xs text-gray-400 mt-1">{paymentCount} uplata</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Ukupan dug</p>
          <p className="text-2xl font-bold text-red-600">{debtSummary.totalDug.toFixed(2)} EUR</p>
          <p className="text-xs text-gray-400 mt-1">{debtSummary.aktivnihDuznika} duznika</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Prosjecna naplata</p>
          <p className="text-2xl font-bold text-gray-900">
            {examCount > 0 ? (totalFakturisano / examCount).toFixed(2) : '0.00'} EUR
          </p>
        </Card>
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

      {/* Lista stvarnih uplata iz payments tabele */}
      <Card padding={false}>
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Uplate</h3>
          <span className="text-xs text-gray-400">{paymentsList.length} uplata · {totalNaplaceno.toFixed(2)} EUR</span>
        </div>
        <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
          {paymentsList.length === 0 ? (
            <p className="px-6 py-8 text-sm text-gray-400 text-center">Nema uplata u ovom periodu</p>
          ) : (
            paymentsList.map((p) => (
              <div key={p.id} className="px-6 py-3 flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                  <CreditCard size={18} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{p.patient_ime || 'Nepoznat pacijent'}</p>
                  <p className="text-xs text-gray-500">{METODA_LABELS[p.metoda] || p.metoda}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-blue-600">{p.iznos.toFixed(2)} EUR</p>
                  <p className="text-xs text-gray-400">{format(new Date(p.datum), 'dd.MM.yyyy HH:mm')}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
