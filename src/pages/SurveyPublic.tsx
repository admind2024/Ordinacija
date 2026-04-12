import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * Public survey page — accessible without login at /anketa/:id
 * Pacijent popunjava anketu i šalje odgovore.
 */

interface SurveyQuestion {
  id: string;
  text: string;
  type: 'rating' | 'text' | 'yesno';
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
  const [ime, setIme] = useState('');
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

      if (!data || !data.aktivan) {
        setNotFound(true);
      } else {
        setSurvey(data as Survey);
      }
      setLoading(false);
    })();
  }, [id]);

  function setAnswer(questionId: string, value: any) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit() {
    if (!survey) return;
    setSubmitting(true);

    await supabase.from('survey_responses').insert({
      survey_id: survey.id,
      patient_ime: ime.trim() || null,
      odgovori: answers,
    });

    setSubmitting(false);
    setSubmitted(true);
  }

  const allAnswered = survey
    ? survey.pitanja.every((q) => {
        const a = answers[q.id];
        if (q.type === 'text') return true; // text je opcioni
        return a != null && a !== '';
      })
    : false;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Ucitavanje ankete...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <p className="text-6xl mb-4">📋</p>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Anketa nije dostupna</h1>
          <p className="text-sm text-gray-500">Ova anketa ne postoji ili je deaktivirana.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={36} className="text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Hvala vam!</h1>
          <p className="text-sm text-gray-500">Vasi odgovori su uspjesno poslati. Cijenimo vase vrijeme.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Star size={24} className="text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{survey!.naziv}</h1>
          {survey!.opis && (
            <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">{survey!.opis}</p>
          )}
        </div>

        {/* Ime (opciono) */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Vase ime (opciono)</label>
          <input
            type="text"
            value={ime}
            onChange={(e) => setIme(e.target.value)}
            placeholder="Ime i prezime"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Pitanja */}
        <div className="space-y-4">
          {survey!.pitanja.map((q, i) => (
            <div key={q.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-900 mb-4">
                <span className="text-primary-600 mr-1.5">{i + 1}.</span>
                {q.text}
              </p>

              {q.type === 'rating' && (
                <div className="flex gap-1.5 flex-wrap">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setAnswer(q.id, n)}
                      className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                        answers[q.id] === n
                          ? 'bg-primary-600 text-white shadow-md scale-110'
                          : answers[q.id] && answers[q.id] >= n
                            ? 'bg-primary-100 text-primary-700 border border-primary-200'
                            : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-300'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}

              {q.type === 'yesno' && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setAnswer(q.id, 'da')}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
                      answers[q.id] === 'da'
                        ? 'bg-primary-600 text-white shadow-md'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-primary-50 hover:text-primary-700'
                    }`}
                  >
                    Da
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnswer(q.id, 'ne')}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
                      answers[q.id] === 'ne'
                        ? 'bg-gray-700 text-white shadow-md'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    Ne
                  </button>
                </div>
              )}

              {q.type === 'text' && (
                <textarea
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  rows={3}
                  placeholder="Vaš odgovor..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                />
              )}
            </div>
          ))}
        </div>

        {/* Submit */}
        <div className="mt-6">
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-600/20"
          >
            {submitting ? 'Slanje...' : 'Posalji odgovore'}
          </button>
          {!allAnswered && (
            <p className="text-xs text-gray-400 text-center mt-2">Odgovorite na sva pitanja prije slanja</p>
          )}
        </div>

        {/* Footer */}
        <p className="text-[10px] text-gray-300 text-center mt-8">
          Ministry of Aesthetics · Anketa zadovoljstva
        </p>
      </div>
    </div>
  );
}
