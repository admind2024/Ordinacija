import { useMemo } from 'react';
import { Phone, Mail, ChevronRight } from 'lucide-react';
import { useCalendar } from '../../contexts/CalendarContext';
import type { Doctor } from '../../types';

interface DoctorListProps {
  onSelect: (doctor: Doctor) => void;
}

// Grupisanje po titula/specijalizacija
const ROLE_ORDER = ['Dr', 'Med.sestra', 'Fizioterapeut', ''];
const ROLE_LABELS: Record<string, string> = {
  'Dr': 'Ljekari',
  'Med.sestra': 'Medicinske sestre',
  'Fizioterapeut': 'Fizioterapeuti',
  '': 'Ostalo osoblje',
};

export default function DoctorList({ onSelect }: DoctorListProps) {
  const { doctors } = useCalendar();

  const grouped = useMemo(() => {
    const groups = new Map<string, Doctor[]>();
    for (const d of doctors) {
      const key = d.titula || '';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(d);
    }
    // Sortiraj grupe po definisanom redu
    return ROLE_ORDER
      .filter((r) => groups.has(r))
      .map((r) => ({ role: r, label: ROLE_LABELS[r] || r || 'Ostalo', members: groups.get(r)! }));
  }, [doctors]);

  return (
    <div className="space-y-6">
      {grouped.map(({ role, label, members }) => (
        <div key={role}>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">{label}</h3>
            <span className="text-[11px] text-gray-300">({members.length})</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="bg-white border border-border rounded-xl divide-y divide-border overflow-hidden">
            {members.map((doctor) => (
              <button
                key={doctor.id}
                onClick={() => onSelect(doctor)}
                className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors group"
              >
                {/* Avatar */}
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ backgroundColor: doctor.boja }}
                >
                  {doctor.ime.charAt(0)}{doctor.prezime.charAt(0)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {doctor.titula ? `${doctor.titula} ` : ''}{doctor.ime} {doctor.prezime}
                  </p>
                  <p className="text-xs text-gray-500">{doctor.specijalizacija}</p>
                </div>

                {/* Kontakt */}
                <div className="hidden sm:flex items-center gap-4 text-xs text-gray-400 shrink-0">
                  {doctor.telefon && (
                    <span className="flex items-center gap-1">
                      <Phone size={11} /> {doctor.telefon}
                    </span>
                  )}
                  {doctor.email && (
                    <span className="flex items-center gap-1">
                      <Mail size={11} /> {doctor.email}
                    </span>
                  )}
                </div>

                {/* Status + arrow */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    doctor.aktivan ? 'bg-primary-50 text-primary-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {doctor.aktivan ? 'Aktivan' : 'Neaktivan'}
                  </span>
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
