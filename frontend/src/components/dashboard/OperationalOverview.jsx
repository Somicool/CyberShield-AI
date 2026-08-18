import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Panel } from './Panel'

/** Glow tone + accent rule colour per metric state. */
const TONE = {
  critical: { value: 'metric-critical', rule: 'bg-red-400/70' },
  warn: { value: 'metric-warn', rule: 'bg-amber-400/70' },
  default: { value: 'metric-accent', rule: 'bg-cyan-400/55' },
}

/**
 * A single compact metric strip (replaces six large KPI cards).
 *
 * The figure itself is the highlight: a lit readout with a soft glow and an
 * accent rule beneath it, so the numbers register before the labels. Severity
 * still wins — a `critical` metric glows red and a `warn` metric amber, so an
 * officer's eye lands on the abnormal number rather than on all six equally.
 */
function Metric({ label, value, suffix, trend, alert, last }) {
  const tone = TONE[alert] || TONE.default
  return (
    <div
      className={`group relative px-4 py-4 transition-colors hover:bg-white/3 ${
        last ? '' : 'border-white/6 lg:border-r'
      }`}
    >
      <div className="text-[12px] uppercase tracking-[0.09em] text-zinc-500">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        {/* Headline KPI figure — steps down on narrower viewports so six
            columns never overflow. */}
        <span
          className={`metric-value text-[34px] font-semibold leading-none tracking-tight xl:text-[44px] ${tone.value}`}
        >
          {value}
        </span>
        {suffix && <span className="text-[14px] text-zinc-500">{suffix}</span>}
      </div>
      {/* Accent rule — a readout underline, widening slightly on hover. */}
      <div
        className={`mt-2 h-0.5 w-7 rounded-full transition-all duration-200 group-hover:w-12 ${tone.rule}`}
      />
      {trend && (
        <div
          className={`mt-1 inline-flex items-center gap-1 text-[12px] ${
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
