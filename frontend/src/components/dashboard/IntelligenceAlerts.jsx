import { Radar, ShieldCheck } from 'lucide-react'
import { relativeTime } from '../../lib/intel'

const SEVERITY_STYLES = {
  critical: 'bg-red-500/15 text-red-400 border-red-500/40',
  high: 'bg-orange-500/15 text-orange-400 border-orange-500/40',
  medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40',
  low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
  unknown: 'bg-slate-500/15 text-slate-400 border-slate-500/40',
}

const ACCENT_BORDER = {
  critical: 'border-l-red-500/70',
  high: 'border-l-orange-500/70',
  medium: 'border-l-yellow-500/70',
  low: 'border-l-emerald-500/70',
  unknown: 'border-l-slate-600',
}

/**
 * Section 2 — AI Intelligence Alerts.
 *
 * A live intelligence feed. Every card is a real pattern surfaced from the
 * current incident data (see lib/intel.js). Clicking a card pushes its
 * `query` into the Live Threat Feed search so officers can pivot straight
 * to the underlying incidents.
 */
export default function IntelligenceAlerts({ insights = [], onInspect }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Radar size={16} className="text-purple-400" />
        <h3 className="text-sm font-semibold tracking-wide text-slate-200">AI Intelligence Feed</h3>
        <span className="ml-1 inline-flex items-center gap-1.5 text-xs text-slate-500">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          live
        </span>
      </div>

      {insights.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-5 text-sm text-slate-400">
          <ShieldCheck size={18} className="text-emerald-400" />
          No coordinated campaigns detected in recent activity. Monitoring continues.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {insights.map((insight) => (
            <button
              key={insight.id}
              type="button"
              onClick={() => onInspect?.(insight)}
              className={`group flex flex-col gap-2 rounded-xl border border-slate-800 border-l-2 ${ACCENT_BORDER[insight.severity] || ACCENT_BORDER.unknown} bg-slate-900/60 p-4 text-left transition hover:border-slate-700 hover:bg-slate-900`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-100">{insight.title}</span>
                <span
                  className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SEVERITY_STYLES[insight.severity] || SEVERITY_STYLES.unknown}`}
                >
                  {insight.severity}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">{insight.detail}</p>
              <span className="mt-0.5 text-[11px] text-slate-600">{relativeTime(insight.timestamp)}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
