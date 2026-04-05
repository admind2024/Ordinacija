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

const columns: { key: keyof Patient; label: string; width?: string }[] = [
  { key: 'prezime', label: 'Ime i prezime' },
  { key: 'datum_rodjenja', label: 'Datum rodj.' },
  { key: 'telefon', label: 'Telefon' },
  { key: 'email', label: 'Email' },
  { key: 'grad', label: 'Grad' },
  { key: 'saldo', label: 'Saldo' },
  { key: 'tagovi', label: 'Tagovi' },
];

export default function PatientList({ onSelect, onNew }: PatientListProps) {
  const { searchQuery, setSearchQuery, filteredPatients, sortField, sortDir, setSort } = usePatients();
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(filteredPatients.length / PAGE_SIZE);
  const pagePatients = filteredPatients.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function renderSortIcon(field: keyof Patient) {
    if (sortField !== field) return null;
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
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Pretrazite po imenu, telefonu, emailu..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-surface"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {filteredPatients.length} pacijenata
          </span>
          <Button size="sm" onClick={onNew}>
            <Plus size={16} />
            Novi pacijent
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-border">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => setSort(col.key)}
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
              {pagePatients.map((patient) => (
                <tr
                  key={patient.id}
                  onClick={() => onSelect(patient)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium text-gray-900">
                        {patient.ime} {patient.prezime}
                      </span>
                      {patient.ime_roditelja && (
                        <p className="text-xs text-gray-400">Roditelj: {patient.ime_roditelja}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {patient.datum_rodjenja
                      ? new Date(patient.datum_rodjenja).toLocaleDateString('sr-Latn-ME')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{patient.telefon}</td>
                  <td className="px-4 py-3 text-gray-600">{patient.email || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{patient.grad || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-medium ${
                        patient.saldo < 0
                          ? 'text-red-600'
                          : patient.saldo > 0
                            ? 'text-green-600'
                            : 'text-gray-500'
                      }`}
                    >
                      {patient.saldo !== 0 ? `${patient.saldo > 0 ? '+' : ''}${patient.saldo} EUR` : '0'}
                    </span>
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
              ))}
              {pagePatients.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Nema pacijenata koji odgovaraju pretrazi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginacija */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-gray-50">
            <span className="text-xs text-gray-500">
              Prikazano {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filteredPatients.length)} od {filteredPatients.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 text-gray-500 hover:bg-gray-200 rounded disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`w-8 h-8 text-xs rounded ${
                    page === i ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="p-1.5 text-gray-500 hover:bg-gray-200 rounded disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
