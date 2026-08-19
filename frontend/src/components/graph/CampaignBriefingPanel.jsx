import { useEffect } from 'react'
import { Brain, X, ShieldAlert } from 'lucide-react'

const CONF_STYLE = {
  High: 'text-red-300',
  Medium: 'text-amber-300',
  Low: 'text-sky-300',
  'Not Available': 'text-slate-400',
}

/**
 * Flagship AI Campaign Analysis slide-over. Read-only briefing summarising the
 * currently visible graph in natural language (built by buildCampaignBriefing
 * from real graph data + an existing Gemini explanation). Not a chatbot.
 */
export default function CampaignBriefingPanel({ open, onClose, briefing, loading }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div onClick={onClose} className={`absolute inset-0 bg-black/60 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} />
      <aside
        role="dialog"
        aria-label="AI Campaign Analysis"
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-slate-950/95 shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <Brain size={18} className="text-cyan-300/80" />
            <div>
              <h3 className="text-sm font-semibold text-slate-100">AI Campaign Analysis</h3>
              <p className="text-[12.5px] text-slate-500">Read-only intelligence briefing</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-400 hover:bg-slate-800/75 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {loading ? (
            <p className="text-sm text-slate-400">Analysing the current graph…</p>
          ) : (
            <>
              {briefing?.narrative?.map((para, i) => (
                <p key={i} className="text-sm leading-relaxed text-slate-300">
                  {para}
                </p>
              ))}

              <div className="rounded-lg border border-slate-800 bg-slate-900/72 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <ShieldAlert size={15} className="text-amber-400" />
                  AI Assessment: <span className={CONF_STYLE[briefing?.confidence] || 'text-slate-300'}>{briefing?.confidence} Confidence</span>
                </div>
                {briefing?.actions?.length > 0 && (
                  <>
                    <p className="mt-2 text-[12.5px] uppercase tracking-wide text-cyan-300/85">Recommended Actions</p>
                    <ul className="mt-1.5 space-y-1">
                      {briefing.actions.map((a) => (
                        <li key={a} className="flex items-center gap-2 text-sm text-slate-200">
                          <span className="h-1 w-1 rounded-full bg-cyan-300/80" />
                          {a}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              <p className="text-[12.5px] leading-relaxed text-slate-600">
                Generated from relationships already present in the Neo4j threat graph together with existing
                Gemini explanations. No entities or connections are invented.
              </p>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
