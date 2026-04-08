import { useState } from 'react';
import { Lock } from 'lucide-react';
import Button from './Button';

const SUPER_ADMIN_PIN = '1519';

interface PinGateProps {
  children: React.ReactNode;
  title?: string;
}

export default function PinGate({ children, title = 'Super Admin pristup' }: PinGateProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin === SUPER_ADMIN_PIN) {
      setUnlocked(true);
      setError('');
    } else {
      setError('Pogresna sifra');
      setPin('');
    }
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-surface border border-border rounded-xl shadow-lg p-8 w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock size={32} className="text-red-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">{title}</h2>
        <p className="text-sm text-gray-500 mb-6">Unesite super admin sifru za pristup</p>
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <input
            type="password"
            name="pin-gate-code"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(''); }}
            placeholder="Sifra"
            autoFocus
            autoComplete="new-password"
            className="w-full px-4 py-3 border border-border rounded-lg text-center text-lg font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full">Otkljucaj</Button>
        </form>
      </div>
    </div>
  );
}
