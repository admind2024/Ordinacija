import { useState } from 'react';
import { usePatients } from '../contexts/PatientsContext';
import PatientList from '../components/patients/PatientList';
import PatientForm from '../components/patients/PatientForm';
import PatientCard from '../components/patients/PatientCard';
import type { Patient } from '../types';
import { useCalendar } from '../contexts/CalendarContext';

function PatientsContent() {
  const { appointments } = useCalendar();
  const { deletePatient } = usePatients();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  function handleNew() {
    setEditingPatient(null);
    setFormOpen(true);
  }

  function handleEdit() {
    if (selectedPatient) {
      setEditingPatient(selectedPatient);
      setFormOpen(true);
    }
  }

  function handleDelete() {
    if (selectedPatient && confirm(`Obrisati pacijenta ${selectedPatient.ime} ${selectedPatient.prezime}?`)) {
      deletePatient(selectedPatient.id);
      setSelectedPatient(null);
    }
  }

  // Remount form svaki put kad se otvori / promijeni pacijent — inace useState
  // initializer ne refresuje inicijalne vrijednosti iz editPatient prop-a.
  const formKey = formOpen ? (editingPatient?.id ?? 'new') : 'closed';

  if (selectedPatient) {
    return (
      <>
        <PatientCard
          patient={selectedPatient}
          appointments={appointments}
          onBack={() => setSelectedPatient(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
        <PatientForm
          key={formKey}
          isOpen={formOpen}
          onClose={() => {
            setFormOpen(false);
            setEditingPatient(null);
          }}
          editPatient={editingPatient}
        />
      </>
    );
  }

  return (
    <div>
      <PatientList onSelect={setSelectedPatient} onNew={handleNew} />

      <PatientForm
        key={formKey}
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingPatient(null);
        }}
        editPatient={editingPatient}
      />
    </div>
  );
}

export default function Patients() {
  return <PatientsContent />;
}
