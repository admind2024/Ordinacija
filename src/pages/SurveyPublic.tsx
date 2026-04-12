import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * Public survey page — /anketa/:id
 * Dizajn baziran na survey-preview.html (brand MOA paleta).
 */

interface SurveyQuestion {
  id: string;
  text: string;
  type: 'stars' | 'choice' | 'nps' | 'text' | 'rating' | 'yesno';
  required?: boolean;
  options?: string[];
}

interface Survey {
  id: string;
  naziv: string;
  opis: string | null;
  pitanja: SurveyQuestion[];
  aktivan: boolean;
}

export default function SurveyPublic() {
  const { id } = useParams<{ id: string }>();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from('surveys')
        .select('id, naziv, opis, pitanja, aktivan')
        .eq('id', id)
        .maybeSingle();
      if (!data || !data.aktivan) setNotFound(true);
      else setSurvey(data as Survey);
      setLoading(false);
    })();
  }, [id]);

  function setAnswer(qid: string, value: any) {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }

  async function handleSubmit() {
    if (!survey) return;
    setSubmitting(true);
    await supabase.from('survey_responses').insert({
      survey_id: survey.id,
      odgovori: answers,
    });
    setSubmitting(false);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const allRequired = survey
    ? survey.pitanja
        .filter((q) => q.required)
        .every((q) => answers[q.id] != null && answers[q.id] !== '')
    : false;

  // ── LOADING ──
  if (loading) {
    return (
      <Page>
        <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>Ucitavanje ankete...</p>
      </Page>
    );
  }

  // ── NOT FOUND ──
  if (notFound) {
    return (
      <Page>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Anketa nije dostupna</h1>
          <p style={{ fontSize: 13, color: '#6B7280' }}>Ova anketa ne postoji ili je deaktivirana.</p>
        </div>
      </Page>
    );
  }

  // ── SUCCESS ──
  if (submitted) {
    return (
      <Page>
        <div style={{
          background: '#fff', border: '1px solid #E0EDED', borderRadius: 20,
          padding: '48px 32px', textAlign: 'center',
          boxShadow: '0 2px 12px rgba(43,165,165,.07)',
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%', background: '#E6F5F5',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2BA5A5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Hvala vam!</h2>
          <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>
            Vasi odgovori su anonimni i pomazu nam<br />da svaki dan budemo bolji.
          </p>
        </div>
      </Page>
    );
  }

  // ── SURVEY FORM ──
  return (
    <Page>
      {/* Intro card */}
      <div style={{
        background: '#E6F5F5', border: '1px solid #CCF0F0', borderRadius: 18,
        padding: '22px 24px', textAlign: 'center', marginBottom: 14,
      }}>
        <h1 style={{ fontSize: 17, fontWeight: 700, color: '#145454', marginBottom: 6 }}>
          {survey!.naziv}
        </h1>
        {survey!.opis && (
          <p style={{ fontSize: 13, color: '#238A8A', lineHeight: 1.55 }}>{survey!.opis}</p>
        )}
      </div>

      {/* Questions */}
      {survey!.pitanja.map((q) => (
        <div key={q.id} style={{
          background: '#fff', border: '1px solid #E0EDED', borderRadius: 18,
          padding: '20px 24px', marginBottom: 14,
          boxShadow: '0 1px 3px rgba(43,165,165,.06)',
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2937', marginBottom: 14, display: 'flex', gap: 4 }}>
            {q.text}
            {q.required && <span style={{ color: '#EF4444' }}>*</span>}
          </div>

          {/* Stars (1-5) */}
          {q.type === 'stars' && (
            <div style={{ display: 'flex', gap: 6 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setAnswer(q.id, n)}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, transition: 'transform .15s' }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24">
                    <polygon
                      points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                      fill={n <= (answers[q.id] || 0) ? '#C4956F' : 'none'}
                      stroke={n <= (answers[q.id] || 0) ? '#C4956F' : '#D1E0E0'}
                      strokeWidth="1.5"
                    />
                  </svg>
                </button>
              ))}
            </div>
          )}

          {/* Choice buttons */}
          {q.type === 'choice' && q.options && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {q.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAnswer(q.id, opt)}
                  style={{
                    padding: '9px 18px', borderRadius: 12, fontSize: 13, fontWeight: 500,
                    cursor: 'pointer', transition: 'all .15s', fontFamily: 'inherit',
                    border: `2px solid ${answers[q.id] === opt ? '#2BA5A5' : '#E8EFEF'}`,
                    background: answers[q.id] === opt ? '#2BA5A5' : '#fff',
                    color: answers[q.id] === opt ? '#fff' : '#4B5563',
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* NPS (1-10) */}
          {q.type === 'nps' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setAnswer(q.id, n)}
                    style={{
                      width: 36, height: 36, borderRadius: 10, fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', transition: 'all .15s', fontFamily: 'inherit',
                      border: `2px solid ${answers[q.id] === n ? '#2BA5A5' : '#E8EFEF'}`,
                      background: answers[q.id] === n ? '#2BA5A5' : '#fff',
                      color: answers[q.id] === n ? '#fff' : '#4B5563',
                      transform: answers[q.id] === n ? 'scale(1.08)' : 'scale(1)',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9CA3AF', padding: '0 2px' }}>
                <span>Sigurno ne</span>
                <span>Definitivno da</span>
              </div>
            </div>
          )}

          {/* Rating (1-10 buttons, legacy) */}
          {q.type === 'rating' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setAnswer(q.id, n)}
                  style={{
                    width: 36, height: 36, borderRadius: 10, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                    border: `2px solid ${answers[q.id] === n ? '#2BA5A5' : '#E8EFEF'}`,
                    background: answers[q.id] === n ? '#2BA5A5' : '#fff',
                    color: answers[q.id] === n ? '#fff' : '#4B5563',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          )}

          {/* Yes/No */}
          {q.type === 'yesno' && (
            <div style={{ display: 'flex', gap: 8 }}>
              {['Da', 'Ne'].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAnswer(q.id, v.toLowerCase())}
                  style={{
                    flex: 1, padding: '9px 18px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                    border: `2px solid ${answers[q.id] === v.toLowerCase() ? '#2BA5A5' : '#E8EFEF'}`,
                    background: answers[q.id] === v.toLowerCase() ? '#2BA5A5' : '#fff',
                    color: answers[q.id] === v.toLowerCase() ? '#fff' : '#4B5563',
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          )}

          {/* Text */}
          {q.type === 'text' && (
            <textarea
              value={answers[q.id] || ''}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              rows={3}
              placeholder="Mozete napisati sta vam se posebno svidjelo ili sta bismo mogli poboljsati..."
              style={{
                width: '100%', padding: '12px 14px', border: '1px solid #E0EDED', borderRadius: 12,
                fontSize: 13, fontFamily: 'inherit', color: '#374151', resize: 'none', outline: 'none',
                background: '#fff',
              }}
            />
          )}
        </div>
      ))}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!allRequired || submitting}
        style={{
          width: '100%', padding: 14, background: allRequired ? '#2BA5A5' : '#B8D4D4',
          color: '#fff', fontSize: 15, fontWeight: 700, border: 'none', borderRadius: 14,
          cursor: allRequired ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
          transition: 'background .15s', letterSpacing: '0.01em',
          opacity: submitting ? 0.6 : 1,
        }}
      >
        {submitting ? 'Slanje...' : 'Posalji odgovore'}
      </button>

      <p style={{ textAlign: 'center', fontSize: 11, color: '#9CA3AF', padding: '14px 0 8px' }}>
        Vasi odgovori su anonimni i koriste se iskljucivo za unaprijedjenje usluge.
      </p>
    </Page>
  );
}

/** Page wrapper — matches survey-preview.html body styling */
function Page({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      background: '#F7FAFA', color: '#111827',
      minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '40px 16px 60px',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'linear-gradient(135deg, #2BA5A5 60%, #C4956F 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 800, color: '#fff', margin: '0 auto 10px',
          letterSpacing: -1,
        }}>
          M
        </div>
        <p style={{ fontSize: 13, color: '#7AABAB', letterSpacing: '0.03em' }}>Ministry of Aesthetics</p>
      </div>

      {/* Content */}
      <div style={{ width: '100%', maxWidth: 480 }}>
        {children}
      </div>
    </div>
  );
}
