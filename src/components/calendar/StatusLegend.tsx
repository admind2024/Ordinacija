import { APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_LABELS, type AppointmentStatus } from '../../types';

// Statusi koje recepcija rutinski vidi na kalendaru.
// 'stigao' i 'u_toku' namjerno nisu ukljuceni — to su prolazne faze
// koje traju minutama, a legend treba da ostane citljiv na mobilnom.
const PRIMARY: AppointmentStatus[] = ['zakazan', 'potvrdjen', 'zavrsen', 'nije_dosao', 'otkazan'];

export default function StatusLegend() {
  return (
    <div
      className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2
                 bg-surface border border-border rounded-lg text-xs"
      aria-label="Legenda statusa termina"
    >
      <span className="text-gray-500 font-medium mr-1">Legenda:</span>
      {PRIMARY.map((s) => (
        <span key={s} className="flex items-center gap-1.5 whitespace-nowrap">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: APPOINTMENT_STATUS_COLORS[s] }}
          />
          <span className="text-gray-700">{APPOINTMENT_STATUS_LABELS[s]}</span>
        </span>
      ))}
    </div>
  );
}
