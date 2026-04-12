import { useState, useRef, useEffect } from 'react';
import { Stethoscope, LogOut } from 'lucide-react';
import { useCalendar } from '../../contexts/CalendarContext';
import type { Doctor } from '../../types';

interface DoctorLoginProps {
  children: (doctor: Doctor) => React.ReactNode;
}

const PIN_LENGTH = 4;

export default function DoctorLogin({ children }: DoctorLoginProps) {
  const { doctors } = useCalendar();
  const [loggedDoctor, setLoggedDoctor] = useState<Doctor | null>(null);
  const [digits, setDigits] = useState<string[]>(Array(PIN_LENGTH).fill(''));
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function handleDigitChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);
    setError('');

    if (value && index < PIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit kad se popune sva 4
    if (value && index === PIN_LENGTH - 1) {
      const pin = newDigits.join('');
      if (pin.length === PIN_LENGTH) {
        const doctor = doctors.find((d) => d.pin === pin);
        if (doctor) {
          setLoggedDoctor(doctor);
          setError('');
        } else {
          setError('Pogrešan PIN');
          setDigits(Array(PIN_LENGTH).fill(''));
          setTimeout(() => inputRefs.current[0]?.focus(), 100);
        }
      }
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newDigits = [...digits];
      newDigits[index - 1] = '';
      setDigits(newDigits);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, PIN_LENGTH);
    if (!pasted) return;
    const newDigits = Array(PIN_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i++) newDigits[i] = pasted[i];
    setDigits(newDigits);

    if (pasted.length === PIN_LENGTH) {
      const doctor = doctors.find((d) => d.pin === pasted);
      if (doctor) {
        setLoggedDoctor(doctor);
      } else {
        setError('Pogrešan PIN');
        setDigits(Array(PIN_LENGTH).fill(''));
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    } else {
      inputRefs.current[Math.min(pasted.length, PIN_LENGTH - 1)]?.focus();
    }
  }

  if (loggedDoctor) {
    return (
      <div>
        <div className="mb-4 bg-primary-50 border border-primary-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: loggedDoctor.boja || '#2BA5A5' }}>
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
            onClick={() => { setLoggedDoctor(null); setDigits(Array(PIN_LENGTH).fill('')); }}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
          >
            <LogOut size={14} /> Odjavi se
          </button>
        </div>
        {children(loggedDoctor)}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-sm text-center">
        {/* Icon */}
        <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Stethoscope size={28} className="text-primary-600" />
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-1">Prijava ljekara</h2>
        <p className="text-sm text-gray-400 mb-8">Unesite PIN za pristup</p>

        {/* 4 digit boxes */}
        <div className="flex justify-center gap-3 mb-4" onPaste={handlePaste}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              autoComplete="off"
              className={`w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all focus:outline-none
                ${error
                  ? 'border-red-300 bg-red-50 text-red-700 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                  : digit
                    ? 'border-primary-400 bg-primary-50 text-primary-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-200'
                    : 'border-gray-200 bg-white text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200'
                }`}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 mb-4 animate-pulse">{error}</p>
        )}

        {/* Hint */}
        <p className="text-xs text-gray-300 mt-6">
          PIN se automatski šalje nakon unosa 4 cifre
        </p>
      </div>
    </div>
  );
}
