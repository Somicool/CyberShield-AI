import { useEffect } from 'react'
import { Brain, X, ShieldAlert } from 'lucide-react'

/**
 * Section 2 — AI Investigation Briefing slide-over.
 *
 * A read-only, natural-language briefing (built by lib/briefing.js from the
 * Gemini explanation + backend investigation + graph correlations). Not a
 * chatbot — no input, no conversation. Slides in from the right with a
 * dimmed backdrop; Escape or backdrop click closes it.
 */
export default function BriefingPanel({ open, onClose, briefing, caseId, threatLevel }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      {/* backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      {/* panel */}
      <aside
        role="dialog"
        aria-label="AI Investigation Briefing"
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-slate-950 shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <Brain size={18} className="text-purple-400" />
            <div>
              <h3 className="text-sm font-semibold text-slate-100">AI Investigation Briefing</h3>
              <p className="text-[11px] text-slate-500">{caseId} · read-only assessment</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close briefing" className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {briefing?.narrative?.map((para, i) => (
            <p key={i} className="text-sm leading-relaxed text-slate-300">
              {para}
            </p>
          ))}

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <ShieldAlert size={15} className="text-amber-400" />
              Recommended Priority: <span className="text-white">{briefing?.priority}</span>
            </div>
            <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-500">Immediate actions recommended</p>
            <ul className="mt-1.5 space-y-1">
              {briefing?.actions?.map((a) => (
                <li key={a} className="flex items-center gap-2 text-sm text-slate-200">
                  <span className="h-1 w-1 rounded-full bg-purple-400" />
                  {a}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-600">
            This briefing is generated automatically from recorded detection, investigation and threat-graph data.
            Verify all findings before operational or legal action.
          </p>
        </div>
      </aside>
    </div>
  )
}
