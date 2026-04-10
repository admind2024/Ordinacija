import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { loadSmsConfigFromDb } from '../lib/smsService';
import { loadReminderSettingsFromDb, setReminderSettings } from '../lib/reminderSettings';
import type { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ALLOWED_PASSWORDS = ['moa2026', '1519'];
const LS_USER_KEY = 'moa_current_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(LS_USER_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUser(parsed);
        // Ako je korisnik vec ulogovan, odmah povuci SMS config
        // i reminder settings iz Supabase — ne cekamo otvaranje stranica.
        void bootstrapUserConfig();
      } catch {}
    }
    setLoading(false);
  }, []);

  async function bootstrapUserConfig() {
    try {
      await loadSmsConfigFromDb();
      const rs = await loadReminderSettingsFromDb();
      if (rs) setReminderSettings(rs);
    } catch (e) {
      console.error('Greska pri ucitavanju SMS/reminder konfiguracije:', e);
    }
  }

  async function signIn(email: string, password: string) {
    if (!ALLOWED_PASSWORDS.includes(password)) {
      return { error: 'Pogresna sifra' };
    }

    // Look up user in Supabase users table
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      return { error: 'Korisnik nije pronadjen' };
    }

    const userData = data as User;
    if (!userData.aktivan) {
      return { error: 'Nalog je deaktiviran' };
    }

    setUser(userData);
    localStorage.setItem(LS_USER_KEY, JSON.stringify(userData));
    // Odmah nakon login-a povuci SMS config iz baze (kljucno za nove uredjaje)
    void bootstrapUserConfig();
    return { error: null };
  }

  async function signOut() {
    setUser(null);
    localStorage.removeItem(LS_USER_KEY);
  }

  function hasRole(roles: UserRole | UserRole[]) {
    if (!user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.uloga);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth mora biti koristen unutar AuthProvider-a');
  }
  return context;
}
