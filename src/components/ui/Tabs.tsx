interface TabsProps<T extends string> {
  tabs: { id: T; label: string; count?: number }[];
  active: T;
  onChange: (id: T) => void;
  label: string;
}

export default function Tabs<T extends string>({ tabs, active, onChange, label }: TabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 border-b border-border mb-5 overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          type="button"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors
            focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-t-md
            ${active === t.id
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          {t.label}
          {t.count !== undefined && (
            <span className="ml-1.5 text-xs text-gray-400 tabular-nums">{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
