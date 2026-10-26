import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { MessageSquare, CheckCheck, Check, X, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Poruka {
  id: string;
  kanal: string | null;
  channel_used: string | null;
  tip: string | null;
  status: string | null;
  sadrzaj: string | null;
  fallbacked: boolean | null;
  datum_slanja: string | null;
  created_at: string;
}

const TIP_LABELS: Record<string, string> = {
  potvrda: 'Potvrda termina',
  podsjetnik: 'Podsjetnik',
  otkazivanje: 'Otkazivanje',
  potvrdjivanje: 'Potvrda dolaska',
  anketa: 'Anketa',
  test: 'Test',
};

function StatusIkona({ status }: { status: string | null }) {
  if (status === 'delivered') return <span className="inline-flex items-center gap-1 text-success"><CheckCheck size={13} /> isporučeno</span>;
  if (status === 'sent') return <span className="inline-flex items-center gap-1 text-gray-500"><Check size={13} /> poslato</span>;
  if (status === 'failed') return <span className="inline-flex items-center gap-1 text-danger"><X size={13} /> nije isporučeno</span>;
  return <span className="inline-flex items-center gap-1 text-gray-400"><Clock size={13} /> na čekanju</span>;
}

// Sve SMS/Viber poruke poslate pacijentu (podsjetnici, potvrde, ankete).
export default function MessagesPanel({ patientId }: { patientId: string }) {
  const [list, setList] = useState<Poruka[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    supabase.from('notifications')
      .select('id, kanal, channel_used, tip, status, sadrzaj, fallbacked, datum_slanja, created_at')
      .eq('patient_id', patientId).order('created_at', { ascending: false }).limit(200)
      .then(({ data, error: e }) => {
        if (!alive) return;
        if (e) setError('Poruke nisu učitane: ' + e.message);
        setList((data || []) as Poruka[]);
      });
    return () => { alive = false; };
  }, [patientId]);

  if (error) return <div role="alert" className="px-4 py-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>;
  if (!list) return <div className="space-y-2" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />)}</div>;
  if (!list.length) {
    return (
      <div className="text-center py-10 border border-dashed border-border rounded-xl">
        <MessageSquare className="mx-auto text-gray-300 mb-2" size={32} />
        <p className="text-sm text-gray-500">Pacijentu još nije poslata nijedna poruka.</p>
      </div>
    );
  }

  return (
    <ul className="bg-white border border-border rounded-xl divide-y divide-border">
      {list.map((p) => {
        const kanal = (p.channel_used || p.kanal || '').toUpperCase();
        return (
          <li key={p.id} className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="font-semibold text-gray-800">{TIP_LABELS[p.tip || ''] || p.tip || 'Poruka'}</span>
              {kanal && <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{kanal}{p.fallbacked ? ' (rezervni SMS)' : ''}</span>}
              <StatusIkona status={p.status} />
              <span className="text-gray-400 ml-auto">{format(parseISO(p.datum_slanja || p.created_at), 'dd.MM.yyyy. HH:mm')}</span>
            </div>
            {p.sadrzaj && <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap break-words">{p.sadrzaj}</p>}
          </li>
        );
      })}
    </ul>
  );
}
