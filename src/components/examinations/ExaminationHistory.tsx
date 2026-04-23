import { useState } from 'react';
import { ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { Examination, Doctor } from '../../types';

interface ExaminationHistoryProps {
  examinations: Examination[];
  doctors: Doctor[];
}

export default function ExaminationHistory({ examinations, doctors }: ExaminationHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (examinations.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400">
        <FileText size={32} className="mx-auto mb-2" />
        <p className="text-sm">Nema prethodnih pregleda</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {examinations.map((exam) => {
        const isExpanded = expandedId === exam.id;
        const doctor = doctors.find((d) => d.id === exam.doctor_id);
        const datumStr = exam.datum
          ? format(parseISO(exam.datum), 'dd.MM.yyyy.')
          : '';

        return (
          <div key={exam.id} className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedId(isExpanded ? null : exam.id)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <div>
                  <p className="text-sm font-medium text-gray-900">{datumStr}</p>
                  <p className="text-xs text-gray-500">
                    {doctor ? `${doctor.titula || ''} ${doctor.ime} ${doctor.prezime}`.trim() : ''}
                    {exam.razlog_dolaska ? ` — ${exam.razlog_dolaska.slice(0, 60)}${exam.razlog_dolaska.length > 60 ? '...' : ''}` : ''}
                  </p>
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                exam.status === 'zavrsen' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {exam.status === 'zavrsen' ? 'Zavrsen' : 'Draft'}
              </span>
            </button>

            {isExpanded && (
              <div className="px-4 py-3 space-y-3 text-sm">
                {exam.razlog_dolaska && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Razlog dolaska</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{exam.razlog_dolaska}</p>
                  </div>
                )}
                {exam.nalaz && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Klinicki nalaz</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{exam.nalaz}</p>
                  </div>
                )}
                {exam.rezultati && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Rezultati (lab. i RTG)</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{exam.rezultati}</p>
                  </div>
                )}
                {exam.terapija && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Terapija</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{exam.terapija}</p>
                  </div>
                )}
                {exam.preporuke && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Preporuke</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{exam.preporuke}</p>
                  </div>
                )}
                {exam.kontrolni_pregled && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Kontrolni pregled</p>
                    <p className="text-gray-700">{exam.kontrolni_pregled}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
