import { format, parseISO } from 'date-fns';
import { CreditCard, Banknote, Shield, Heart, Gift } from 'lucide-react';
import { useBilling } from '../../contexts/BillingContext';
import { demoPatients } from '../../data/demo';
import Card from '../ui/Card';
import type { PaymentMethod } from '../../types';

const methodIcons: Record<PaymentMethod, typeof CreditCard> = {
  gotovina: Banknote,
  gotovina_fiskalni: Banknote,
  kartica_fiskalni: CreditCard,
  administrativna_zabrana: Shield,
  osiguranje: Heart,
  bon: Gift,
  online: CreditCard,
};

const methodLabels: Record<PaymentMethod, string> = {
  gotovina: 'Gotovina',
  gotovina_fiskalni: 'Gotovina (fisk.)',
  kartica_fiskalni: 'Kartica (fisk.)',
  administrativna_zabrana: 'Adm. zabrana',
  osiguranje: 'Osiguranje',
  bon: 'Bon/Voucher',
  online: 'Online',
};

export default function TransactionList() {
  const { getRecentPayments, getTotalRevenue, getRevenueByMethod } = useBilling();
  const recentPayments = getRecentPayments(30);
  const totalRevenue = getTotalRevenue();
  const byMethod = getRevenueByMethod();

  return (
    <div className="space-y-6">
      {/* Sumari */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-gray-500">Ukupni prihod</p>
          <p className="text-2xl font-bold text-gray-900">{totalRevenue.toFixed(2)} EUR</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Broj transakcija</p>
          <p className="text-2xl font-bold text-gray-900">{recentPayments.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Prosjecna naplata</p>
          <p className="text-2xl font-bold text-gray-900">
            {recentPayments.length > 0 ? (totalRevenue / recentPayments.length).toFixed(2) : '0'} EUR
          </p>
        </Card>
      </div>

      {/* Prihod po metodi */}
      <Card>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Prihod po nacinu placanja</h3>
        <div className="space-y-2">
          {Object.entries(byMethod).map(([method, amount]) => {
            const Icon = methodIcons[method as PaymentMethod] || CreditCard;
            const pct = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0;
            return (
              <div key={method} className="flex items-center gap-3">
                <Icon size={16} className="text-gray-400 shrink-0" />
                <span className="text-sm text-gray-700 w-32">{methodLabels[method as PaymentMethod] || method}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-sm font-medium text-gray-900 w-24 text-right">{amount.toFixed(2)} EUR</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Lista transakcija */}
      <Card padding={false}>
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Nedavne transakcije</h3>
        </div>
        <div className="divide-y divide-border">
          {recentPayments.map((payment) => {
            const patient = payment.appointment
              ? demoPatients.find((p) => p.id === payment.appointment!.patient_id)
              : null;
            const Icon = methodIcons[payment.metoda] || CreditCard;

            return (
              <div key={payment.id} className="px-6 py-3 flex items-center gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {patient ? `${patient.ime} ${patient.prezime}` : 'Nepoznat'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{methodLabels[payment.metoda]}</span>
                    {payment.appointment?.services?.[0] && (
                      <>
                        <span>·</span>
                        <span>{payment.appointment.services[0].naziv}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-green-600">+{payment.iznos.toFixed(2)} EUR</p>
                  <p className="text-xs text-gray-400">{format(parseISO(payment.datum), 'dd.MM.yyyy. HH:mm')}</p>
                </div>
                {payment.fiskalni_status && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    payment.fiskalni_status === 'success' ? 'bg-green-100 text-green-700' :
                    payment.fiskalni_status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {payment.fiskalni_status === 'success' ? 'Fiskalizovan' :
                     payment.fiskalni_status === 'pending' ? 'Pending' : 'Greska'}
                  </span>
                )}
              </div>
            );
          })}
          {recentPayments.length === 0 && (
            <p className="px-6 py-8 text-sm text-gray-400 text-center">Nema transakcija</p>
          )}
        </div>
      </Card>
    </div>
  );
}
