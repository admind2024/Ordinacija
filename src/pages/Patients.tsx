import { useState } from 'react';
import { PatientsProvider, usePatients } from '../contexts/PatientsContext';
import PatientList from '../components/patients/PatientList';
import PatientForm from '../components/patients/PatientForm';
import PatientCard from '../components/patients/PatientCard';
import type { Patient } from '../types';
import { generateDemoAppointments } from '../data/demo';

const demoAppointments = generateDemoAppointments();

function PatientsContent() {
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

  if (selectedPatient) {
    return (
      <>
        <PatientCard
          patient={selectedPatient}
          appointments={demoAppointments}
          onBack={() => setSelectedPatient(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
        <PatientForm
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
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Pacijenti</h2>
        <p className="text-sm text-gray-500 mt-1">Upravljanje kartonima pacijenata</p>
      </div>

      <PatientList onSelect={setSelectedPatient} onNew={handleNew} />

      <PatientForm
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
  return (
    <PatientsProvider>
      <PatientsContent />
    </PatientsProvider>
  );
}
