/**
 * Quick triage — real counts straight from /incidents/stats (whole dataset,
 * not the current page). Red is reserved for critical, amber for high; medium
 * stays neutral and low is the only green.
 */

const CELLS = [
  { key: 'critical', label: 'Critical', value: 'text-red-300', dot: 'bg-red-400' },
  { key: 'high', label: 'High', value: 'text-amber-300', dot: 'bg-amber-400' },
  { key: 'medium', label: 'Medium', value: 'text-zinc-200', dot: 'bg-zinc-400' },
  { key: 'low', label: 'Low', value: 'text-emerald-300', dot: 'bg-emerald-400' },
]

export default function TriageStrip({ counts, total, activeLevel, onSelectLevel, loading }) {
  const dash = loading ? '—' : 0

  return (
    <section className="grid grid-cols-2 divide-white/5 overflow-hidden rounded-lg border border-white/10 bg-[#111722]/82 backdrop-blur-md sm:grid-cols-5 sm:divide-x">
      {CELLS.map((cell) => {
        const active = activeLevel === cell.key
        return (
          <button
            key={cell.key}
            onClick={() => onSelectLevel?.(active ? '' : cell.key)}
            aria-pressed={active}
            className={`flex items-baseline gap-2 px-4 py-2.5 text-left transition hover:bg-white/4 ${
              active ? 'bg-white/6' : ''
            }`}
          >
            <span className="flex min-w-0 flex-col">
              <span className="flex items-center gap-1.5 text-[11.5px] uppercase tracking-[0.08em] text-zinc-500">
                <span className={`h-1.5 w-1.5 rounded-full ${cell.dot}`} />
                {cell.label}
              </span>
              <span className={`text-[22px] font-semibold tabular-nums leading-tight ${cell.value}`}>
                {counts?.[cell.key] ?? dash}
              </span>
            </span>
          </button>
        )
      })}

      <div className="flex flex-col px-4 py-2.5">
        <span className="text-[11.5px] uppercase tracking-[0.08em] text-zinc-500">Total</span>
        <span className="text-[22px] font-semibold leading-tight tabular-nums text-zinc-100">
          {total ?? dash}
        </span>
      </div>
    </section>
  )
}
