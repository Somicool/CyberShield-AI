import { Sparkles, AlertTriangle } from 'lucide-react'

/**
 * Section 3 — AI Investigation Summary.
 *
 * Shows the Gemini explanation prominently, then every reason the content
 * was classified malicious (triggered heuristics + investigation red flags),
 * plus the detection confidence.
 */
export default function AISummarySection({ incident, confidence }) {
  const inv = incident?.investigation_data || {}
  const heuristics = inv.heuristics_triggered || []
  const redFlags = inv.investigation?.red_flags || []
  const reasons = [...heuristics.map((h) => h.reason), ...redFlags]

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles size={15} className="text-purple-400" />
          <span className="text-xs font-semibold uppercase tracking-wide text-purple-300">Gemini Assessment</span>
        </div>
        <p className="text-sm leading-relaxed text-slate-200">
          {incident?.ai_explanation || 'No AI explanation available for this case.'}
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Why this was flagged</span>
          {confidence != null && (
            <span className="text-xs text-slate-400">
              Confidence: <span className="font-semibold text-slate-200">{confidence}%</span>
            </span>
          )}
        </div>

        {confidence != null && (
          <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-purple-500" style={{ width: `${confidence}%` }} />
          </div>
        )}

        {reasons.length === 0 ? (
          <p className="text-sm text-slate-500">
            No specific rule-based indicators were triggered; the score is based on the ML model alone.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-orange-400" />
                {r}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
