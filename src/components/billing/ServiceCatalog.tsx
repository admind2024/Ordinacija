import { useState } from 'react';
import { ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { useCalendar } from '../../contexts/CalendarContext';
import Card from '../ui/Card';

export default function ServiceCatalog() {
  const { services, serviceCategories } = useCalendar();
  const [expandedCats, setExpandedCats] = useState<string[]>(
    serviceCategories.map((c) => c.id)
  );

  function toggleCategory(catId: string) {
    setExpandedCats((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  }

  const groupedServices = serviceCategories.map((cat) => ({
    ...cat,
    services: services.filter((s) => s.kategorija_id === cat.id),
  }));

  return (
    <Card padding={false}>
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Katalog usluga</h3>
        <span className="text-xs text-gray-400">{services.length} usluga</span>
      </div>

      <div className="divide-y divide-border">
        {groupedServices.map((cat) => {
          const expanded = expandedCats.includes(cat.id);
          return (
            <div key={cat.id}>
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {expanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                  <span className="text-sm font-medium text-gray-900">{cat.naziv}</span>
                  <span className="text-xs text-gray-400">({cat.services.length})</span>
                </div>
              </button>

              {expanded && (
                <div className="bg-gray-50/50">
                  {cat.services.map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center justify-between px-6 py-2 pl-12 border-t border-border/50 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: service.boja || '#6B7280' }}
                        />
                        <span className="text-sm text-gray-700">{service.naziv}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 text-gray-400">
                          <Clock size={12} />
                          {service.trajanje} min
                        </span>
                        <span className="font-medium text-gray-900 w-20 text-right">
                          {service.cijena.toFixed(2)} EUR
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
