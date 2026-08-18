import { AlertTriangle, Link2 } from 'lucide-react'

const RISK_STYLE = {
  Critical: 'text-red-300',
  High: 'text-amber-300',
  Medium: 'text-zinc-200',
}

const DOT = {
  critical: 'bg-red-400',
  high: 'bg-amber-400',
  medium: 'bg-zinc-400',
}

function Stat({ label, value, className = '' }) {
  return (
    <div className="min-w-0 px-3 py-2">
      <div className="text-[11.5px] uppercase tracking-[0.08em] text-zinc-500">{label}</div>
      <div className={`mt-0.5 truncate text-[16px] font-semibold tabular-nums ${className || 'text-zinc-100'}`}>
        {value}
      </div>
    </div>
  )
}

/**
 * Graph Insights — a compact strip that sits directly above the canvas.
 *
 * Every number is counted from the loaded graph and every observation comes
 * from deriveInsights(); when no entity is shared between investigations that
 * is stated plainly rather than dressed up as intelligence.
 */
export default function GraphInsights({ stats, insights = [], onFocus }) {
  if (!stats) return null

  return (
    <section className="overflow-hidden rounded-lg border border-white/10 bg-[#111722]/82 backdrop-blur-md">
      <div className="grid grid-cols-2 divide-x divide-white/5 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Connected Entities" value={stats.entities} />
        <Stat label="Incidents" value={stats.incidents} />
        <Stat label="Linked Cases" value={stats.linkedCases} />
        <Stat label="Relationships" value={stats.relationships} />
        <Stat
          label="Risk Level"
          value={stats.riskLevel || 'No signal'}
          className={stats.riskLevel ? RISK_STYLE[stats.riskLevel] : 'text-zinc-500'}
        />
      </div>

      <div className="border-t border-white/5 px-3 py-2.5">
        {insights.length === 0 ? (
          <p className="flex items-center gap-2 text-[13px] text-zinc-500">
            <Link2 size={14} className="shrink-0 text-zinc-600" />
            No entity in this graph is shared with another investigation, so no cross-case relationship exists yet.
            Expand an entity to look further.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {insights.map((ins) => (
              <li key={ins.id}>
                <button
                  onClick={() => onFocus?.(ins.focusId)}
                  className="flex w-full items-start gap-2 rounded px-1 py-1 text-left text-[13px] text-zinc-300 transition hover:bg-white/5 hover:text-zinc-100"
                >
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${DOT[ins.severity] || 'bg-zinc-500'}`} />
                  <span className="min-w-0">{ins.text}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {stats.sharedEntities > 0 && (
        <div className="flex items-center gap-2 border-t border-white/5 px-3 py-2 text-[12.5px] text-amber-200/80">
          <AlertTriangle size={13} className="shrink-0" />
          {stats.sharedEntities} indicator{stats.sharedEntities === 1 ? '' : 's'} reused across investigations —
          marked on the graph.
        </div>
      )}
    </section>
  )
}
