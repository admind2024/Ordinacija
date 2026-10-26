// Tabovi u stilu ostatka aplikacije (siva traka, bijeli aktivni tab — kao Naplata i karton pacijenta).
interface TabsProps<T extends string> {
  tabs: { id: T; label: string; count?: number }[];
  active: T;
  onChange: (id: T) => void;
  label: string;
}

export default function Tabs<T extends string>({ tabs, active, onChange, label }: TabsProps<T>) {
  return (
    <div className="-mx-3 md:mx-0 px-3 md:px-0 overflow-x-auto mb-6">
      <div role="tablist" aria-label={label} className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-max md:w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={active === t.id}
            onClick={() => onChange(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
              ${active === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="ml-1.5 text-xs text-gray-400 tabular-nums">{t.count}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
