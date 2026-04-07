import { useState } from 'react';
import { ArrowLeft, Phone, Mail } from 'lucide-react';
import DoctorList from '../components/doctors/DoctorList';
import DoctorScheduleView from '../components/doctors/DoctorSchedule';
import Card from '../components/ui/Card';
import type { Doctor } from '../types';
import { useCalendar } from '../contexts/CalendarContext';

export default function Doctors() {
  const { rooms } = useCalendar();
  const [selected, setSelected] = useState<Doctor | null>(null);

  if (selected) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setSelected(null)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl"
              style={{ backgroundColor: selected.boja }}
            >
              {selected.ime.charAt(0)}{selected.prezime.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {selected.titula} {selected.ime} {selected.prezime}
              </h2>
              <p className="text-sm text-gray-500">{selected.specijalizacija}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profil */}
          <div className="space-y-6">
            <Card>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Kontakt</h3>
              <div className="space-y-2 text-sm">
                {selected.telefon && (
                  <a href={`tel:${selected.telefon}`} className="flex items-center gap-2 text-primary-600">
                    <Phone size={14} /> {selected.telefon}
                  </a>
                )}
                {selected.email && (
                  <a href={`mailto:${selected.email}`} className="flex items-center gap-2 text-primary-600">
                    <Mail size={14} /> {selected.email}
                  </a>
                )}
              </div>
            </Card>

            <Card>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Ordinacije</h3>
              <div className="space-y-1">
                {rooms.map((room) => (
                  <div key={room.id} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: room.boja }} />
                    {room.naziv}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Raspored */}
          <div className="lg:col-span-2">
            <DoctorScheduleView doctor={selected} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Ljekari</h2>
        <p className="text-sm text-gray-500 mt-1">Profili ljekara i raspored rada</p>
      </div>
      <DoctorList onSelect={setSelected} />
    </div>
  );
}
