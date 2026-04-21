import { Check, CheckCheck, X, CircleSlash, Clock, type LucideIcon } from 'lucide-react';
import { APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_LABELS, type AppointmentStatus } from '../../types';

interface LegendItem {
  status: AppointmentStatus;
  icon: LucideIcon;
}

// Redosled se poklapa sa zivotnim ciklusom termina.
// 'stigao'/'u_toku' su prolazne faze koje traju minutama — ne prikazujemo ih u legendi.
const ITEMS: LegendItem[] = [
  { status: 'zakazan', icon: Clock },
  { status: 'potvrdjen', icon: CheckCheck },
  { status: 'zavrsen', icon: Check },
  { status: 'nije_dosao', icon: CircleSlash },
  { status: 'otkazan', icon: X },
];

export default function StatusLegend() {
  return (
    <div
      className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2
                 bg-surface border border-border rounded-lg text-xs"
      aria-label="Legenda statusa termina"
    >
      <span className="text-gray-500 font-medium mr-1">Legenda:</span>
      {ITEMS.map(({ status, icon: Icon }) => (
        <span key={status} className="flex items-center gap-1.5 whitespace-nowrap">
          <span
            className="inline-flex items-center justify-center w-4 h-4 rounded-full text-white"
            style={{ backgroundColor: APPOINTMENT_STATUS_COLORS[status] }}
          >
            <Icon size={10} strokeWidth={3} />
          </span>
          <span className="text-gray-700">{APPOINTMENT_STATUS_LABELS[status]}</span>
        </span>
      ))}
    </div>
  );
}
