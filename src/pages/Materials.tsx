import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Package, BarChart3, Search, Loader2, Save, Printer, Download } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { useCalendar } from '../contexts/CalendarContext';
import { usePatients } from '../contexts/PatientsContext';
import { supabase } from '../lib/supabase';
import { exportToExcel, printToPdf, type ReportExport } from '../lib/exportReport';
import type { Material } from '../types';

type MatTab = 'katalog' | 'izvjestaj';

interface UsageRow {
  id: string;
  datum: string;
  kolicina: number;
  material_naziv: string;
  material_jedinica: string;
  ljekar_ime: string;
  patient_ime: string;
}

export default function Materials() {
  const { materials, createMaterial, updateMaterial, deleteMaterial, doctors } = useCalendar();
  const { patients } = usePatients();
  const [tab, setTab] = useState<MatTab>('katalog');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editMat, setEditMat] = useState<Material | null>(null);

  const [naziv, setNaziv] = useState('');
  const [jedinica, setJedinica] = useState('1 ml');
  const [saving, setSaving] = useState(false);

  const [usageData, setUsageData] = useState<UsageRow[]>([]);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [filterMaterial, setFilterMaterial] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('');

  const filteredMaterials = useMemo(() => {
    if (!search) return materials;
    const q = search.toLowerCase();
    return materials.filter((m) => m.naziv.toLowerCase().includes(q));
  }, [materials, search]);

  function openForm(mat?: Material) {
    if (mat) { setEditMat(mat); setNaziv(mat.naziv); setJedinica(mat.jedinica_mjere); }
    else { setEditMat(null); setNaziv(''); setJedinica('1 ml'); }
    setFormOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!naziv) return;
    setSaving(true);
    if (editMat) await updateMaterial(editMat.id, { naziv, jedinica_mjere: jedinica });
    else await createMaterial({ naziv, jedinica_mjere: jedinica, trenutna_kolicina: 0, min_kolicina: 0, nabavna_cijena: 0 } as Omit<Material, 'id'>);
    setSaving(false);
    setFormOpen(false);
  }

  async function handleDelete(mat: Material) {
    if (!confirm(`Obrisati materijal "${mat.naziv}"?`)) return;
    await deleteMaterial(mat.id);
  }

  async function loadUsageReport() {
    setLoadingUsage(true);
    const { data } = await supabase
      .from('material_usage')
      .select('id, datum, kolicina, material_id, ljekar_id, patient_id')
      .gte('datum', dateFrom)
      .lte('datum', dateTo)
      .order('datum', { ascending: false });

    const rows: UsageRow[] = (data || []).map((u: any) => {
      const mat = materials.find((m) => m.id === u.material_id);
      const doc = doctors.find((d) => d.id === u.ljekar_id);
      const pat = patients.find((p) => p.id === u.patient_id);
      return {
        id: u.id, datum: u.datum, kolicina: Number(u.kolicina),
        material_naziv: mat?.naziv || '—', material_jedinica: mat?.jedinica_mjere || '',
        ljekar_ime: doc ? `${doc.titula || 'Dr'} ${doc.ime} ${doc.prezime}` : '—',
        patient_ime: pat ? `${pat.ime} ${pat.prezime}` : '—',
      };
    }).filter((r) => {
      if (filterMaterial && !r.material_naziv.toLowerCase().includes(filterMaterial.toLowerCase())) return false;
      if (filterDoctor && !r.ljekar_ime.toLowerCase().includes(filterDoctor.toLowerCase())) return false;
      return true;
    });

    setUsageData(rows);
    setLoadingUsage(false);
  }

  useEffect(() => { if (tab === 'izvjestaj') loadUsageReport(); }, [tab, dateFrom, dateTo, filterMaterial, filterDoctor]);

  const usageSummary = useMemo(() => {
    const map: Record<string, { naziv: string; jedinica: string; total: number; vrijednost: number }> = {};
    for (const u of usageData) {
      if (!map[u.material_naziv]) {
        const mat = materials.find((m) => m.naziv === u.material_naziv);
        map[u.material_naziv] = {
          naziv: u.material_naziv,
          jedinica: u.material_jedinica,
          total: 0,
          vrijednost: 0,
        };
        // prodji kroz sve rows for this material, compute
        void mat;
      }
      map[u.material_naziv].total += u.kolicina;
      const mat = materials.find((m) => m.naziv === u.material_naziv);
      if (mat) map[u.material_naziv].vrijednost += u.kolicina * (Number(mat.nabavna_cijena) || 0);
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [usageData, materials]);

  // ====== EXPORT (PDF + Excel) ======
  function buildExport(): ReportExport {
    const subtitle = `Period: ${dateFrom} — ${dateTo}${filterMaterial ? ` | Materijal: ${filterMaterial}` : ''}${filterDoctor ? ` | Ljekar: ${filterDoctor}` : ''}`;
    const totalVrijednost = usageSummary.reduce((s, r) => s + r.vrijednost, 0);

    return {
      title: 'Izvjestaj utroska materijala',
      subtitle,
      sheets: [
        {
          name: 'Ukupno po materijalu',
          columns: [
            { key: 'naziv',      label: 'Materijal' },
            { key: 'total',      label: 'Kolicina', format: 'number' },
            { key: 'jedinica',   label: 'Jedinica' },
            { key: 'vrijednost', label: 'Vrijednost (EUR)', format: 'currency' },
          ],
          rows: [
            ...usageSummary.map((s) => ({
              naziv: s.naziv,
              total: Number(s.total.toFixed(2)),
              jedinica: s.jedinica,
              vrijednost: Number(s.vrijednost.toFixed(2)),
            })),
            {
              naziv: 'UKUPNO',
              total: '',
              jedinica: '',
              vrijednost: Number(totalVrijednost.toFixed(2)),
            },
          ],
        },
        {
          name: 'Detaljan izvjestaj',
          columns: [
            { key: 'datum',    label: 'Datum' },
            { key: 'material', label: 'Materijal' },
            { key: 'kolicina', label: 'Kolicina', format: 'number' },
            { key: 'jedinica', label: 'Jedinica' },
            { key: 'pacijent', label: 'Pacijent' },
            { key: 'ljekar',   label: 'Ljekar' },
          ],
          rows: usageData.map((u) => ({
            datum: u.datum,
            material: u.material_naziv,
            kolicina: Number(u.kolicina.toFixed(2)),
            jedinica: u.material_jedinica,
            pacijent: u.patient_ime,
            ljekar: u.ljekar_ime,
          })),
        },
      ],
    };
  }

  function handleExportExcel() {
    exportToExcel(buildExport());
  }

  function handlePrintPdf() {
    printToPdf(buildExport());
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Materijali</h2>
          <p className="text-sm text-gray-500 mt-1">Katalog materijala i izvjestaj utroska</p>
        </div>
        {tab === 'katalog' && <Button onClick={() => openForm()}><Plus size={16} /> Dodaj materijal</Button>}
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit mb-6">
        {([{ key: 'katalog' as const, label: 'Katalog', icon: Package }, { key: 'izvjestaj' as const, label: 'Izvjestaj utroska', icon: BarChart3 }]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2
              ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'katalog' && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Pretrazi materijale..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <Card padding={false}>
            <div className="px-6 py-3 border-b border-border bg-gray-50 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase">Naziv</span>
              <span className="text-xs font-semibold text-gray-500 uppercase">Jedinica</span>
            </div>
            <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
              {filteredMaterials.map((mat) => (
                <div key={mat.id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50">
                  <span className="text-sm font-medium text-gray-900">{mat.naziv}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">{mat.jedinica_mjere}</span>
                    <button onClick={() => openForm(mat)} className="p-1.5 text-gray-400 hover:text-primary-600 rounded-lg"><Edit size={14} /></button>
                    <button onClick={() => handleDelete(mat)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              {filteredMaterials.length === 0 && <p className="px-6 py-8 text-sm text-gray-400 text-center">Nema materijala</p>}
            </div>
          </Card>
        </div>
      )}

      {tab === 'izvjestaj' && (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-wrap gap-4 items-end justify-between">
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Od</label>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                    className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Do</label>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                    className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Materijal</label>
                  <input type="text" placeholder="Svi" value={filterMaterial} onChange={(e) => setFilterMaterial(e.target.value)}
                    className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Ljekar</label>
                  <input type="text" placeholder="Svi" value={filterDoctor} onChange={(e) => setFilterDoctor(e.target.value)}
                    className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePrintPdf}
                  disabled={usageData.length === 0}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Stampaj izvjestaj kao PDF"
                >
                  <Printer size={13} /> PDF
                </button>
                <button
                  onClick={handleExportExcel}
                  disabled={usageData.length === 0}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Preuzmi izvjestaj kao Excel"
                >
                  <Download size={13} /> Excel
                </button>
              </div>
            </div>
          </Card>

          {usageSummary.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Ukupan utrosak po materijalu</h3>
              <div className="space-y-2">
                {usageSummary.map((s) => (
                  <div key={s.naziv} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm font-medium text-gray-900">{s.naziv}</span>
                    <span className="text-sm font-bold text-purple-700">{s.total} {s.jedinica}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card padding={false}>
            <div className="px-6 py-3 border-b border-border bg-gray-50 flex items-center gap-4 text-xs font-semibold text-gray-500 uppercase">
              <span className="w-24">Datum</span>
              <span className="flex-1">Materijal</span>
              <span className="w-20 text-center">Kolicina</span>
              <span className="w-36">Pacijent</span>
              <span className="w-36">Ljekar</span>
            </div>
            {loadingUsage ? (
              <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
            ) : usageData.length === 0 ? (
              <p className="px-6 py-8 text-sm text-gray-400 text-center">Nema podataka za odabrani period</p>
            ) : (
              <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                {usageData.map((u) => (
                  <div key={u.id} className="px-6 py-3 flex items-center gap-4 hover:bg-gray-50">
                    <span className="text-sm text-gray-600 w-24">{u.datum}</span>
                    <span className="text-sm font-medium text-gray-900 flex-1">{u.material_naziv}</span>
                    <span className="text-sm font-bold text-purple-700 w-20 text-center">{u.kolicina} {u.material_jedinica}</span>
                    <span className="text-sm text-gray-600 w-36 truncate">{u.patient_ime}</span>
                    <span className="text-sm text-gray-600 w-36 truncate">{u.ljekar_ime}</span>
                  </div>
                ))}
              </div>
            )}
            {usageData.length > 0 && (
              <div className="px-6 py-3 border-t border-border bg-gray-50 text-xs text-gray-500">Prikazano {usageData.length} zapisa</div>
            )}
          </Card>
        </div>
      )}

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editMat ? 'Izmijeni materijal' : 'Novi materijal'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Naziv *" value={naziv} onChange={(e) => setNaziv(e.target.value)} required />
          <Input label="Jedinica mjere" value={jedinica} onChange={(e) => setJedinica(e.target.value)} placeholder="1 ml" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setFormOpen(false)}>Otkazi</Button>
            <Button type="submit" disabled={!naziv || saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {editMat ? 'Sacuvaj' : 'Dodaj'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
