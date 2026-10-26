import { useState } from 'react';
import TransactionList from '../components/billing/TransactionList';
import ServiceCatalog from '../components/billing/ServiceCatalog';
import ShiftReport from '../components/billing/ShiftReport';

type BillingTab = 'transactions' | 'presjek' | 'catalog';

export default function Billing() {
  const [tab, setTab] = useState<BillingTab>('transactions');

  return (
    <div>
      {/* Tabovi */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit mb-6">
        <button
          onClick={() => setTab('transactions')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors
            ${tab === 'transactions' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Transakcije
        </button>
        <button
          onClick={() => setTab('presjek')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors
            ${tab === 'presjek' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Presjek smjene
        </button>
        <button
          onClick={() => setTab('catalog')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors
            ${tab === 'catalog' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Cjenovnik usluga
        </button>
      </div>

      {tab === 'transactions' && <TransactionList />}
      {tab === 'presjek' && <ShiftReport />}
      {tab === 'catalog' && <ServiceCatalog />}

    </div>
  );
}
