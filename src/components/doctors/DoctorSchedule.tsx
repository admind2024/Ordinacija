import { Clock } from 'lucide-react';
import Card from '../ui/Card';
import type { Doctor } from '../../types';

interface DoctorScheduleProps {
  doctor: Doctor;
}

const dayNames = ['Ponedeljak', 'Utorak', 'Srijeda', 'Cetvrtak', 'Petak', 'Subota', 'Nedjelja'];
const shortDays = ['Pon', 'Uto', 'Sri', 'Cet', 'Pet', 'Sub', 'Ned'];

// Demo raspored
const demoScheduleData: Record<number, { pocetak: string; kraj: string; tip: string }> = {
  0: { pocetak: '08:00', kraj: '16:00', tip: 'standardno' },
  1: { pocetak: '08:00', kraj: '16:00', tip: 'standardno' },
  2: { pocetak: '09:00', kraj: '17:00', tip: 'fleksibilno' },
  3: { pocetak: '08:00', kraj: '14:00', tip: 'standardno' },
  4: { pocetak: '08:00', kraj: '16:00', tip: 'standardno' },
  5: { pocetak: '', kraj: '', tip: 'neradni' },
  6: { pocetak: '', kraj: '', tip: 'neradni' },
};

const tipColors: Record<string, string> = {
  standardno: 'bg-primary-100 text-primary-700 border-primary-200',
  fleksibilno: 'bg-amber-100 text-amber-700 border-amber-200',
  neradni: 'bg-gray-100 text-gray-400 border-gray-200',
  odsustvo: 'bg-red-100 text-red-700 border-red-200',
};

const tipLabels: Record<string, string> = {
  standardno: 'Standardno',
  fleksibilno: 'Fleksibilno',
  neradni: 'Neradni dan',
  odsustvo: 'Odsustvo',
};

export default function DoctorScheduleView(_props: DoctorScheduleProps) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Sedmicni raspored
        </h3>
        <div className="flex items-center gap-2">
          {Object.entries(tipLabels).map(([tip, label]) => (
            <span key={tip} className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${tipColors[tip]}`}>
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {dayNames.map((day, i) => {
          const schedule = demoScheduleData[i];
          const isWorking = schedule.tip !== 'neradni';

          return (
            <div
              key={day}
              className={`rounded-lg border p-3 text-center ${tipColors[schedule.tip]}`}
            >
              <p className="text-xs font-semibold mb-1">{shortDays[i]}</p>
              {isWorking ? (
                <>
                  <div className="flex items-center justify-center gap-1">
                    <Clock size={12} />
                    <span className="text-sm font-medium">{schedule.pocetak}</span>
                  </div>
                  <p className="text-[10px] mt-0.5">do</p>
                  <span className="text-sm font-medium">{schedule.kraj}</span>
                  <p className="text-[10px] mt-1 opacity-75">
                    {calculateHours(schedule.pocetak, schedule.kraj)}h
                  </p>
                </>
              ) : (
                <p className="text-xs mt-2">Neradni</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <span className="font-medium">Ukupno sedmicno: </span>
          {Object.values(demoScheduleData)
            .filter((s) => s.tip !== 'neradni')
            .reduce((sum, s) => sum + calculateHoursNum(s.pocetak, s.kraj), 0)}h
        </div>
      </div>
    </Card>
  );
}

function calculateHours(start: string, end: string): string {
  if (!start || !end) return '0';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return ((eh * 60 + em - sh * 60 - sm) / 60).toFixed(0);
}

function calculateHoursNum(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em - sh * 60 - sm) / 60;
}
