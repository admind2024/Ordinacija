import { useState } from 'react';
import { Plus, Edit, Trash2, Tag, Clock, Loader2, Save } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { useCalendar } from '../contexts/CalendarContext';
import type { Service, ServiceCategory } from '../types';

export default function Services() {
  const {
    services, serviceCategories,
    createService, updateService, deleteService,
    createServiceCategory, updateServiceCategory, deleteServiceCategory,
  } = useCalendar();

  const [svcFormOpen, setSvcFormOpen] = useState(false);
  const [editSvc, setEditSvc] = useState<Service | null>(null);
  const [catFormOpen, setCatFormOpen] = useState(false);
  const [editCat, setEditCat] = useState<ServiceCategory | null>(null);

  // Service form state
  const [svcNaziv, setSvcNaziv] = useState('');
  const [svcCijena, setSvcCijena] = useState('');
  const [svcTrajanje, setSvcTrajanje] = useState('30');
  const [svcKategorija, setSvcKategorija] = useState('');
  const [svcSaving, setSvcSaving] = useState(false);

  // Category form state
  const [catNaziv, setCatNaziv] = useState('');
  const [catSaving, setCatSaving] = useState(false);

  function openSvcForm(svc?: Service) {
    if (svc) {
      setEditSvc(svc);
      setSvcNaziv(svc.naziv);
      setSvcCijena(String(svc.cijena));
      setSvcTrajanje(String(svc.trajanje));
      setSvcKategorija(svc.kategorija_id);
    } else {
      setEditSvc(null);
      setSvcNaziv('');
      setSvcCijena('');
      setSvcTrajanje('30');
      setSvcKategorija(serviceCategories[0]?.id || '');
    }
    setSvcFormOpen(true);
  }

  function openCatForm(cat?: ServiceCategory) {
    if (cat) {
      setEditCat(cat);
      setCatNaziv(cat.naziv);
    } else {
      setEditCat(null);
      setCatNaziv('');
    }
    setCatFormOpen(true);
  }

  async function handleSaveSvc(e: React.FormEvent) {
    e.preventDefault();
    if (!svcNaziv || !svcCijena) return;
    setSvcSaving(true);
    const data = {
      naziv: svcNaziv,
      cijena: Number(svcCijena),
      trajanje: Number(svcTrajanje) || 30,
      kategorija_id: svcKategorija,
      aktivan: true,
    };
    if (editSvc) {
      await updateService(editSvc.id, data);
    } else {
      await createService(data as Omit<Service, 'id'>);
    }
    setSvcSaving(false);
    setSvcFormOpen(false);
  }

  async function handleDeleteSvc(svc: Service) {
    if (!confirm(`Obrisati uslugu "${svc.naziv}"?`)) return;
    await deleteService(svc.id);
  }

  async function handleSaveCat(e: React.FormEvent) {
    e.preventDefault();
    if (!catNaziv) return;
    setCatSaving(true);
    if (editCat) {
      await updateServiceCategory(editCat.id, { naziv: catNaziv });
    } else {
      await createServiceCategory({ naziv: catNaziv, redoslijed: serviceCategories.length + 1 });
    }
    setCatSaving(false);
    setCatFormOpen(false);
  }

  async function handleDeleteCat(cat: ServiceCategory) {
    const hasServices = services.some((s) => s.kategorija_id === cat.id);
    if (hasServices) {
      alert('Ne mozete obrisati kategoriju koja ima usluge. Prvo premjestite ili obrisite usluge.');
      return;
    }
    if (!confirm(`Obrisati kategoriju "${cat.naziv}"?`)) return;
    await deleteServiceCategory(cat.id);
  }

  const grouped = serviceCategories.map((cat) => ({
    ...cat,
    items: services.filter((s) => s.kategorija_id === cat.id),
  }));

  const uncategorized = services.filter((s) => !serviceCategories.find((c) => c.id === s.kategorija_id));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Artikli i cjenovnik</h2>
          <p className="text-sm text-gray-500 mt-1">Usluge, kategorije i cijene</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => openCatForm()}>
            <Plus size={16} /> Nova kategorija
          </Button>
          <Button onClick={() => openSvcForm()}>
            <Plus size={16} /> Nova usluga
          </Button>
        </div>
      </div>

      {/* Statistika */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <p className="text-sm text-gray-500">Ukupno usluga</p>
          <p className="text-2xl font-bold text-gray-900">{services.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Kategorija</p>
          <p className="text-2xl font-bold text-gray-900">{serviceCategories.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Prosjecna cijena</p>
          <p className="text-2xl font-bold text-primary-600">
            {services.length > 0 ? (services.reduce((s, svc) => s + svc.cijena, 0) / services.length).toFixed(0) : 0} EUR
          </p>
        </Card>
      </div>

      {/* Kategorije sa uslugama */}
      <div className="space-y-6">
        {grouped.map((cat) => (
          <Card key={cat.id} padding={false}>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <Tag size={16} className="text-primary-600" />
                <h3 className="text-sm font-semibold text-gray-700">{cat.naziv}</h3>
                <span className="text-xs text-gray-400">{cat.items.length} usluga</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openCatForm(cat)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg" title="Izmijeni">
                  <Edit size={14} />
                </button>
                <button onClick={() => handleDeleteCat(cat)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Obrisi">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {cat.items.length === 0 ? (
              <p className="px-6 py-4 text-sm text-gray-400">Nema usluga u ovoj kategoriji</p>
            ) : (
              <div className="divide-y divide-border">
                {cat.items.map((svc) => (
                  <div key={svc.id} className="px-6 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{svc.naziv}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock size={12} /> {svc.trajanje} min
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{svc.cijena.toFixed(2)} EUR</span>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openSvcForm(svc)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => handleDeleteSvc(svc)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}

        {uncategorized.length > 0 && (
          <Card padding={false}>
            <div className="px-6 py-4 border-b border-border bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-500">Bez kategorije</h3>
            </div>
            <div className="divide-y divide-border">
              {uncategorized.map((svc) => (
                <div key={svc.id} className="px-6 py-3 flex items-center gap-4">
                  <div className="flex-1"><p className="text-sm font-medium text-gray-900">{svc.naziv}</p></div>
                  <span className="text-sm font-semibold">{svc.cijena.toFixed(2)} EUR</span>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openSvcForm(svc)} className="p-1.5 text-gray-400 hover:text-primary-600 rounded-lg"><Edit size={14} /></button>
                    <button onClick={() => handleDeleteSvc(svc)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Modal za uslugu */}
      <Modal isOpen={svcFormOpen} onClose={() => setSvcFormOpen(false)} title={editSvc ? 'Izmijeni uslugu' : 'Nova usluga'} size="md">
        <form onSubmit={handleSaveSvc} className="space-y-4">
          <Input label="Naziv usluge *" value={svcNaziv} onChange={(e) => setSvcNaziv(e.target.value)} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Cijena (EUR) *" type="number" value={svcCijena} onChange={(e) => setSvcCijena(e.target.value)} required />
            <Input label="Trajanje (min)" type="number" value={svcTrajanje} onChange={(e) => setSvcTrajanje(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategorija</label>
            <select
              value={svcKategorija}
              onChange={(e) => setSvcKategorija(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Bez kategorije</option>
              {serviceCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.naziv}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setSvcFormOpen(false)}>Otkazi</Button>
            <Button type="submit" disabled={!svcNaziv || !svcCijena || svcSaving}>
              {svcSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {editSvc ? 'Sacuvaj' : 'Dodaj'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal za kategoriju */}
      <Modal isOpen={catFormOpen} onClose={() => setCatFormOpen(false)} title={editCat ? 'Izmijeni kategoriju' : 'Nova kategorija'} size="sm">
        <form onSubmit={handleSaveCat} className="space-y-4">
          <Input label="Naziv kategorije *" value={catNaziv} onChange={(e) => setCatNaziv(e.target.value)} required />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setCatFormOpen(false)}>Otkazi</Button>
            <Button type="submit" disabled={!catNaziv || catSaving}>
              {catSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {editCat ? 'Sacuvaj' : 'Dodaj'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
