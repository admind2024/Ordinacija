import { useState } from 'react';
import { Search, Plus, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePatients } from '../../contexts/PatientsContext';
import Button from '../ui/Button';
import type { Patient } from '../../types';

interface PatientListProps {
  onSelect: (patient: Patient) => void;
  onNew: () => void;
}

const PAGE_SIZE = 15;

const columns: { key: keyof Patient | 'dug'; label: string; width?: string }[] = [
  { key: 'prezime', label: 'Ime i prezime' },
  { key: 'datum_rodjenja', label: 'Datum rodj.' },
  { key: 'telefon', label: 'Telefon' },
  { key: 'grad', label: 'Grad' },
  { key: 'dug', label: 'Dugovanje' },
  { key: 'tagovi', label: 'Tagovi' },
];

export default function PatientList({ onSelect, onNew }: PatientListProps) {
  const { searchQuery, setSearchQuery, filteredPatients, sortField, sortDir, setSort, debtsByPatient } = usePatients();
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(filteredPatients.length / PAGE_SIZE);
  const pagePatients = filteredPatients.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function renderSortIcon(field: keyof Patient | 'dug') {
    if (sortField !== (field as any)) return null;
    return sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  }

  const tagColors: Record<string, string> = {
    VIP: 'bg-amber-100 text-amber-700',
    Redovan: 'bg-green-100 text-green-700',
    Djeca: 'bg-blue-100 text-blue-700',
    Problematican: 'bg-red-100 text-red-700',
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 md:gap-4 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-0 md:max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Pretrazi..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            className="w-full pl-10 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-surface"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden md:inline text-sm text-gray-500">
            {filteredPatients.length} pacijenata
          </span>
          <Button size="sm" onClick={onNew}>
            <Plus size={16} />
            <span className="hidden sm:inline">Novi pacijent</span>
            <span className="sm:hidden">Novi</span>
          </Button>
        </div>
      </div>

      <p className="md:hidden text-xs text-gray-500 mb-2">{filteredPatients.length} pacijenata</p>

      {/* ====== MOBILE: card-rows ====== */}
      <div className="md:hidden space-y-2">
        {pagePatients.map((patient) => {
          const dug = debtsByPatient.get(patient.id) || 0;
          const initials = `${patient.ime?.[0] || ''}${patient.prezime?.[0] || ''}`.toUpperCase();
          return (
            <button
              key={patient.id}
              onClick={() => onSelect(patient)}
              className="w-full text-left bg-surface border border-border rounded-xl p-3 flex items-center gap-3 active:bg-primary-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold shrink-0">
                {initials || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm text-gray-900 truncate">
                    {patient.ime} {patient.prezime}
                  </p>
                  {dug > 0 && (
                    <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 font-semibold text-[10px]">
                      {dug.toFixed(0)}€
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 font-mono truncate">{patient.telefon || '—'}</p>
                {patient.tagovi.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-1">
                    {patient.tagovi.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${tagColors[tag] || 'bg-gray-100 text-gray-600'}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <ChevronRight size={18} className="text-gray-300 shrink-0" />
            </button>
          );
        })}
        {pagePatients.length === 0 && (
          <p className="text-center py-8 text-sm text-gray-400">Nema pacijenata</p>
        )}
      </div>

      {/* ====== DESKTOP: tabela ====== */}
      <div className="hidden md:block bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-border">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => col.key !== 'dug' && setSort(col.key as keyof Patient)}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {renderSortIcon(col.key)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pagePatients.map((patient) => {
                const dug = debtsByPatient.get(patient.id) || 0;
                const initials = `${patient.ime?.[0] || ''}${patient.prezime?.[0] || ''}`.toUpperCase();
                return (
                  <tr
                    key={patient.id}
                    onClick={() => onSelect(patient)}
                    className="hover:bg-primary-50/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold shrink-0">
                          {initials || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {patient.ime} {patient.prezime}
                          </p>
                          {patient.email ? (
                            <p className="text-[11px] text-gray-400 truncate">{patient.email}</p>
                          ) : patient.ime_roditelja ? (
                            <p className="text-[11px] text-gray-400 truncate">Roditelj: {patient.ime_roditelja}</p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {patient.datum_rodjenja
                        ? new Date(patient.datum_rodjenja).toLocaleDateString('sr-Latn-ME')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap font-mono text-xs">{patient.telefon}</td>
                    <td className="px-4 py-3 text-gray-600">{patient.grad || '—'}</td>
                    <td className="px-4 py-3">
                      {dug > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-semibold text-xs">
                          {dug.toFixed(2)} €
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {patient.tagovi.map((tag) => (
                          <span
                            key={tag}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${tagColors[tag] || 'bg-gray-100 text-gray-600'}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pagePatients.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Nema pacijenata koji odgovaraju pretrazi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Paginacija — unified mobile + desktop */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-3 md:px-4 py-2 md:py-3 border border-border rounded-xl bg-gray-50">
          <span className="text-[11px] md:text-xs text-gray-500">
            {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filteredPatients.length)} / {filteredPatients.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-2 text-gray-500 hover:bg-gray-200 rounded disabled:opacity-30"
              aria-label="Prethodna"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-medium text-gray-700 px-2 tabular-nums">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="p-2 text-gray-500 hover:bg-gray-200 rounded disabled:opacity-30"
              aria-label="Sljedeca"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
