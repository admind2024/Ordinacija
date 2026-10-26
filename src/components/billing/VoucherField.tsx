import { useState } from 'react';
import { Ticket, Check } from 'lucide-react';
import { eur, provjeriVaucer } from '../../lib/payments';
import type { Vaucer } from '../../types';

interface Props {
  value: Vaucer | null;
  onChange: (v: Vaucer | null) => void;
}

// Unos i provjera broja vaucera pri naplati.
export default function VoucherField({ value, onChange }: Props) {
  const [broj, setBroj] = useState(value?.broj || '');
  const [checking, setChecking] = useState(false);
  const [poruka, setPoruka] = useState('');

  async function provjeri() {
    setChecking(true);
    const r = await provjeriVaucer(broj);
    setChecking(false);
    if (r.ok) { setPoruka(''); onChange(r.vaucer); }
    else { setPoruka(r.poruka); onChange(null); }
  }

  return (
    <div className="rounded-xl border-2 border-accent-300 bg-accent-50 p-3">
      <label htmlFor="vaucer-broj" className="block text-xs font-semibold text-accent-800 mb-1.5">Broj vaučera</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Ticket size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent-600" />
          <input
            id="vaucer-broj"
            value={broj}
            onChange={(e) => { setBroj(e.target.value.toUpperCase()); if (value) onChange(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); provjeri(); } }}
            placeholder="V-2026-00001"
            autoComplete="off"
            className="w-full pl-8 pr-3 py-2 border border-accent-200 rounded-lg text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>
        <button
          type="button"
          onClick={provjeri}
          disabled={checking || !broj.trim()}
          className="px-3 py-2 rounded-lg text-sm font-medium bg-accent-600 text-white hover:bg-accent-700 disabled:opacity-50"
        >
          {checking ? 'Provjera…' : 'Provjeri'}
        </button>
      </div>
      {value && (
        <p className="mt-2 text-sm text-accent-900 flex items-center gap-1.5">
          <Check size={14} className="text-success" />
          Važi · na vaučeru je <strong className="tabular-nums">{eur(value.preostalo)}</strong>
          {value.primalac && <span className="text-accent-700">· {value.primalac}</span>}
        </p>
      )}
      {poruka && <p role="alert" className="mt-2 text-sm text-danger">{poruka}</p>}
    </div>
  );
}
