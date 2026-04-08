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
    <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
      {/* Lijeva strana — navigacija */}
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={goToToday}>
          Danas
        </Button>
        <div className="flex items-center">
          <button
            onClick={goBack}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={goForward}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 whitespace-nowrap">
          {getDateLabel()}
        </h3>
      </div>

      {/* Desna strana — prikaz i akcije */}
      <div className="flex items-center gap-2">
        {/* View toggle */}
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {(Object.keys(viewLabels) as CalendarView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                ${view === v
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              {viewLabels[v]}
            </button>
          ))}
        </div>

        {/* Filter */}
        <Button
          variant={filtersOpen ? 'primary' : 'secondary'}
          size="sm"
          onClick={onToggleFilters}
        >
          <Filter size={16} />
          Filteri
        </Button>

        {/* Novi termin */}
        <Button size="sm" onClick={onNewAppointment}>
          <Plus size={16} />
          Novi termin
        </Button>
      </div>
    </div>
  );
}
