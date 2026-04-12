import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * Public survey — pixel-perfect copy of survey-preview.html
 * Route: /anketa/:id
 */

export default function SurveyPublic() {
  const { id } = useParams<{ id: string }>();
  const [exists, setExists] = useState<boolean | null>(null);
  const [surveyId, setSurveyId] = useState('');

  // Answer state
  const [starsQ1, setStarsQ1] = useState(0);
  const [starsQ3, setStarsQ3] = useState(0);
  const [starsQ4, setStarsQ4] = useState(0);
  const [choiceQ2, setChoiceQ2] = useState('');
  const [npsVal, setNpsVal] = useState<number | null>(null);
  const [comment, setComment] = useState('');

  // Hover state for stars
  const [hoverQ1, setHoverQ1] = useState(0);
  const [hoverQ3, setHoverQ3] = useState(0);
  const [hoverQ4, setHoverQ4] = useState(0);

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) { setExists(false); return; }
    supabase
      .from('surveys')
      .select('id, aktivan')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.aktivan) { setExists(true); setSurveyId(data.id); }
        else setExists(false);
      });
  }, [id]);

  // Provjeri da li je vec popunjena u ovom browseru
  const alreadyDone = typeof window !== 'undefined' && localStorage.getItem(`survey_done_${id}`) === 'true';

  async function handleSubmit() {
    if (starsQ1 === 0) { alert('Molimo ocijenite doktora.'); return; }
    if (npsVal === null) { alert('Molimo odaberite NPS ocjenu.'); return; }
    setSubmitting(true);

    await supabase.from('survey_responses').insert({
      survey_id: surveyId,
      odgovori: {
        q1: starsQ1,
        q2: choiceQ2 || null,
        q3: starsQ3 || null,
        q4: starsQ4 || null,
        q5: npsVal,
        q6: comment || null,
      },
    });

    // Oznaci kao popunjeno u localStorage
    localStorage.setItem(`survey_done_${id}`, 'true');

    setSubmitted(true);
    setSubmitting(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Loading ──
  if (exists === null) {
    return <Body><p style={S.loading}>Ucitavanje...</p></Body>;
  }

  // ── Already submitted ──
  if (alreadyDone) {
    return (
      <Body>
        <Header />
        <div style={S.successCard}>
          <div style={S.successIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2BA5A5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Vec ste popunili anketu</h2>
          <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>
            Hvala vam na odgovorima!<br />Anketa se moze popuniti samo jednom.
          </p>
        </div>
      </Body>
    );
  }

  // ── Not found ──
  if (!exists) {
    return (
      <Body>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>📋</p>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Anketa nije dostupna</h1>
          <p style={{ fontSize: 13, color: '#6B7280' }}>Ova anketa ne postoji ili je deaktivirana.</p>
        </div>
      </Body>
    );
  }

  // ── Success ──
  if (submitted) {
    return (
      <Body>
        <Header />
        <div style={S.successCard}>
          <div style={S.successIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2BA5A5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Hvala vam!</h2>
          <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>
            Vasi odgovori su anonimni i pomazu nam<br />da svaki dan budemo bolji.<br /><br />Vidimo se na sljedecoj posjeti!
          </p>
        </div>
      </Body>
    );
  }

  // ── Survey form ──
  return (
    <Body>
      <Header />

      <div style={S.formWrap}>
        {/* Intro */}
        <div style={S.introCard}>
          <h1 style={S.introH1}>Kratka anketa o posjeti</h1>
          <p style={S.introP}>
            Vasi odgovori su <strong>anonimni</strong> — ne prikupljamo ime ni kontakt.<br />Traje oko 60 sekundi.
          </p>
        </div>

        {/* Q1: Doctor rating */}
        <QCard>
          <div style={S.qLabel}>Kako biste ocijenili doktora? <span style={S.req}>*</span></div>
          <Stars value={starsQ1} hover={hoverQ1} onHover={setHoverQ1} onSelect={setStarsQ1} />
        </QCard>

        {/* Q2: Waiting */}
        <QCard>
          <div style={S.qLabel}>Kako ste cekali na termin?</div>
          <div style={S.choices}>
            {['Bez cekanja', 'Kratko', 'Dugo cekanje'].map((opt) => (
              <button
                key={opt}
                onClick={() => setChoiceQ2(opt)}
                style={{ ...S.choiceBtn, ...(choiceQ2 === opt ? S.choiceBtnActive : {}) }}
              >
                {opt}
              </button>
            ))}
          </div>
        </QCard>

        {/* Q3: Staff */}
        <QCard>
          <div style={S.qLabel}>Pristup osoblja (recepcija, asistenti)</div>
          <Stars value={starsQ3} hover={hoverQ3} onHover={setHoverQ3} onSelect={setStarsQ3} />
        </QCard>

        {/* Q4: Cleanliness */}
        <QCard>
          <div style={S.qLabel}>Cistoca i udobnost ordinacije</div>
          <Stars value={starsQ4} hover={hoverQ4} onHover={setHoverQ4} onSelect={setStarsQ4} />
        </QCard>

        {/* Q5: NPS */}
        <QCard>
          <div style={S.qLabel}>Biste li nas preporucili prijatelju ili clanu porodice? <span style={S.req}>*</span></div>
          <div style={S.npsWrap}>
            <div style={S.npsButtons}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setNpsVal(n)}
                  style={{ ...S.npsBtn, ...(npsVal === n ? S.npsBtnActive : {}) }}
                >
                  {n}
                </button>
              ))}
            </div>
            <div style={S.npsLabels}>
              <span>Sigurno ne</span>
              <span>Definitivno da</span>
            </div>
          </div>
        </QCard>

        {/* Q6: Comment */}
        <QCard>
          <div style={S.qLabel}>Slobodan komentar (opcionalno)</div>
          <textarea
            style={S.textarea}
            rows={3}
            placeholder="Mozete napisati sta vam se posebno svidjelo ili sta bismo mogli poboljsati..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#3FBDBD'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(43,165,165,.12)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#E0EDED'; e.currentTarget.style.boxShadow = 'none'; }}
          />
        </QCard>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{ ...S.submitBtn, opacity: submitting ? 0.6 : 1 }}
          onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = '#238A8A'; }}
          onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = '#2BA5A5'; }}
        >
          {submitting ? 'Slanje...' : 'Posalji odgovore'}
        </button>

        <p style={S.anonNote}>Vasi odgovori su anonimni i koriste se iskljucivo za unaprijedjenje usluge.</p>
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

function QCard({ children }: { children: React.ReactNode }) {
  return <div style={S.qCard}>{children}</div>;
}

function Stars({ value, hover, onHover, onSelect }: {
  value: number; hover: number;
  onHover: (v: number) => void; onSelect: (v: number) => void;
}) {
  const display = hover || value;
  return (
    <div style={S.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          style={S.starBtn}
          onMouseEnter={() => onHover(n)}
          onMouseLeave={() => onHover(0)}
          onClick={() => onSelect(n)}
        >
          <svg width="32" height="32" viewBox="0 0 24 24">
            <polygon
              points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              fill={n <= display ? '#C4956F' : 'none'}
              stroke={n <= display ? '#C4956F' : '#D1E0E0'}
              strokeWidth="1.5"
            />
          </svg>
        </button>
      ))}
    </div>
  );
}

// ── Styles (matching survey-preview.html exactly) ──

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
  logoFallback: {
    width: 64, height: 64, borderRadius: '50%',
    background: 'linear-gradient(135deg, #2BA5A5 60%, #C4956F 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 28, fontWeight: 800, color: '#fff',
    margin: '0 auto 10px', letterSpacing: -1,
  },
  headerSub: { fontSize: 13, color: '#7AABAB', letterSpacing: '0.03em' },
  formWrap: { width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 14 },
  introCard: {
    background: '#E6F5F5', border: '1px solid #CCF0F0', borderRadius: 18,
    padding: '22px 24px', textAlign: 'center',
  },
  introH1: { fontSize: 17, fontWeight: 700, color: '#145454', marginBottom: 6 },
  introP: { fontSize: 13, color: '#238A8A', lineHeight: 1.55 },
  qCard: {
    background: '#fff', border: '1px solid #E0EDED', borderRadius: 18,
    padding: '20px 24px', boxShadow: '0 1px 3px rgba(43,165,165,.06)',
  },
  qLabel: { fontSize: 14, fontWeight: 600, color: '#1f2937', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 4 },
  req: { color: '#EF4444' },
  stars: { display: 'flex', gap: 6 },
  starBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 2, transition: 'transform .15s', lineHeight: 1 },
  choices: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  choiceBtn: {
    padding: '9px 18px', borderRadius: 12, border: '2px solid #E8EFEF',
    background: '#fff', color: '#4B5563', fontSize: 13, fontWeight: 500,
    cursor: 'pointer', transition: 'all .15s', fontFamily: 'inherit',
  },
  choiceBtnActive: { background: '#2BA5A5', borderColor: '#2BA5A5', color: '#fff' },
  npsWrap: { display: 'flex', flexDirection: 'column', gap: 8 },
  npsButtons: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  npsBtn: {
    width: 36, height: 36, borderRadius: 10, border: '2px solid #E8EFEF',
    background: '#fff', fontSize: 13, fontWeight: 600, color: '#4B5563',
    cursor: 'pointer', transition: 'all .15s', fontFamily: 'inherit',
  },
  npsBtnActive: { background: '#2BA5A5', borderColor: '#2BA5A5', color: '#fff', transform: 'scale(1.08)' },
  npsLabels: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9CA3AF', padding: '0 2px' },
  textarea: {
    width: '100%', padding: '12px 14px', border: '1px solid #E0EDED', borderRadius: 12,
    fontSize: 13, fontFamily: 'inherit', color: '#374151', resize: 'none', outline: 'none',
    transition: 'border-color .15s, box-shadow .15s', background: '#fff',
  },
  submitBtn: {
    width: '100%', padding: 14, background: '#2BA5A5', color: '#fff',
    fontSize: 15, fontWeight: 700, border: 'none', borderRadius: 14,
    cursor: 'pointer', transition: 'background .15s, transform .1s',
    fontFamily: 'inherit', letterSpacing: '0.01em',
  },
  anonNote: { textAlign: 'center', fontSize: 11, color: '#9CA3AF', paddingBottom: 8 },
  successCard: {
    background: '#fff', border: '1px solid #E0EDED', borderRadius: 20,
    padding: '48px 32px', textAlign: 'center',
    boxShadow: '0 2px 12px rgba(43,165,165,.07)',
    width: '100%', maxWidth: 480,
  },
  successIcon: {
    width: 60, height: 60, borderRadius: '50%', background: '#E6F5F5',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 18px',
  },
};
