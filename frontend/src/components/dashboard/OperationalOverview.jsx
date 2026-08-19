import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

/**
 * The command center's headline metrics.
 *
 * Each figure gets its own bordered box rather than sharing one divided strip,
 * so the six read as six separate readouts from across a room. The accent rule,
 * the label colour and the glow all shift with severity: a `critical` metric
 * goes red and a `warn` metric amber, so an abnormal number still wins over the
 * cyan default instead of six boxes competing equally.
 */
const TONE = {
  critical: {
    value: 'metric-critical',
    rule: 'bg-red-400/80',
    label: 'text-red-300/90',
    box: 'border-red-500/35 hover:border-red-400/60',
  },
  warn: {
    value: 'metric-warn',
    rule: 'bg-amber-400/80',
    label: 'text-amber-300/90',
    box: 'border-amber-500/35 hover:border-amber-400/60',
  },
  default: {
    value: 'metric-accent',
    rule: 'bg-cyan-400/70',
    label: 'text-cyan-300/85',
    box: 'border-cyan-500/25 hover:border-cyan-400/55',
  },
}

function Metric({ label, value, suffix, trend, alert }) {
  const tone = TONE[alert] || TONE.default
  return (
    <div
      className={`group relative overflow-hidden rounded-lg border bg-slate-900/82 px-4 py-4 backdrop-blur-md transition ${tone.box}`}
    >
      {/* Top edge accent — reads as a lit indicator on each box. */}
      <span className={`absolute inset-x-0 top-0 h-0.5 ${tone.rule} opacity-70`} />

      <div className={`text-[12px] font-medium uppercase tracking-[0.09em] ${tone.label}`}>{label}</div>

      <div className="mt-1.5 flex items-baseline gap-1.5">
        {/* Headline KPI figure — steps down on narrower viewports so six
            columns never overflow. */}
        <span
          className={`metric-value text-[34px] font-semibold leading-none tracking-tight xl:text-[44px] ${tone.value}`}
        >
          {value}
        </span>
        {suffix && <span className="text-[14px] text-zinc-400">{suffix}</span>}
      </div>

      {trend && (
        <div
          className={`mt-2 inline-flex items-center gap-1 text-[12px] ${
            trend.dir === 'up' ? 'text-amber-300/80' : trend.dir === 'down' ? 'text-emerald-400/80' : 'text-zinc-400'
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
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
      {metrics.map((m) => (
        <Metric key={m.label} {...m} />
      ))}
    </div>
  )
}
