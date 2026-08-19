/**
 * Quick triage — real counts straight from /incidents/stats (whole dataset,
 * not the current page).
 *
 * Each severity is its own bordered, clickable box so the counts read at a
 * glance and the selected filter is obvious. Red stays reserved for critical
 * and amber for high; medium is neutral and low is the only green.
 */

const CELLS = [
  {
    key: 'critical',
    label: 'Critical',
    value: 'text-red-200',
    label_: 'text-red-300/90',
    dot: 'bg-red-400',
    box: 'border-red-500/35 hover:border-red-400/60',
    active: 'border-red-400/70 bg-red-500/10',
    rule: 'bg-red-400/80',
  },
  {
    key: 'high',
    label: 'High',
    value: 'text-amber-200',
    label_: 'text-amber-300/90',
    dot: 'bg-amber-400',
    box: 'border-amber-500/35 hover:border-amber-400/60',
    active: 'border-amber-400/70 bg-amber-500/10',
    rule: 'bg-amber-400/80',
  },
  {
    key: 'medium',
    label: 'Medium',
    value: 'text-zinc-100',
    label_: 'text-cyan-300/85',
    dot: 'bg-zinc-400',
    box: 'border-cyan-500/25 hover:border-cyan-400/55',
    active: 'border-cyan-400/70 bg-cyan-500/10',
    rule: 'bg-cyan-400/60',
  },
  {
    key: 'low',
    label: 'Low',
    value: 'text-emerald-200',
    label_: 'text-emerald-300/90',
    dot: 'bg-emerald-400',
    box: 'border-emerald-500/35 hover:border-emerald-400/60',
    active: 'border-emerald-400/70 bg-emerald-500/10',
    rule: 'bg-emerald-400/80',
  },
]

const BOX = 'group relative overflow-hidden rounded-lg border bg-slate-900/82 px-4 py-3 backdrop-blur-md transition'

export default function TriageStrip({ counts, total, activeLevel, onSelectLevel, loading }) {
  const dash = loading ? '—' : 0

  return (
    <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
      {CELLS.map((cell) => {
        const active = activeLevel === cell.key
        return (
          <button
            key={cell.key}
            onClick={() => onSelectLevel?.(active ? '' : cell.key)}
            aria-pressed={active}
            className={`${BOX} text-left ${active ? cell.active : cell.box}`}
          >
            <span className={`absolute inset-x-0 top-0 h-0.5 ${cell.rule} opacity-70`} />
            <span
              className={`flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.09em] ${cell.label_}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${cell.dot}`} />
              {cell.label}
            </span>
            <span className={`mt-1 block text-[26px] font-semibold leading-tight tabular-nums ${cell.value}`}>
              {counts?.[cell.key] ?? dash}
            </span>
          </button>
        )
      })}

      <div className={`${BOX} border-white/12`}>
        <span className="absolute inset-x-0 top-0 h-0.5 bg-white/25" />
        <span className="text-[12px] font-medium uppercase tracking-[0.09em] text-cyan-300/85">Total</span>
        <span className="mt-1 block text-[26px] font-semibold leading-tight tabular-nums text-zinc-100">
          {total ?? dash}
        </span>
      </div>
    </section>
  )
}
