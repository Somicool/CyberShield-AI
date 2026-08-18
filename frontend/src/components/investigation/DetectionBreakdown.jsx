import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

function ScoreCard({ label, value, suffix = '', accent = 'text-slate-100' }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/72 p-3">
      <div className="text-[11.5px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${accent}`}>
        {value}
        <span className="text-sm text-slate-500">{suffix}</span>
      </div>
    </div>
  )
}

function HeuristicRow({ hit }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="rounded-lg border border-slate-800 bg-slate-900/72">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <ChevronDown size={14} className={`text-slate-500 transition-transform ${open ? '' : '-rotate-90'}`} />
        <span className="flex-1 text-sm text-slate-300">{hit.reason}</span>
        <span className="rounded bg-red-500/15 px-2 py-0.5 font-mono text-xs text-red-300">+{hit.points}</span>
      </button>
      {open && (
        <div className="border-t border-slate-800 px-9 py-2 text-xs text-slate-500">
          This signal contributed <span className="font-mono text-slate-300">{hit.points}</span> point
          {hit.points === 1 ? '' : 's'} to the final risk score.
        </div>
      )}
    </li>
  )
}

/**
 * Section 4 — Detection Breakdown. ML base score, summed heuristic points,
 * final risk score and confidence, plus every triggered heuristic as an
 * expandable row.
 */
export default function DetectionBreakdown({ incident, confidence }) {
  const inv = incident?.investigation_data || {}
  const heuristics = inv.heuristics_triggered || []
  const heuristicScore = heuristics.reduce((s, h) => s + (h.points || 0), 0)
  const mlBase = inv.ml_base_score

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ScoreCard label="ML Model Score" value={mlBase != null ? Number(mlBase).toFixed(1) : '—'} />
        <ScoreCard label="Heuristic Score" value={`+${heuristicScore}`} accent="text-orange-300" />
        <ScoreCard label="Final Risk Score" value={incident.risk_score?.toFixed(1) ?? '—'} suffix="/100" accent="text-red-300" />
        <ScoreCard label="Detection Confidence" value={confidence != null ? confidence : '—'} suffix={confidence != null ? '%' : ''} accent="text-purple-300" />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Triggered Heuristics ({heuristics.length})
        </p>
        {heuristics.length === 0 ? (
          <p className="text-sm text-slate-500">No heuristics were triggered for this case.</p>
        ) : (
          <ul className="space-y-2">
            {heuristics.map((h, i) => (
              <HeuristicRow key={i} hit={h} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
