import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User, UserRole } from '../types';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo korisnik za razvoj dok Supabase nije konfigurisan
const DEMO_USER: User = {
  id: 'demo-admin-001',
  email: 'admin@ordinacija.me',
  ime: 'Admin',
  prezime: 'Demo',
  uloga: 'admin',
  aktivan: true,
  created_at: new Date().toISOString(),
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const isSupabaseConfigured =
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_URL !== 'https://your-project.supabase.co';

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setUser(DEMO_USER);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Greska pri ucitavanju profila:', error);
      setUser(null);
    } else {
      setUser(data as User);
    }
    setLoading(false);
  }

  async function signIn(email: string, password: string) {
    if (!isSupabaseConfigured) {
      // Demo mod — prihvati bilo koji login
      setUser({ ...DEMO_USER, email });
      return { error: null };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  }

  async function signOut() {
    if (!isSupabaseConfigured) {
      setUser(null);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
  }

  function hasRole(roles: UserRole | UserRole[]) {
    if (!user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.uloga);
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut, hasRole }}>
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
