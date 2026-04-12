import { useState } from 'react';
import { ArrowLeft, Phone, Mail, Plus, Edit, Trash2 } from 'lucide-react';
import DoctorList from '../components/doctors/DoctorList';
import DoctorScheduleView from '../components/doctors/DoctorSchedule';
import DoctorForm from '../components/doctors/DoctorForm';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import type { Doctor } from '../types';
import { useCalendar } from '../contexts/CalendarContext';

export default function Doctors() {
  const { rooms, createDoctor, updateDoctor, deleteDoctor } = useCalendar();
  const [selected, setSelected] = useState<Doctor | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);

  function handleAdd() {
    setEditingDoctor(null);
    setFormOpen(true);
  }

  function handleEdit(doctor: Doctor) {
    setEditingDoctor(doctor);
    setFormOpen(true);
  }

  async function handleSave(data: Omit<Doctor, 'id'>) {
    if (editingDoctor) {
      await updateDoctor(editingDoctor.id, data);
      if (selected?.id === editingDoctor.id) {
        setSelected({ ...selected, ...data } as Doctor);
      }
    } else {
      await createDoctor(data);
    }
  }

  async function handleDelete(doctor: Doctor) {
    if (!confirm(`Da li ste sigurni da zelite obrisati ljekara ${doctor.ime} ${doctor.prezime}?`)) return;
    await deleteDoctor(doctor.id);
    if (selected?.id === doctor.id) setSelected(null);
  }

  if (selected) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelected(null)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-4">
              {selected.slika ? (
                <img src={selected.slika} alt={`${selected.ime} ${selected.prezime}`} className="w-14 h-14 rounded-full object-cover" />
              ) : (
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl"
                  style={{ backgroundColor: selected.boja }}
                >
                  {selected.ime.charAt(0)}{selected.prezime.charAt(0)}
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selected.titula} {selected.ime} {selected.prezime}
                </h2>
                <p className="text-sm text-gray-500">{selected.specijalizacija}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => handleEdit(selected)}>
              <Edit size={14} /> Izmijeni
            </Button>
            <Button variant="danger" size="sm" onClick={() => handleDelete(selected)}>
              <Trash2 size={14} /> Obrisi
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

          <div className="lg:col-span-2">
            <DoctorScheduleView doctor={selected} />
          </div>
        </div>

        <DoctorForm
          key={editingDoctor?.id || 'new'}
          isOpen={formOpen}
          onClose={() => setFormOpen(false)}
          onSave={handleSave}
          editDoctor={editingDoctor}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-6">
        <Button onClick={handleAdd}>
          <Plus size={16} /> Dodaj osobu
        </Button>
      </div>
      <DoctorList onSelect={setSelected} />

      <DoctorForm
        key={editingDoctor?.id || 'new'}
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        editDoctor={editingDoctor}
      />
    </div>
  );
}
