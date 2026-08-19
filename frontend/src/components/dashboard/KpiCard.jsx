import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const ACCENTS = {
  purple: 'text-purple-300 bg-purple-500/10 border-purple-500/20',
  red: 'text-red-300 bg-red-500/10 border-red-500/20',
  amber: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
  cyan: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20',
  emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  sky: 'text-sky-300 bg-sky-500/10 border-sky-500/20',
  slate: 'text-slate-300 bg-slate-500/10 border-slate-500/20',
}

const TREND_DIRECTION = {
  up: { Icon: TrendingUp, className: 'text-red-400' },
  down: { Icon: TrendingDown, className: 'text-emerald-400' },
  flat: { Icon: Minus, className: 'text-slate-500' },
}

/**
 * A single command-overview metric.
 *
 * `value` may be "—" when the underlying metric isn't tracked by the
 * backend yet — we render it honestly rather than inventing a number.
 */
export default function KpiCard({ icon: Icon, label, value, accent = 'slate', trend }) {
  const accentClass = ACCENTS[accent] || ACCENTS.slate
  const dir = trend ? TREND_DIRECTION[trend.direction] || TREND_DIRECTION.flat : null

  return (
    <div className="group bg-slate-900/80 border border-slate-800 rounded-xl p-4 transition duration-200 hover:border-slate-700 hover:bg-slate-900/80 hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border ${accentClass}`}>
          {Icon && <Icon size={18} strokeWidth={2} />}
        </span>
        {trend && (
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${dir.className}`}>
            <dir.Icon size={13} strokeWidth={2.5} />
            {trend.label}
          </span>
        )}
      </div>

      <div className="mt-3">
        <div className="text-2xl font-semibold tracking-tight text-white tabular-nums">{value}</div>
        <div className="mt-0.5 text-xs uppercase tracking-wide text-cyan-300/85">{label}</div>
      </div>
    </div>
  )
}
