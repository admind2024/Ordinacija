import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import type { Patient } from '../types';
import { demoPatients } from '../data/demo';

interface PatientsContextType {
  patients: Patient[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortField: keyof Patient;
  sortDir: 'asc' | 'desc';
  setSort: (field: keyof Patient) => void;
  filteredPatients: Patient[];
  createPatient: (patient: Patient) => void;
  updatePatient: (id: string, updates: Partial<Patient>) => void;
  deletePatient: (id: string) => void;
  getPatient: (id: string) => Patient | undefined;
}

const PatientsContext = createContext<PatientsContextType | undefined>(undefined);

export function PatientsProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>(demoPatients);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof Patient>('prezime');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const setSort = useCallback((field: keyof Patient) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('asc');
      return field;
    });
  }, []);

  const filteredPatients = useMemo(() => {
    let result = [...patients];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.ime.toLowerCase().includes(q) ||
          p.prezime.toLowerCase().includes(q) ||
          p.telefon.includes(q) ||
          (p.email && p.email.toLowerCase().includes(q)) ||
          (p.datum_rodjenja && p.datum_rodjenja.includes(q))
      );
    }

    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let cmp = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        cmp = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [patients, searchQuery, sortField, sortDir]);

  const createPatient = useCallback((patient: Patient) => {
    setPatients((prev) => [...prev, patient]);
  }, []);

  const updatePatient = useCallback((id: string, updates: Partial<Patient>) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  const deletePatient = useCallback((id: string) => {
    setPatients((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const getPatient = useCallback(
    (id: string) => patients.find((p) => p.id === id),
    [patients]
  );

  return (
    <PatientsContext.Provider
      value={{
        patients, searchQuery, setSearchQuery,
        sortField, sortDir, setSort, filteredPatients,
        createPatient, updatePatient, deletePatient, getPatient,
      }}
    >
      {children}
    </PatientsContext.Provider>
  );
}

export function usePatients() {
  const context = useContext(PatientsContext);
  if (!context) throw new Error('usePatients mora biti koristen unutar PatientsProvider-a');
  return context;
}
