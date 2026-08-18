import { useEffect } from 'react'
import { Radar, ShieldCheck, X } from 'lucide-react'
import { relativeTime } from '../../lib/intel'

const CHIP = {
  critical: 'border-red-400/35 text-red-300',
  high: 'border-amber-400/35 text-amber-300',
  medium: 'border-white/12 text-zinc-300',
  low: 'border-emerald-400/30 text-emerald-300',
  unknown: 'border-white/12 text-zinc-400',
}

/**
 * The complete AI intelligence feed, as a slide-over.
 *
 * The Live Feed page shows only the top findings inline; this holds the full
 * set so nothing is lost. Every item is a real pattern derived from current
 * incident data (lib/intel.js), and selecting one pivots the threat table's
 * search to the incidents behind it.
 */
export default function IntelligenceAlerts({ open, insights = [], onInspect, onClose }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <aside
        role="dialog"
        aria-label="AI Intelligence Feed"
        className={`absolute right-0 top-0 flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-[#151d2b]/95 shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
          <div className="flex items-center gap-2">
            <Radar size={16} className="text-zinc-500" />
            <div>
              <h3 className="text-[14px] font-semibold uppercase tracking-[0.08em] text-zinc-200">
                AI Intelligence Feed
              </h3>
              <p className="text-[12.5px] text-zinc-500">
                {insights.length} finding{insights.length === 1 ? '' : 's'} derived from current incidents
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200"
          >
            <X size={17} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {insights.length === 0 ? (
            <p className="flex items-center gap-2 px-4 py-5 text-[13.5px] text-zinc-400">
              <ShieldCheck size={15} className="shrink-0 text-emerald-400/80" />
              No coordinated campaigns detected in recent activity. Monitoring continues.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {insights.map((insight) => (
                <li key={insight.id}>
                  <button
                    type="button"
                    onClick={() => onInspect?.(insight)}
                    className="w-full px-4 py-3 text-left transition hover:bg-white/4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-[14px] font-medium text-zinc-100">{insight.title}</span>
                      <span
                        className={`shrink-0 rounded border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] ${
                          CHIP[insight.severity] || CHIP.unknown
                        }`}
                      >
                        {insight.severity}
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">{insight.detail}</p>
                    <span className="mt-1 block text-[12.5px] text-zinc-600">
                      {relativeTime(insight.timestamp)}
                      {insight.query ? ' · select to filter the stream' : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  )
}
