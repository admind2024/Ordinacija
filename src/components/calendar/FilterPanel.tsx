import { useCalendar, type ColorSource } from '../../contexts/CalendarContext';

const colorSourceLabels: Record<ColorSource, string> = {
  doctor: 'Po doktoru',
  status: 'Po statusu',
  room: 'Po ordinaciji',
};

export default function FilterPanel() {
  const {
    filters,
    toggleDoctorFilter,
    toggleRoomFilter,
    setColorSource,
    selectAllDoctors,
    deselectAllDoctors,
    doctors,
    rooms,
  } = useCalendar();

  return (
    <div className="bg-surface border border-border rounded-xl p-4 mb-4 space-y-4">
      {/* Izvor boje */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Boja termina
        </label>
        <div className="flex gap-1">
          {(Object.keys(colorSourceLabels) as ColorSource[]).map((src) => (
            <button
              key={src}
              onClick={() => setColorSource(src)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                ${filters.colorSource === src
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {colorSourceLabels[src]}
            </button>
          ))}
        </div>
      </div>

      {/* Ljekari */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Ljekari
          </label>
          <div className="flex gap-2">
            <button
              onClick={selectAllDoctors}
              className="text-xs text-primary-600 hover:text-primary-700"
            >
              Svi
            </button>
            <button
              onClick={deselectAllDoctors}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Nijedan
            </button>
          </div>
        </div>
        <div className="space-y-1">
          {doctors.map((doctor) => (
            <label
              key={doctor.id}
              className="flex items-center gap-2 cursor-pointer py-1 px-2 rounded hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={filters.doctorIds.includes(doctor.id)}
                onChange={() => toggleDoctorFilter(doctor.id)}
                className="rounded border-gray-300"
              />
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: doctor.boja }}
              />
              <span className="text-sm text-gray-700">
                {doctor.titula} {doctor.ime} {doctor.prezime}
              </span>
              <span className="text-xs text-gray-400 ml-auto">{doctor.specijalizacija}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Ordinacije */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Ordinacije / Oprema
        </label>
        <div className="flex flex-wrap gap-1">
          {rooms.map((room) => {
            const active = filters.roomIds.includes(room.id);
            return (
              <button
                key={room.id}
                onClick={() => toggleRoomFilter(room.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors border
                  ${active
                    ? 'border-transparent text-white'
                    : 'border-gray-200 text-gray-500 bg-white hover:bg-gray-50'
                  }`}
                style={active ? { backgroundColor: room.boja } : undefined}
              >
                {room.naziv}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
