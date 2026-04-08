import { useState } from 'react';
import { Stethoscope, LogOut } from 'lucide-react';
import Button from './Button';
import { useCalendar } from '../../contexts/CalendarContext';
import type { Doctor } from '../../types';

interface DoctorLoginProps {
  children: (doctor: Doctor) => React.ReactNode;
}

export default function DoctorLogin({ children }: DoctorLoginProps) {
  const { doctors } = useCalendar();
  const [loggedDoctor, setLoggedDoctor] = useState<Doctor | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pin.trim()) { setError('Unesite PIN'); return; }
    const doctor = doctors.find((d) => d.pin === pin.trim());
    if (doctor) {
      setLoggedDoctor(doctor);
      setError('');
    } else {
      setError('Pogresan PIN');
      setPin('');
    }
  }

  if (loggedDoctor) {
    return (
      <div>
        {/* Doctor banner */}
        <div className="mb-4 bg-primary-50 border border-primary-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: loggedDoctor.boja || '#6366f1' }}>
              {loggedDoctor.ime.charAt(0)}{loggedDoctor.prezime.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {loggedDoctor.titula} {loggedDoctor.ime} {loggedDoctor.prezime}
              </p>
              <p className="text-xs text-gray-500">{loggedDoctor.specijalizacija}</p>
            </div>
          </div>
          <button
            onClick={() => { setLoggedDoctor(null); setPin(''); }}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
          >
            <LogOut size={14} />
            Odjavi se
          </button>
        </div>
        {children(loggedDoctor)}
      </div>
    );
  }

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
