import { ArrowRight, Radar, ShieldCheck } from 'lucide-react'
import { relativeTime } from '../../lib/intel'

const CHIP = {
  critical: 'border-red-400/35 text-red-300',
  high: 'border-amber-400/35 text-amber-300',
  medium: 'border-white/12 text-zinc-300',
  low: 'border-emerald-400/30 text-emerald-300',
  unknown: 'border-white/12 text-zinc-400',
}

/**
 * AI intelligence summary — the three findings that matter most right now.
 *
 * Every item is a real pattern derived from current incident data
 * (lib/intel.js). Clicking one pivots the threat table's search to the
 * incidents behind it; the complete set stays one click away.
 */
export default function IntelSummary({ items = [], total = 0, onInspect, onViewAll }) {
  return (
    <section className="overflow-hidden rounded-lg border border-white/10 bg-[#111722]/82 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Radar size={14} className="text-zinc-500" />
          <h2 className="text-[14px] font-semibold uppercase tracking-[0.08em] text-zinc-300">
            AI Intelligence
          </h2>
          {total > items.length && (
            <span className="text-[12.5px] text-zinc-500">
              top {items.length} of {total} findings
            </span>
          )}
        </div>
        {total > 0 && (
          <button
            onClick={onViewAll}
            className="group inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-cyan-300/80 transition hover:text-cyan-200"
          >
            View All Intelligence
            <ArrowRight size={12} className="transition group-hover:translate-x-0.5" />
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="flex items-center gap-2 px-4 py-4 text-[13.5px] text-zinc-400">
          <ShieldCheck size={15} className="shrink-0 text-emerald-400/80" />
          No coordinated campaigns detected in recent activity. Monitoring continues.
        </p>
      ) : (
        <ul className="divide-y divide-white/5">
          {items.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onInspect?.(item)}
                className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition hover:bg-white/4"
              >
                <span
                  className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] ${
                    CHIP[item.severity] || CHIP.unknown
                  }`}
                >
                  {item.severity}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-zinc-100">{item.title}</span>
                  <span className="block truncate text-[13px] text-zinc-500">{item.detail}</span>
                </span>
                <span className="shrink-0 pt-0.5 text-[12.5px] text-zinc-500">
                  {relativeTime(item.timestamp)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
