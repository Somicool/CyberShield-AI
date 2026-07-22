import { Zap } from 'lucide-react'
import { QUICK_ACTIONS } from '../../lib/copilotContext'

/**
 * Section 4 — one-click investigation prompts. Each sends its prompt to the
 * Copilot using the active investigation context. Disabled until an
 * investigation is selected.
 */
export default function QuickActions({ onAction, disabled }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <Zap size={13} className="text-purple-400" /> Quick Actions
      </div>
      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((a) => (
          <button
            key={a.id}
            onClick={() => onAction(a.prompt)}
            disabled={disabled}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 transition hover:border-purple-500/40 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  )
}
