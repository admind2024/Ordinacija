import { format, parseISO } from 'date-fns';
import {
  ArrowLeft, Edit, Trash2, Phone, Mail, MapPin, Calendar,
  Tag, Clock, User,
} from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import type { Patient, Appointment } from '../../types';
import { demoDoctors, demoRooms } from '../../data/demo';
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_COLORS } from '../../types';

interface PatientCardProps {
  patient: Patient;
  appointments: Appointment[];
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function PatientCard({ patient, appointments, onBack, onEdit, onDelete }: PatientCardProps) {
  const patientAppointments = appointments
    .filter((a) => a.patient_id === patient.id)
    .sort((a, b) => parseISO(b.pocetak).getTime() - parseISO(a.pocetak).getTime());

  const totalZakazano = patientAppointments.reduce(
    (sum, a) => sum + (a.services?.reduce((s, svc) => s + svc.ukupno, 0) || 0), 0
  );

  const brojPosjeta = patientAppointments.filter((a) => a.status === 'zavrsen').length;
  const prvaPosjeta = patientAppointments.length > 0
    ? format(parseISO(patientAppointments[patientAppointments.length - 1].pocetak), 'dd.MM.yyyy.')
    : '—';

  const tagColors: Record<string, string> = {
    VIP: 'bg-amber-100 text-amber-700',
    Redovan: 'bg-green-100 text-green-700',
    Djeca: 'bg-blue-100 text-blue-700',
    Problematican: 'bg-red-100 text-red-700',
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{patient.ime} {patient.prezime}</h2>
            <div className="flex items-center gap-2 mt-1">
              {patient.tagovi.map((tag) => (
                <span key={tag} className={`px-2 py-0.5 rounded-full text-xs font-medium ${tagColors[tag] || 'bg-gray-100 text-gray-600'}`}>
                  {tag}
                </span>
              ))}
              {patient.popust > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  Popust {patient.popust}%
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onEdit}><Edit size={14} /> Izmijeni</Button>
          <Button variant="danger" size="sm" onClick={onDelete}><Trash2 size={14} /> Obrisi</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lijeva kolona — info */}
        <div className="space-y-6">
          {/* Licni podaci */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Licni podaci</h3>
            <div className="space-y-2 text-sm">
              {patient.datum_rodjenja && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar size={14} className="text-gray-400" />
                  {new Date(patient.datum_rodjenja).toLocaleDateString('sr-Latn-ME')}
                  <span className="text-gray-400">
                    ({new Date().getFullYear() - new Date(patient.datum_rodjenja).getFullYear()} god.)
                  </span>
                </div>
              )}
              {patient.pol && (
                <div className="flex items-center gap-2 text-gray-600">
                  <User size={14} className="text-gray-400" />
                  {patient.pol === 'muski' ? 'Muski' : patient.pol === 'zenski' ? 'Zenski' : 'Ostalo'}
                </div>
              )}
              {patient.ime_roditelja && (
                <div className="flex items-center gap-2 text-gray-600">
                  <User size={14} className="text-gray-400" />
                  Roditelj: {patient.ime_roditelja}
                </div>
              )}
            </div>
          </Card>

          {/* Kontakt */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Kontakt</h3>
            <div className="space-y-2 text-sm">
              <a href={`tel:${patient.telefon}`} className="flex items-center gap-2 text-primary-600 hover:text-primary-700">
                <Phone size={14} /> {patient.telefon}
              </a>
              {patient.email && (
                <a href={`mailto:${patient.email}`} className="flex items-center gap-2 text-primary-600 hover:text-primary-700">
                  <Mail size={14} /> {patient.email}
                </a>
              )}
              {patient.grad && (
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin size={14} className="text-gray-400" /> {patient.adresa ? `${patient.adresa}, ` : ''}{patient.grad}
                </div>
              )}
            </div>
          </Card>

          {/* Izvor */}
          {patient.izvor_preporuke && (
            <Card>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Izvor</h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Tag size={14} className="text-gray-400" />
                {patient.izvor_preporuke}
                {patient.detalji_preporuke && ` — ${patient.detalji_preporuke}`}
              </div>
            </Card>
          )}

          {/* Napomena */}
          {patient.napomena && (
            <Card>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Napomena</h3>
              <p className="text-sm text-gray-600">{patient.napomena}</p>
            </Card>
          )}
        </div>

        {/* Srednja kolona — finansije */}
        <div className="space-y-6">
          <Card>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Finansijska kartica</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xl font-bold text-gray-900">{totalZakazano.toFixed(0)}</p>
                <p className="text-xs text-gray-500">Ukupno (EUR)</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className={`text-xl font-bold ${patient.saldo < 0 ? 'text-red-600' : patient.saldo > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                  {patient.saldo}
                </p>
                <p className="text-xs text-gray-500">Saldo (EUR)</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xl font-bold text-gray-900">{brojPosjeta}</p>
                <p className="text-xs text-gray-500">Posjeta</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">{prvaPosjeta}</p>
                <p className="text-xs text-gray-500">Prva posjeta</p>
              </div>
            </div>
          </Card>

          {patient.osiguranje && (
            <Card>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Osiguranje</h3>
              <p className="text-sm text-gray-600">{patient.osiguranje}</p>
            </Card>
          )}
        </div>

        {/* Desna kolona — historija termina */}
        <div className="space-y-6">
          <Card padding={false}>
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Historija termina</h3>
            </div>
            <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
              {patientAppointments.length === 0 ? (
                <p className="px-6 py-8 text-sm text-gray-400 text-center">Nema termina</p>
              ) : (
                patientAppointments.map((apt) => {
                  const doctor = demoDoctors.find((d) => d.id === apt.doctor_id);
                  const room = demoRooms.find((r) => r.id === apt.room_id);
                  return (
                    <div key={apt.id} className="px-6 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {format(parseISO(apt.pocetak), 'dd.MM.yyyy. HH:mm')}
                          </span>
                        </div>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: APPOINTMENT_STATUS_COLORS[apt.status] + '20',
                            color: APPOINTMENT_STATUS_COLORS[apt.status],
                          }}
                        >
                          {APPOINTMENT_STATUS_LABELS[apt.status]}
                        </span>
                      </div>
                      {apt.services && apt.services.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1 ml-6">
                          {apt.services.map((s) => s.naziv).join(', ')}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1 ml-6 text-xs text-gray-400">
                        {doctor && <span>{doctor.titula} {doctor.ime} {doctor.prezime.charAt(0)}.</span>}
                        {room && <span>{room.naziv}</span>}
                        {apt.services && (
                          <span className="font-medium text-gray-600">
                            {apt.services.reduce((s, svc) => s + svc.ukupno, 0).toFixed(0)} EUR
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
