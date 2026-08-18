import { Link } from 'react-router-dom'
import { Lightbulb, Gauge, Timer } from 'lucide-react'
import { Panel, PanelHead, PanelLink } from '../dashboard/Panel'
import { TYPE_LABEL } from '../../lib/analytics'

/** Section 5 — Risk Intelligence as compact metric rows (not big cards). */
function Row({ label, value, valueClass = 'text-zinc-200', to }) {
  const body = (
    <>
      <span className="text-[13.5px] text-zinc-500">{label}</span>
      <span className={`ml-auto font-mono text-[14px] tabular-nums ${valueClass}`}>{value}</span>
    </>
  )
  return to ? (
    <Link to={to} className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-white/3">
      {body}
    </Link>
  ) : (
    <div className="flex items-center gap-3 px-4 py-2.5">{body}</div>
  )
}

export function RiskIntelligence({ summary }) {
  if (!summary) return null

  return (
    <Panel className="flex h-full flex-col">
      <PanelHead
        title="Risk Intelligence"
        action={
          <span className="inline-flex items-center gap-1 text-[12.5px] text-zinc-600">
            <Gauge size={12} /> derived
          </span>
        }
      />
      <div className="divide-y divide-white/5">
        <Row
          label="Average Risk Score"
          value={`${summary.avgRisk.toFixed(1)}/100`}
          valueClass={summary.avgRisk >= 60 ? 'text-amber-300' : 'text-zinc-200'}
        />
        <Row
          label="Highest Risk Recorded"
          value={summary.highestRisk != null ? `${summary.highestRisk.toFixed(0)}/100` : '—'}
          valueClass={summary.highestRisk >= 75 ? 'text-red-300' : 'text-zinc-200'}
        />
        <Row
          label="Critical Threat Share"
          value={`${summary.criticalPct}%`}
          valueClass={summary.criticalPct >= 40 ? 'text-red-300' : 'text-zinc-200'}
          to="/dashboard/feed?level=critical"
        />
        <Row label="Low Risk Share" value={`${summary.lowPct}%`} valueClass="text-emerald-300" to="/dashboard/feed?level=low" />
        <Row
          label="Most Common Threat Type"
          value={summary.topType ? TYPE_LABEL[summary.topType] || summary.topType : '—'}
          to={summary.topType ? `/dashboard/feed?type=${summary.topType}` : undefined}
        />
      </div>

      {/* Section 7 — investigation performance is not exposed by the backend. */}
      <div className="mt-auto border-t border-white/5 px-4 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-zinc-600">
          <Timer size={12} /> Investigation performance data unavailable
        </span>
      </div>
    </Panel>
  )
}

const TONE = {
  critical: 'border-l-red-500/70',
  elevated: 'border-l-amber-400/70',
  safe: 'border-l-emerald-400/70',
  neutral: 'border-l-zinc-600',
}

/** Section 6 — Key Intelligence: factual observations computed from the data. */
export function KeyIntelligence({ items = [] }) {
  return (
    <Panel className="flex h-full flex-col">
      <PanelHead
        title="Key Intelligence"
        action={<PanelLink to="/dashboard/graph">Threat Graph</PanelLink>}
      />
      {items.length === 0 ? (
        <p className="flex flex-1 items-center gap-2 px-4 py-6 text-[14px] text-zinc-500">
          <Lightbulb size={15} className="text-zinc-600" />
          No additional intelligence available.
        </p>
      ) : (
        <ul className="divide-y divide-white/5">
          {items.map((it) => (
            <li
              key={it.id}
              className={`border-l-2 px-4 py-3 text-[14px] leading-relaxed text-zinc-300 ${TONE[it.tone] || TONE.neutral}`}
            >
              {it.text}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
