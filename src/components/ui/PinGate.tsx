import { useState, useRef, useEffect } from 'react';
import { Lock } from 'lucide-react';

const SUPER_ADMIN_PIN = '1519';
const PIN_LENGTH = 4;

interface PinGateProps {
  children: React.ReactNode;
  title?: string;
}

export default function PinGate({ children, title = 'Podesavanja' }: PinGateProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [digits, setDigits] = useState<string[]>(Array(PIN_LENGTH).fill(''));
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!unlocked) inputRefs.current[0]?.focus();
  }, [unlocked]);

  function handleDigitChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);
    setError('');

    if (value && index < PIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (value && index === PIN_LENGTH - 1) {
      const pin = newDigits.join('');
      if (pin === SUPER_ADMIN_PIN) {
        setUnlocked(true);
        setError('');
      } else {
        setError('Pogrešna šifra');
        setDigits(Array(PIN_LENGTH).fill(''));
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
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
      if (pasted === SUPER_ADMIN_PIN) {
        setUnlocked(true);
      } else {
        setError('Pogrešna šifra');
        setDigits(Array(PIN_LENGTH).fill(''));
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    } else {
      inputRefs.current[Math.min(pasted.length, PIN_LENGTH - 1)]?.focus();
    }
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-sm text-center">
        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Lock size={28} className="text-gray-500" />
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-1">{title}</h2>
        <p className="text-sm text-gray-400 mb-8">Unesite admin šifru za pristup</p>

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

        {error && (
          <p className="text-sm text-red-600 mb-4 animate-pulse">{error}</p>
        )}

        <p className="text-xs text-gray-300 mt-6">
          Šifra se automatski provjerava nakon 4 cifre
        </p>
      </div>
    </div>
  );
}
