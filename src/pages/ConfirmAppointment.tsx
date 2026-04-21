import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * Public stranica — /potvrda/:token
 *
 * Pacijent klikne link iz SMS/Viber podsjetnika i potvrdi dolazak.
 * Potvrda se NE desava automatski pri ucitavanju — trazi se klik na dugme,
 * jer neki messenger klijenti (Viber, iMessage) pre-fetch URL za preview
 * cime bi nehoteno potvrdili dolazak. Klik = eksplicitna namera.
 */

type State =
  | { kind: 'loading' }
  | { kind: 'not_found' }
  | { kind: 'actionable'; ime: string; pocetak: string; doktor: string; alreadyConfirmed: boolean }
  | { kind: 'locked'; razlog: 'otkazan' | 'zavrsen' | 'nije_dosao'; pocetak: string; ime: string; doktor: string }
  | { kind: 'done'; ime: string; pocetak: string; doktor: string; wasAlready: boolean };

function formatDatum(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}.`;
}
function formatVrijeme(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function ConfirmAppointment() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token) { setState({ kind: 'not_found' }); return; }
      const { data, error } = await supabase.rpc('fetch_appointment_by_token', { p_token: token });
      if (error || !data || data.length === 0) {
        setState({ kind: 'not_found' });
        return;
      }
      const row = data[0] as {
        ime_pacijenta: string | null;
        pocetak: string;
        kraj: string;
        status: string;
        confirmed_at: string | null;
        doktor: string | null;
      };
      const ime = row.ime_pacijenta || '';
      const doktor = row.doktor || '';
      if (row.status === 'otkazan' || row.status === 'zavrsen' || row.status === 'nije_dosao') {
        setState({ kind: 'locked', razlog: row.status, pocetak: row.pocetak, ime, doktor });
        return;
      }
      setState({
        kind: 'actionable',
        ime,
        pocetak: row.pocetak,
        doktor,
        alreadyConfirmed: row.confirmed_at !== null,
      });
    })();
  }, [token]);

  async function handleConfirm() {
    if (!token || state.kind !== 'actionable') return;
    setSubmitting(true);
    const { data, error } = await supabase.rpc('confirm_appointment_by_token', { p_token: token });
    if (error || !data || data.length === 0) {
      alert('Desila se greska, pokusajte ponovo.');
      setSubmitting(false);
      return;
    }
    const row = data[0] as {
      ok: boolean;
      razlog: string;
      already_confirmed: boolean;
      pocetak: string;
      ime_pacijenta: string | null;
      doktor: string | null;
    };
    if (!row.ok) {
      if (row.razlog === 'otkazan' || row.razlog === 'zavrsen' || row.razlog === 'nije_dosao') {
        setState({
          kind: 'locked',
          razlog: row.razlog,
          pocetak: row.pocetak,
          ime: row.ime_pacijenta || '',
          doktor: row.doktor || '',
        });
      } else {
        setState({ kind: 'not_found' });
      }
      setSubmitting(false);
      return;
    }
    setState({
      kind: 'done',
      ime: row.ime_pacijenta || state.ime,
      pocetak: row.pocetak,
      doktor: row.doktor || state.doktor,
      wasAlready: row.already_confirmed,
    });
    setSubmitting(false);
  }

  // ── Loading ──
  if (state.kind === 'loading') {
    return <Body><p style={S.loading}>Ucitavanje...</p></Body>;
  }

  // ── Not found / invalid token ──
  if (state.kind === 'not_found') {
    return (
      <Body>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>🔍</p>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Link nije ispravan</h1>
          <p style={{ fontSize: 13, color: '#6B7280' }}>
            Ovaj link ne odgovara nijednom terminu. Provjerite link iz poruke.
          </p>
        </div>
      </Body>
    );
  }

  // ── Locked (otkazan / zavrsen / nije_dosao) ──
  if (state.kind === 'locked') {
    const poruke: Record<typeof state.razlog, string> = {
      otkazan: 'Ovaj termin je otkazan. Molimo kontaktirajte ordinaciju za novi termin.',
      zavrsen: 'Ovaj termin je zavrsen.',
      nije_dosao: 'Ovaj termin je oznacen kao neodrzan.',
    };
    return (
      <Body>
        <Header />
        <div style={S.infoCard}>
          <div style={S.infoIcon}>!</div>
          <h2 style={S.h2}>Termin nije moguce potvrditi</h2>
          <p style={S.pSmall}>{poruke[state.razlog]}</p>
          <TerminInfo ime={state.ime} pocetak={state.pocetak} doktor={state.doktor} muted />
        </div>
      </Body>
    );
  }

  // ── Done (potvrda zavrsena) ──
  if (state.kind === 'done') {
    return (
      <Body>
        <Header />
        <div style={S.successCard}>
          <div style={S.successIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2BA5A5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 style={S.h2}>{state.wasAlready ? 'Vec ste potvrdili dolazak' : 'Hvala, vas dolazak je potvrdjen!'}</h2>
          <p style={S.pSmall}>
            Vidimo se u MOA klinici.
          </p>
          <TerminInfo ime={state.ime} pocetak={state.pocetak} doktor={state.doktor} />
        </div>
      </Body>
    );
  }

  // ── Actionable (potvrdi dugme) ──
  return (
    <Body>
      <Header />
      <div style={S.qCard}>
        <h1 style={{ ...S.h2, textAlign: 'center' }}>Potvrda dolaska</h1>
        <p style={{ ...S.pSmall, textAlign: 'center', marginBottom: 20 }}>
          {state.alreadyConfirmed
            ? 'Vas dolazak je vec potvrdjen. Mozete ga jos jednom potvrditi klikom ispod.'
            : 'Molimo potvrdite svoj dolazak klikom na dugme.'}
        </p>
        <TerminInfo ime={state.ime} pocetak={state.pocetak} doktor={state.doktor} />
        <button
          onClick={handleConfirm}
          disabled={submitting}
          style={{ ...S.submitBtn, opacity: submitting ? 0.6 : 1, marginTop: 20 }}
        >
          {submitting ? 'Potvrda u toku...' : 'Potvrdjujem dolazak'}
        </button>
        <p style={S.anonNote}>
          Ako ne mozete doci, molimo pozovite nas da otkazete termin.
        </p>
      </div>
    </Body>
  );
}

// ── Sub-components ──

function Body({ children }: { children: React.ReactNode }) {
  return <div style={S.body}>{children}</div>;
}

function Header() {
  return (
    <div style={S.header}>
      <img
        src="https://pedgschrivtpbzcoqniu.supabase.co/storage/v1/object/public/Razno/MOA%20LOGO%201.png"
        alt="MOA"
        style={{ height: 64, objectFit: 'contain', display: 'block', margin: '0 auto 10px' }}
      />
      <p style={S.headerSub}>Ministry of Aesthetics</p>
    </div>
  );
}

function TerminInfo({ ime, pocetak, doktor, muted }: { ime: string; pocetak: string; doktor: string; muted?: boolean }) {
  return (
    <div style={{ ...S.terminBox, opacity: muted ? 0.7 : 1 }}>
      {ime && (
        <div style={S.terminRow}>
          <span style={S.terminLabel}>Pacijent:</span>
          <span style={S.terminVal}>{ime}</span>
        </div>
      )}
      <div style={S.terminRow}>
        <span style={S.terminLabel}>Datum:</span>
        <span style={S.terminVal}>{formatDatum(pocetak)}</span>
      </div>
      <div style={S.terminRow}>
        <span style={S.terminLabel}>Vrijeme:</span>
        <span style={S.terminVal}>{formatVrijeme(pocetak)}h</span>
      </div>
      {doktor && (
        <div style={S.terminRow}>
          <span style={S.terminLabel}>Ljekar:</span>
          <span style={S.terminVal}>{doktor}</span>
        </div>
      )}
    </div>
  );
}

// ── Styles (usklađeno sa SurveyPublic) ──

const S: Record<string, React.CSSProperties> = {
  body: {
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    background: '#F7FAFA',
    color: '#111827',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 16px 60px',
  },
  loading: { textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: '80px 0' },
  header: { textAlign: 'center', marginBottom: 32 },
  headerSub: { fontSize: 13, color: '#7AABAB', letterSpacing: '0.03em' },
  h2: { fontSize: 20, fontWeight: 700, marginBottom: 10 },
  pSmall: { fontSize: 14, color: '#6B7280', lineHeight: 1.6 },
  qCard: {
    background: '#fff', border: '1px solid #E0EDED', borderRadius: 18,
    padding: '24px 24px', boxShadow: '0 1px 3px rgba(43,165,165,.06)',
    width: '100%', maxWidth: 480,
  },
  successCard: {
    background: '#fff', border: '1px solid #E0EDED', borderRadius: 18,
    padding: '32px 24px', boxShadow: '0 1px 3px rgba(43,165,165,.06)',
    textAlign: 'center', width: '100%', maxWidth: 480,
  },
  successIcon: {
    width: 56, height: 56, borderRadius: '50%',
    background: '#E6F5F5',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 16px',
  },
  infoCard: {
    background: '#fff', border: '1px solid #E0EDED', borderRadius: 18,
    padding: '32px 24px', boxShadow: '0 1px 3px rgba(43,165,165,.06)',
    textAlign: 'center', width: '100%', maxWidth: 480,
  },
  infoIcon: {
    width: 56, height: 56, borderRadius: '50%',
    background: '#FEF3C7', color: '#B45309',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 16px', fontSize: 28, fontWeight: 800,
  },
  terminBox: {
    background: '#F7FAFA', border: '1px solid #E0EDED', borderRadius: 12,
    padding: '14px 16px', marginTop: 16, textAlign: 'left',
  },
  terminRow: { display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' },
  terminLabel: { color: '#6B7280' },
  terminVal: { fontWeight: 600, color: '#111827' },
  submitBtn: {
    width: '100%', padding: '14px 18px', borderRadius: 12, border: 'none',
    background: '#2BA5A5', color: '#fff', fontSize: 15, fontWeight: 700,
    cursor: 'pointer', transition: 'background .15s', fontFamily: 'inherit',
  },
  anonNote: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 12 },
};
