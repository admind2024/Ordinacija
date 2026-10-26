import { AlertTriangle } from 'lucide-react';
import { RIZICI, type ZdravstveniPodaci } from '../../lib/karton';

// Upadljivo upozorenje na vrhu kartona i pregleda: alergije i aktivni faktori rizika.
export default function HealthAlert({ data }: { data: ZdravstveniPodaci | null }) {
  if (!data) return null;
  const rizici = data.rizici.filter((r) => r.aktivan);
  if (data.alergije.length === 0 && rizici.length === 0) return null;
  const teska = data.alergije.some((a) => a.tezina === 'teska');

  return (
    <div role="alert" className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${teska ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-200'}`}>
      <AlertTriangle size={18} className={`shrink-0 mt-0.5 ${teska ? 'text-red-600' : 'text-amber-600'}`} />
      <div className="text-sm min-w-0">
        {data.alergije.length > 0 && (
          <p className={teska ? 'text-red-800' : 'text-amber-900'}>
            <strong>Alergije:</strong>{' '}
            {data.alergije.map((a, i) => (
              <span key={a.id}>
                {i > 0 && ', '}
                <span className={a.tezina === 'teska' ? 'font-semibold underline' : ''}>{a.naziv}</span>
              </span>
            ))}
          </p>
        )}
        {rizici.length > 0 && (
          <p className="text-amber-900 mt-0.5">
            <strong>Rizici:</strong> {rizici.map((r) => RIZICI[r.tip] || r.tip).join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}
