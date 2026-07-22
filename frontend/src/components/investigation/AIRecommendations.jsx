import { CheckCircle2 } from 'lucide-react'

/**
 * Section 8 — AI Recommendations. Derived from the case severity and the
 * entities/red-flags surfaced by the backend investigation + graph. These
 * mirror the actions in the AI briefing so officers see one consistent set.
 */
export default function AIRecommendations({ actions = [] }) {
  if (actions.length === 0) {
    return <p className="text-sm text-slate-500">No specific recommendations for this case.</p>
  }
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {actions.map((a) => (
        <li
          key={a}
          className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-200"
        >
          <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
          {a}
        </li>
      ))}
    </ul>
  )
}
