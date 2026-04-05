import { Stethoscope, Phone, Mail } from 'lucide-react';
import { demoDoctors } from '../../data/demo';
import Card from '../ui/Card';
import type { Doctor } from '../../types';

interface DoctorListProps {
  onSelect: (doctor: Doctor) => void;
}

export default function DoctorList({ onSelect }: DoctorListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {demoDoctors.map((doctor) => (
        <Card key={doctor.id} className="hover:shadow-md transition-shadow cursor-pointer" padding={false}>
          <button onClick={() => onSelect(doctor)} className="w-full text-left p-6">
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                style={{ backgroundColor: doctor.boja }}
              >
                {doctor.ime.charAt(0)}{doctor.prezime.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-900">
                  {doctor.titula} {doctor.ime} {doctor.prezime}
                </h3>
                <div className="flex items-center gap-1 mt-0.5">
                  <Stethoscope size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-500">{doctor.specijalizacija}</span>
                </div>

                <div className="mt-3 space-y-1">
                  {doctor.telefon && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Phone size={12} /> {doctor.telefon}
                    </div>
                  )}
                  {doctor.email && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Mail size={12} /> {doctor.email}
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    doctor.aktivan ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {doctor.aktivan ? 'Aktivan' : 'Neaktivan'}
                  </span>
                  <span className="w-3 h-3 rounded-full border-2 border-white shadow" style={{ backgroundColor: doctor.boja }} title="Boja u kalendaru" />
                </div>
              </div>
            </div>
          </button>
        </Card>
      ))}
    </div>
  );
}
