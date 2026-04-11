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
  /** Aktivna dugovanja po pacijentu: patient_id -> suma preostalog */
  debtsByPatient: Map<string, number>;
  /** Suma svih dosada uplaćenih transakcija za pacijenta */
  paidByPatient: Map<string, number>;
  refreshDebts: () => Promise<void>;
}

const PatientsContext = createContext<PatientsContextType | undefined>(undefined);

export function PatientsProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof Patient>('prezime');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [debtsByPatient, setDebtsByPatient] = useState<Map<string, number>>(new Map());
  const [paidByPatient, setPaidByPatient] = useState<Map<string, number>>(new Map());

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

  /** Agregira aktivna dugovanja i uplate po pacijentu iz dugovanja + payments. */
  const fetchDebts = useCallback(async () => {
    // Aktivna dugovanja (preostalo > 0)
    const { data: duga } = await supabase
      .from('dugovanja')
      .select('patient_id, preostalo, status')
      .eq('status', 'aktivan');

    const debtMap = new Map<string, number>();
    for (const d of duga || []) {
      if (!d.patient_id) continue;
      debtMap.set(d.patient_id, (debtMap.get(d.patient_id) || 0) + (Number(d.preostalo) || 0));
    }
    setDebtsByPatient(debtMap);

    // Sve uplate preko payments tabele — JOIN preko appointments da dobijemo patient_id
    const { data: pays } = await supabase
      .from('payments')
      .select('iznos, appointment:appointments(patient_id)');

    const paidMap = new Map<string, number>();
    for (const p of pays || []) {
      const pid = (p as any).appointment?.patient_id;
      if (!pid) continue;
      paidMap.set(pid, (paidMap.get(pid) || 0) + (Number(p.iznos) || 0));
    }
    setPaidByPatient(paidMap);
  }, []);

  useEffect(() => {
    fetchPatients();
    fetchDebts();
  }, [fetchPatients, fetchDebts]);

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

    if (searchQuery.trim()) {
      // Podrzi "Ime Prezime" pretragu: svaki token mora biti sadrzan u NEKOM polju
      const tokens = searchQuery.toLowerCase().trim().split(/\s+/);
      result = result.filter((p) => {
        const haystack = [
          p.ime,
          p.prezime,
          `${p.ime} ${p.prezime}`,
          p.telefon,
          p.email || '',
          p.datum_rodjenja || '',
        ].join(' ').toLowerCase();
        return tokens.every((t) => haystack.includes(t));
      });
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
        debtsByPatient, paidByPatient,
        refreshDebts: fetchDebts,
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
