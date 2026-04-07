import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from 'react';
import type { Patient } from '../types';
import { supabase } from '../lib/supabase';

interface PatientsContextType {
  patients: Patient[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortField: keyof Patient;
  sortDir: 'asc' | 'desc';
  setSort: (field: keyof Patient) => void;
  filteredPatients: Patient[];
  createPatient: (patient: Omit<Patient, 'id' | 'created_at'>) => Promise<Patient | null>;
  updatePatient: (id: string, updates: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  getPatient: (id: string) => Patient | undefined;
  refreshPatients: () => Promise<void>;
}

const PatientsContext = createContext<PatientsContextType | undefined>(undefined);

export function PatientsProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof Patient>('prezime');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Greska pri ucitavanju pacijenata:', error);
    } else {
      setPatients((data || []).map((p: any) => ({
        ...p,
        popust: Number(p.popust) || 0,
        pocetno_stanje: Number(p.pocetno_stanje) || 0,
        saldo: Number(p.saldo) || 0,
        tagovi: p.tagovi || [],
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

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

  const createPatient = useCallback(async (patient: Omit<Patient, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('patients')
      .insert(patient)
      .select()
      .single();

    if (error) {
      console.error('Greska pri kreiranju pacijenta:', error);
      return null;
    }

    const newPatient = {
      ...data,
      popust: Number(data.popust) || 0,
      pocetno_stanje: Number(data.pocetno_stanje) || 0,
      saldo: Number(data.saldo) || 0,
      tagovi: data.tagovi || [],
    } as Patient;

    setPatients((prev) => [newPatient, ...prev]);
    return newPatient;
  }, []);

  const updatePatient = useCallback(async (id: string, updates: Partial<Patient>) => {
    const { error } = await supabase
      .from('patients')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Greska pri azuriranju pacijenta:', error);
      return;
    }

    setPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  const deletePatient = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Greska pri brisanju pacijenta:', error);
      return;
    }

    setPatients((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const getPatient = useCallback(
    (id: string) => patients.find((p) => p.id === id),
    [patients]
  );

  return (
    <PatientsContext.Provider
      value={{
        patients, loading, searchQuery, setSearchQuery,
        sortField, sortDir, setSort, filteredPatients,
        createPatient, updatePatient, deletePatient, getPatient,
        refreshPatients: fetchPatients,
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
