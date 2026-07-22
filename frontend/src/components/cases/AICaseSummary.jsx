import { Sparkles } from 'lucide-react'
import { recommendedActions, recommendedPriority } from '../../lib/caseHelpers'

/**
 * Section 8 — AI Case Summary (read-only).
 *
 * The narrative is the Gemini-generated explanation produced at detection
 * time and stored on the incident (incident.ai_explanation). We pair it with
 * a derived priority + suggested actions so officers get the assessment and
 * the "what next" in one place. No new model calls are made here.
 */
export default function AICaseSummary({ incident }) {
  const explanation = incident?.ai_explanation
  const redFlags = incident?.investigation_data?.investigation?.red_flags || []
  const priority = recommendedPriority(incident?.threat_level)
  const actions = recommendedActions(incident?.threat_level)

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles size={15} className="text-purple-400" />
        <h4 className="text-sm font-semibold text-slate-200">AI Case Summary</h4>
        <span className="ml-auto rounded bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
          Gemini
        </span>
      </div>

      {explanation ? (
        <p className="text-sm leading-relaxed text-slate-300">{explanation}</p>
      ) : (
        <p className="text-sm text-slate-500">No AI summary is available for this case yet.</p>
      )}

      {redFlags.length > 0 && (
        <ul className="mt-3 space-y-1">
          {redFlags.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-red-300">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-red-400" />
              {f}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 border-t border-slate-800 pt-3">
        <p className="text-xs text-slate-400">
          Recommended Priority: <span className="font-semibold text-slate-200">{priority}</span>
        </p>
        <p className="mt-1 text-xs text-slate-500">Suggested next actions: {actions.join(' · ')}</p>
      </div>
    </div>
  )
}
