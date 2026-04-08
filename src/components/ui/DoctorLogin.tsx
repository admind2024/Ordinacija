import { useState } from 'react';
import { Stethoscope } from 'lucide-react';
import Button from './Button';
import { useCalendar } from '../../contexts/CalendarContext';
import type { Doctor } from '../../types';

interface DoctorLoginProps {
  children: React.ReactNode;
  onDoctorLogin?: (doctor: Doctor) => void;
}

export default function DoctorLogin({ children, onDoctorLogin }: DoctorLoginProps) {
  const { doctors } = useCalendar();
  const [loggedIn, setLoggedIn] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pin.trim()) { setError('Unesite PIN'); return; }
    const doctor = doctors.find((d) => d.pin === pin.trim());
    if (doctor) {
      setLoggedIn(true);
      setError('');
      onDoctorLogin?.(doctor);
    } else {
      setError('Pogresan PIN');
      setPin('');
    }
  }

  if (loggedIn) return <>{children}</>;

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-surface border border-border rounded-xl shadow-lg p-8 w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Stethoscope size={32} className="text-primary-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Prijava ljekara</h2>
        <p className="text-sm text-gray-500 mb-6">Unesite vas PIN za pristup pregledu</p>
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <input
            type="password"
            name="doctor-pin"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(''); }}
            placeholder="PIN"
            autoFocus
            autoComplete="new-password"
            className="w-full px-4 py-3 border border-border rounded-lg text-center text-2xl font-bold tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full">Prijavi se</Button>
        </form>
        <div className="mt-6 text-xs text-gray-400">
          {doctors.map((d) => (
            <span key={d.id} className="inline-block mr-3">{d.titula} {d.ime} {d.prezime.charAt(0)}.</span>
          ))}
        </div>
      </div>
    </div>
  );
}
