import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Panel } from './Panel'

/**
 * A single compact metric strip (replaces six large KPI cards).
 *
 * Deliberately monochrome: only metrics flagged `alert` pick up the amber/red
 * accent, so an officer's eye lands on the abnormal number first.
 */
function Metric({ label, value, suffix, trend, alert, last }) {
  const valueClass = alert === 'critical' ? 'text-red-300' : alert === 'warn' ? 'text-amber-300' : 'text-zinc-100'
  return (
    <div className={`px-4 py-3 ${last ? '' : 'border-white/6 lg:border-r'}`}>
      <div className="text-[10.5px] uppercase tracking-[0.09em] text-zinc-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className={`text-[21px] font-semibold leading-none tabular-nums ${valueClass}`}>
          {value}
        </span>
        {suffix && <span className="text-[11px] text-zinc-500">{suffix}</span>}
      </div>
      {trend && (
        <div
          className={`mt-1.5 inline-flex items-center gap-1 text-[10.5px] ${
            trend.dir === 'up' ? 'text-amber-300/80' : trend.dir === 'down' ? 'text-emerald-400/80' : 'text-zinc-500'
          }`}
        >
          {trend.dir === 'up' && <ArrowUpRight size={11} />}
          {trend.dir === 'down' && <ArrowDownRight size={11} />}
          {trend.label}
        </div>
      )}
    </div>
  )
}

export default function OperationalOverview({ metrics = [] }) {
  return (
    <Panel>
      <div className="grid grid-cols-2 divide-y divide-white/6 sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
        {metrics.map((m, i) => (
          <Metric key={m.label} {...m} last={i === metrics.length - 1} />
        ))}
      </div>
    </Panel>
  )
}
