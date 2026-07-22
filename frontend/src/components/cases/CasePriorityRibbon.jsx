import { AlertOctagon } from 'lucide-react'
import { recommendedActions, THREAT_DOT } from '../../lib/caseHelpers'

const RIBBON_TINT = {
  critical: 'border-red-500/50 bg-red-950/30',
  high: 'border-orange-500/50 bg-orange-950/20',
  medium: 'border-yellow-500/40 bg-yellow-950/20',
  low: 'border-emerald-500/40 bg-emerald-950/20',
  unknown: 'border-slate-700 bg-slate-900',
}

/**
 * Section 6 — Case Priority Ribbon. Sits at the top of the selected case
 * and communicates severity, AI confidence, linked-case count and the
 * recommended next actions at a glance.
 */
export default function CasePriorityRibbon({ caseId, threatLevel, confidence, linkedCases }) {
  const level = threatLevel || 'unknown'
  return (
    <div className={`rounded-xl border p-4 ${RIBBON_TINT[level]}`}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm text-slate-200">{caseId}</span>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-100">
          <span className={`h-2.5 w-2.5 rounded-full ${THREAT_DOT[level]}`} />
          {level}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-slate-300">
        <span>
          AI Confidence: <span className="font-semibold text-white">{confidence != null ? `${confidence}%` : 'N/A'}</span>
        </span>
        <span>
          Linked Cases: <span className="font-semibold text-white">{linkedCases}</span>
        </span>
      </div>

      <div className="mt-3">
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-400">
          <AlertOctagon size={13} /> Recommended Actions
        </div>
        <ul className="space-y-1">
          {recommendedActions(level).map((a) => (
            <li key={a} className="flex items-center gap-2 text-sm text-slate-200">
              <span className="h-1 w-1 rounded-full bg-slate-500" />
              {a}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
