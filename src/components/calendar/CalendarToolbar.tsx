import { format } from 'date-fns';
import { srLatn as sr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Filter } from 'lucide-react';
import { useCalendar, type CalendarView } from '../../contexts/CalendarContext';
import Button from '../ui/Button';

const viewLabels: Record<CalendarView, string> = {
  day: 'Dan',
  week: 'Sedmica',
  month: 'Mjesec',
  agenda: 'Agenda',
};

interface CalendarToolbarProps {
  onNewAppointment: () => void;
  onToggleFilters: () => void;
  filtersOpen: boolean;
}

export default function CalendarToolbar({ onNewAppointment, onToggleFilters, filtersOpen }: CalendarToolbarProps) {
  const { selectedDate, view, setView, goToToday, goForward, goBack } = useCalendar();

  function getDateLabel() {
    switch (view) {
      case 'day':
        return format(selectedDate, 'EEEE, d. MMMM yyyy.', { locale: sr });
      case 'week': {
        const start = new Date(selectedDate);
        start.setDate(start.getDate() - start.getDay() + 1);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        if (start.getMonth() === end.getMonth()) {
          return `${format(start, 'd.')} - ${format(end, 'd. MMMM yyyy.', { locale: sr })}`;
        }
        return `${format(start, 'd. MMM', { locale: sr })} - ${format(end, 'd. MMM yyyy.', { locale: sr })}`;
      }
      case 'month':
        return format(selectedDate, 'MMMM yyyy.', { locale: sr });
      case 'agenda':
        return format(selectedDate, 'MMMM yyyy.', { locale: sr });
    }
  }

  return (
    <div className="mb-4 space-y-2 md:space-y-0">
      {/* Red 1: navigacija + datum */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 md:gap-2 min-w-0">
          <Button variant="secondary" size="sm" onClick={goToToday}>
            Danas
          </Button>
          <div className="flex items-center">
            <button
              onClick={goBack}
              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Prethodno"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={goForward}
              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Sljedece"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <h3 className="text-sm md:text-lg font-semibold text-gray-900 truncate md:whitespace-nowrap">
            {getDateLabel()}
          </h3>
        </div>

        {/* Novi termin — vidljiv i na mobilnom i na desktopu */}
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" onClick={onNewAppointment}>
            <Plus size={16} />
            <span className="hidden xs:inline">Novi termin</span>
            <span className="xs:hidden">Novi</span>
          </Button>
        </div>
      </div>

      {/* Red 2: view toggle + filter */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex bg-gray-100 rounded-lg p-0.5 overflow-x-auto">
          {(Object.keys(viewLabels) as CalendarView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-2.5 md:px-3 py-1.5 text-xs md:text-sm font-medium rounded-md transition-colors whitespace-nowrap
                ${view === v
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              {viewLabels[v]}
            </button>
          ))}
        </div>

        <Button
          variant={filtersOpen ? 'primary' : 'secondary'}
          size="sm"
          onClick={onToggleFilters}
        >
          <Filter size={16} />
          <span className="hidden sm:inline">Filteri</span>
        </Button>
      </div>
    </div>
  );
}
