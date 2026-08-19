import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { Panel } from '../dashboard/Panel'
import { TYPE_LABEL } from '../../lib/analytics'

function Cell({ label, value, suffix, alert, trend, last }) {
  const valueClass =
    alert === 'critical' ? 'text-red-300' : alert === 'elevated' ? 'text-amber-300' : 'text-zinc-100'
  const TrendIcon = trend?.dir === 'up' ? ArrowUpRight : trend?.dir === 'down' ? ArrowDownRight : Minus
  const trendClass =
    trend?.dir === 'up' ? 'text-amber-300/80' : trend?.dir === 'down' ? 'text-emerald-400/80' : 'text-zinc-500'

  return (
    <div className={`px-4 py-3 ${last ? '' : 'border-white/6 lg:border-r'}`}>
      <div className="text-[12px] uppercase tracking-[0.09em] text-cyan-300/85">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className={`text-[22px] font-semibold leading-none tabular-nums ${valueClass}`}>{value}</span>
        {suffix && <span className="text-[12.5px] text-zinc-500">{suffix}</span>}
      </div>
      {trend && (
        <div className={`mt-1.5 inline-flex items-center gap-1 text-[12px] ${trendClass}`}>
          <TrendIcon size={11} />
          {trend.label}
        </div>
      )}
    </div>
  )
}

/**
 * Section 2 — compact operational summary. Real figures only; "Recent Trend"
 * is omitted (rendered as "—") when the series can't support a direction.
 */
export default function SummaryStrip({ summary }) {
  if (!summary) return null

  const cells = [
    { label: 'Total Incidents', value: summary.total.toLocaleString() },
    {
      label: 'Average Risk',
      value: summary.avgRisk.toFixed(1),
      suffix: '/100',
      alert: summary.avgRisk >= 60 ? 'elevated' : undefined,
    },
    {
      label: 'Critical Threats',
      value: summary.critical.toLocaleString(),
      alert: summary.critical > 0 ? 'critical' : undefined,
    },
    {
      label: 'Most Common Threat',
      value: summary.topType ? TYPE_LABEL[summary.topType] || summary.topType : '—',
      suffix: summary.topType ? `${summary.topTypePct}%` : undefined,
    },
    {
      label: 'Recent Trend',
      value: summary.trend ? summary.trend.label : '—',
      trend: summary.trend || undefined,
    },
  ]

  return (
    <Panel>
      <div className="grid grid-cols-2 divide-y divide-white/6 sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
        {cells.map((c, i) => (
          <Cell key={c.label} {...c} last={i === cells.length - 1} />
        ))}
      </div>
    </Panel>
  )
}
