/** Reusable "Planned Module" badge + grid used across the admin page. */

export function PlannedBadge() {
  return (
    <span className="inline-block rounded border border-slate-700 bg-slate-800/75 px-2 py-0.5 text-[11.5px] uppercase tracking-wide text-slate-400">
      Planned Module
    </span>
  )
}

export default function PlannedGrid({ items = [], cols = 'sm:grid-cols-2 lg:grid-cols-4' }) {
  return (
    <div className={`grid gap-3 ${cols}`}>
      {items.map((it) => {
        const name = typeof it === 'string' ? it : it.name
        const Icon = typeof it === 'string' ? null : it.icon
        return (
          <div key={name} className="rounded-lg border border-dashed border-slate-700 bg-slate-900/72 p-4 opacity-80">
            <div className="flex items-center gap-2">
              {Icon && <Icon size={15} className="text-slate-500" />}
              <span className="text-sm font-medium text-slate-300">{name}</span>
            </div>
            <div className="mt-3">
              <PlannedBadge />
            </div>
          </div>
        )
      })}
    </div>
  )
}
