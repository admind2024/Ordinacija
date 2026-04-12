import { useState, useEffect, useMemo } from 'react';
import { ClipboardCheck, Plus, Eye, Trash2, Copy, BarChart3, Star } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { supabase } from '../lib/supabase';

/**
 * Anketa (Survey) modul — kreiranje i pregled anketa za pacijente.
 *
 * Tabele (kreirace se migracija):
 *   surveys:          id, naziv, opis, pitanja (JSONB), aktivan, created_at
 *   survey_responses: id, survey_id, patient_id, patient_ime, odgovori (JSONB), created_at
 */

type SurveyTab = 'liste' | 'odgovori';

interface SurveyQuestion {
  id: string;
  text: string;
  type: 'rating' | 'text' | 'yesno' | 'stars' | 'choice' | 'nps';
  options?: string[];
  required?: boolean;
}

interface Survey {
  id: string;
  naziv: string;
  opis: string | null;
  pitanja: SurveyQuestion[];
  aktivan: boolean;
  created_at: string;
}

interface SurveyResponse {
  id: string;
  survey_id: string;
  patient_ime: string | null;
  odgovori: Record<string, any>;
  created_at: string;
}

export default function SurveyPage() {
  const [tab, setTab] = useState<SurveyTab>('liste');
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // Create/Edit form
  const [formOpen, setFormOpen] = useState(false);
  const [editSurvey, setEditSurvey] = useState<Survey | null>(null);
  const [formNaziv, setFormNaziv] = useState('');
  const [formOpis, setFormOpis] = useState('');
  const [formPitanja, setFormPitanja] = useState<SurveyQuestion[]>([]);
  const [saving, setSaving] = useState(false);

  // Preview
  const [previewSurvey, setPreviewSurvey] = useState<Survey | null>(null);

  // Selected survey for responses
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: s }, { data: r }] = await Promise.all([
      supabase.from('surveys').select('*').order('created_at', { ascending: false }),
      supabase.from('survey_responses').select('*').order('created_at', { ascending: false }),
    ]);
    setSurveys((s || []) as Survey[]);
    setResponses((r || []) as SurveyResponse[]);
    setLoading(false);
  }

  function openCreate() {
    setEditSurvey(null);
    setFormNaziv('');
    setFormOpis('');
    setFormPitanja([
      { id: crypto.randomUUID(), text: 'Kako ocjenjujete nas tretman? (1-10)', type: 'rating' },
      { id: crypto.randomUUID(), text: 'Da li biste preporucili nasu kliniku?', type: 'yesno' },
      { id: crypto.randomUUID(), text: 'Vas komentar / sugestija:', type: 'text' },
    ]);
    setFormOpen(true);
  }

  function openEdit(survey: Survey) {
    setEditSurvey(survey);
    setFormNaziv(survey.naziv);
    setFormOpis(survey.opis || '');
    setFormPitanja(survey.pitanja || []);
    setFormOpen(true);
  }

  function addQuestion(type: SurveyQuestion['type']) {
    const defaults: Record<string, string> = {
      rating: 'Ocijenite nas od 1 do 5:',
      text: 'Vas komentar:',
      yesno: 'Da li ste zadovoljni tretmanom?',
    };
    setFormPitanja((prev) => [...prev, { id: crypto.randomUUID(), text: defaults[type], type }]);
  }

  function updateQuestion(id: string, text: string) {
    setFormPitanja((prev) => prev.map((q) => (q.id === id ? { ...q, text } : q)));
  }

  function removeQuestion(id: string) {
    setFormPitanja((prev) => prev.filter((q) => q.id !== id));
  }

  async function handleSave() {
    if (!formNaziv || formPitanja.length === 0) return;
    setSaving(true);

    const payload = {
      naziv: formNaziv,
      opis: formOpis || null,
      pitanja: formPitanja,
      aktivan: true,
    };

    if (editSurvey) {
      await supabase.from('surveys').update(payload).eq('id', editSurvey.id);
    } else {
      await supabase.from('surveys').insert(payload);
    }

    setSaving(false);
    setFormOpen(false);
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm('Obrisati anketu i sve njene odgovore?')) return;
    await supabase.from('survey_responses').delete().eq('survey_id', id);
    await supabase.from('surveys').delete().eq('id', id);
    loadData();
  }

  async function toggleActive(survey: Survey) {
    await supabase.from('surveys').update({ aktivan: !survey.aktivan }).eq('id', survey.id);
    setSurveys((prev) => prev.map((s) => (s.id === survey.id ? { ...s, aktivan: !s.aktivan } : s)));
  }

  function getSurveyLink(survey: Survey) {
    return `${window.location.origin}/anketa/${survey.id}`;
  }

  function copyLink(survey: Survey) {
    navigator.clipboard.writeText(getSurveyLink(survey));
  }

  function openLink(survey: Survey) {
    window.open(getSurveyLink(survey), '_blank');
  }

  const filteredResponses = useMemo(() => {
    if (selectedSurveyId === 'all') return responses;
    return responses.filter((r) => r.survey_id === selectedSurveyId);
  }, [responses, selectedSurveyId]);

  // Statistika za odabrani survey
  const responseStats = useMemo(() => {
    if (filteredResponses.length === 0) return null;
    const survey = surveys.find((s) => s.id === selectedSurveyId);
    if (!survey) return null;

    const questionStats = survey.pitanja.map((q) => {
      const answers = filteredResponses
        .map((r) => r.odgovori[q.id])
        .filter((a) => a != null);

      // Stars (1-5) ili Rating (1-10) ili NPS (1-10) — numeric average
      if (q.type === 'stars' || q.type === 'rating' || q.type === 'nps') {
        const nums = answers.map(Number).filter((n) => !isNaN(n));
        const avg = nums.length > 0 ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
        const max = q.type === 'stars' ? 5 : 10;
        return { question: q.text, type: q.type, avg: avg.toFixed(1), max, count: nums.length };
      }
      // Choice — breakdown po opcijama
      if (q.type === 'choice') {
        const breakdown: Record<string, number> = {};
        for (const a of answers) {
          const key = String(a);
          breakdown[key] = (breakdown[key] || 0) + 1;
        }
        return { question: q.text, type: q.type, breakdown, count: answers.length };
      }
      // YesNo
      if (q.type === 'yesno') {
        const da = answers.filter((a) => a === 'da' || a === true).length;
        const ne = answers.filter((a) => a === 'ne' || a === false).length;
        return { question: q.text, type: q.type, da, ne, count: answers.length };
      }
      // Text
      return { question: q.text, type: q.type, count: answers.length, answers };
    });

    return { total: filteredResponses.length, questionStats };
  }, [filteredResponses, surveys, selectedSurveyId]);

  const typeLabels: Record<string, string> = {
    rating: 'Ocjena (1-10)',
    text: 'Slobodan tekst',
    yesno: 'Da / Ne',
  };

  return (
    <div>
      <div className="flex items-center justify-end mb-6">
        <Button onClick={openCreate}><Plus size={16} /> Nova anketa</Button>
      </div>

      {/* Tabovi */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit mb-6">
        {([
          { key: 'liste' as const, label: 'Ankete', icon: ClipboardCheck },
          { key: 'odgovori' as const, label: 'Odgovori', icon: BarChart3 },
        ]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2
              ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <t.icon size={14} /> {t.label}
            {t.key === 'odgovori' && responses.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded-full font-semibold">{responses.length}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400 text-sm">Ucitavanje...</div>
      ) : tab === 'liste' ? (
        /* ====== LISTE ANKETA ====== */
        surveys.length === 0 ? (
          <div className="text-center py-20">
            <ClipboardCheck size={48} className="mx-auto mb-4 text-gray-200" />
            <p className="text-gray-400 font-medium">Nema kreiranih anketa</p>
            <p className="text-sm text-gray-300 mt-1">Kliknite "Nova anketa" da kreirate prvu</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {surveys.map((s) => {
              const rCount = responses.filter((r) => r.survey_id === s.id).length;
              return (
                <div key={s.id} className="bg-white border border-border rounded-xl p-5 flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{s.naziv}</h3>
                      {s.opis && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{s.opis}</p>}
                    </div>
                    <span className={`shrink-0 ml-2 text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      s.aktivan ? 'bg-primary-50 text-primary-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {s.aktivan ? 'Aktivna' : 'Neaktivna'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                    <span>{s.pitanja.length} pitanja</span>
                    <span>·</span>
                    <span>{rCount} odgovora</span>
                    <span>·</span>
                    <span>{new Date(s.created_at).toLocaleDateString('sr-Latn-ME')}</span>
                  </div>

                  <div className="mt-auto flex items-center gap-2 pt-3 border-t border-border flex-wrap">
                    <button onClick={() => setPreviewSurvey(s)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                      <Eye size={12} /> Pregled
                    </button>
                    <button onClick={() => openLink(s)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-primary-200 text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors">
                      <Eye size={12} /> Otvori
                    </button>
                    <button onClick={() => copyLink(s)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                      <Copy size={12} /> Link
                    </button>
                    <button onClick={() => openEdit(s)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                      Izmijeni
                    </button>
                    <button onClick={() => toggleActive(s)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                      {s.aktivan ? 'Deaktiviraj' : 'Aktiviraj'}
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="ml-auto flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* ====== ODGOVORI ====== */
        <div className="space-y-6">
          {/* Filter */}
          <div className="flex items-center gap-3">
            <select value={selectedSurveyId} onChange={(e) => setSelectedSurveyId(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="all">Sve ankete</option>
              {surveys.map((s) => <option key={s.id} value={s.id}>{s.naziv}</option>)}
            </select>
            <span className="text-sm text-gray-500">{filteredResponses.length} odgovora</span>
          </div>

          {/* Statistika za selektovani survey */}
          {responseStats && (
            <Card>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Statistika ({responseStats.total} odgovora)
              </h3>
              <div className="space-y-3">
                {responseStats.questionStats.map((qs: any, i: number) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-900 mb-1.5">{qs.question}</p>

                    {/* Stars (1-5) / Rating (1-10) / NPS (1-10) — prosjek */}
                    {(qs.type === 'stars' || qs.type === 'rating' || qs.type === 'nps') && (
                      <div className="flex items-center gap-2">
                        <Star size={16} className="text-accent-500" />
                        <span className="text-lg font-bold text-gray-900">{qs.avg}</span>
                        <span className="text-xs text-gray-500">/ {qs.max} ({qs.count} ocjena)</span>
                        {/* Progress bar */}
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[120px]">
                          <div
                            className="bg-accent-500 h-2 rounded-full"
                            style={{ width: `${(Number(qs.avg) / qs.max) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Choice — breakdown */}
                    {qs.type === 'choice' && qs.breakdown && (
                      <div className="space-y-1">
                        {Object.entries(qs.breakdown as Record<string, number>).map(([opt, cnt]) => (
                          <div key={opt} className="flex items-center gap-2 text-sm">
                            <span className="text-gray-700 min-w-[100px]">{opt}</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[150px]">
                              <div
                                className="bg-primary-500 h-2 rounded-full"
                                style={{ width: `${qs.count > 0 ? ((cnt as number) / qs.count) * 100 : 0}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 font-semibold">{cnt as number}</span>
                          </div>
                        ))}
                        <span className="text-xs text-gray-400">({qs.count} odg.)</span>
                      </div>
                    )}

                    {/* YesNo */}
                    {qs.type === 'yesno' && (
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-primary-700 font-semibold">Da: {qs.da}</span>
                        <span className="text-gray-500 font-semibold">Ne: {qs.ne}</span>
                        <span className="text-xs text-gray-400">({qs.count} odg.)</span>
                      </div>
                    )}

                    {/* Text — prikaži odgovore */}
                    {qs.type === 'text' && (
                      <div>
                        <span className="text-xs text-gray-500">{qs.count} odgovora</span>
                        {qs.answers && qs.answers.length > 0 && (
                          <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                            {(qs.answers as string[]).filter(Boolean).map((a: string, j: number) => (
                              <p key={j} className="text-xs text-gray-600 bg-white rounded px-2 py-1 border border-gray-100">
                                "{a}"
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Lista odgovora */}
          {filteredResponses.length === 0 ? (
            <div className="text-center py-16">
              <BarChart3 size={40} className="mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400 text-sm">Nema primljenih odgovora</p>
            </div>
          ) : (
            <Card padding={false}>
              <div className="px-6 py-4 border-b border-border bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Odgovori</h3>
              </div>
              <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                {filteredResponses.map((r) => {
                  const survey = surveys.find((s) => s.id === r.survey_id);
                  return (
                    <div key={r.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{r.patient_ime || 'Anonimno'}</span>
                          {survey && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 font-medium">{survey.naziv}</span>}
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(r.created_at).toLocaleString('sr-Latn-ME', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        {survey?.pitanja.map((q) => {
                          const answer = r.odgovori[q.id];
                          if (answer == null) return null;
                          return (
                            <div key={q.id} className="flex gap-2">
                              <span className="text-gray-400 shrink-0 w-40 truncate">{q.text}</span>
                              <span className="text-gray-900 font-medium">
                                {q.type === 'stars' ? `${'★'.repeat(Number(answer))}${'☆'.repeat(5 - Number(answer))}` :
                                 q.type === 'nps' || q.type === 'rating' ? `${answer}/10` :
                                 String(answer)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Kreiranje / Izmjena ankete */}
      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editSurvey ? 'Izmijeni anketu' : 'Nova anketa'} size="lg">
        <div className="space-y-4">
          <Input label="Naziv ankete *" value={formNaziv} onChange={(e) => setFormNaziv(e.target.value)} placeholder="npr. Anketa zadovoljstva" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Opis (opciono)</label>
            <textarea value={formOpis} onChange={(e) => setFormOpis(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Kratki opis ankete..." />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">Pitanja ({formPitanja.length})</label>
              <div className="flex gap-1">
                <button onClick={() => addQuestion('rating')} className="px-2 py-1 text-[10px] font-medium rounded bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100">+ Ocjena</button>
                <button onClick={() => addQuestion('yesno')} className="px-2 py-1 text-[10px] font-medium rounded bg-primary-50 text-primary-700 border border-primary-100 hover:bg-primary-100">+ Da/Ne</button>
                <button onClick={() => addQuestion('text')} className="px-2 py-1 text-[10px] font-medium rounded bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100">+ Tekst</button>
              </div>
            </div>
            <div className="space-y-2">
              {formPitanja.map((q, i) => (
                <div key={q.id} className="flex items-start gap-2 bg-gray-50 rounded-lg p-3">
                  <span className="text-xs font-bold text-gray-400 mt-2 w-5 shrink-0">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <input value={q.text} onChange={(e) => updateQuestion(q.id, e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500" />
                    <span className="text-[10px] text-gray-400 mt-0.5 inline-block">{typeLabels[q.type]}</span>
                  </div>
                  <button onClick={() => removeQuestion(q.id)} className="text-gray-400 hover:text-red-500 mt-1.5 shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="secondary" onClick={() => setFormOpen(false)}>Otkazi</Button>
            <Button onClick={handleSave} disabled={!formNaziv || formPitanja.length === 0 || saving}>
              {saving ? 'Sacuvavanje...' : editSurvey ? 'Sacuvaj' : 'Kreiraj anketu'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Preview */}
      {previewSurvey && (
        <Modal isOpen onClose={() => setPreviewSurvey(null)} title={`Pregled: ${previewSurvey.naziv}`} size="md">
          <div className="space-y-4">
            {previewSurvey.opis && <p className="text-sm text-gray-600">{previewSurvey.opis}</p>}
            {previewSurvey.pitanja.map((q, i) => (
              <div key={q.id} className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-900 mb-2">{i + 1}. {q.text}</p>
                {q.type === 'rating' && (
                  <div className="flex gap-1 flex-wrap">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <button key={n} className="w-8 h-8 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-500 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-300 transition-colors">
                        {n}
                      </button>
                    ))}
                  </div>
                )}
                {q.type === 'yesno' && (
                  <div className="flex gap-2">
                    <button className="px-6 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-primary-50 hover:text-primary-700 transition-colors">Da</button>
                    <button className="px-6 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">Ne</button>
                  </div>
                )}
                {q.type === 'text' && (
                  <textarea disabled rows={2} placeholder="Odgovor pacijenta..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                )}
              </div>
            ))}
            <div className="flex items-center gap-2 pt-3 border-t border-border">
              <button onClick={() => copyLink(previewSurvey)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors">
                <Copy size={12} /> Kopiraj link za pacijente
              </button>
              <span className="text-[11px] text-gray-400 truncate">{getSurveyLink(previewSurvey)}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
