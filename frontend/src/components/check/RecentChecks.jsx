import { Link, useNavigate } from 'react-router-dom'
import { History, ArrowRight } from 'lucide-react'
import { relativeTime } from '../../lib/intel'

const TYPE_LABEL = { url: 'URL', email: 'Email', sms: 'SMS', qr: 'QR' }

const RESULT = {
  critical: { label: 'Critical', cls: 'text-red-300' },
  high: { label: 'High Risk', cls: 'text-red-300' },
  medium: { label: 'Suspicious', cls: 'text-amber-300' },
  low: { label: 'Safe', cls: 'text-emerald-300' },
}

/**
 * The latest few checks, from the existing /incidents list API. Deliberately
 * a short summary — the complete stream stays on the Live Feed page.
 */
export default function RecentChecks({ items = [], loading }) {
  const navigate = useNavigate()

  return (
    <section className="overflow-hidden rounded-lg border border-white/7 bg-white/2">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
        <h3 className="inline-flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-zinc-300">
          <History size={14} className="text-amber-300/70" /> Recent Checks
        </h3>
        <Link
          to="/dashboard/feed"
          className="group inline-flex items-center gap-1 text-[11.5px] font-medium text-amber-300/80 transition hover:text-amber-200"
        >
          View All
          <ArrowRight size={12} className="transition group-hover:translate-x-0.5" />
        </Link>
      </div>

      {loading ? (
        <p className="px-4 py-5 text-[12.5px] text-zinc-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="px-4 py-5 text-[12.5px] text-zinc-500">No checks recorded yet.</p>
      ) : (
        <div className="divide-y divide-white/5">
          {/* column labels */}
          <div className="hidden grid-cols-[52px_1fr_46px_74px_62px] gap-3 px-4 py-1.5 text-[10px] uppercase tracking-[0.08em] text-zinc-600 sm:grid">
            <span>Type</span>
            <span>Content</span>
            <span className="text-right">Risk</span>
            <span>Result</span>
            <span className="text-right">Time</span>
          </div>

          {items.slice(0, 5).map((i) => {
            const r = RESULT[i.threat_level] || RESULT.low
            return (
              <button
                key={i.id}
                onClick={() => navigate(`/dashboard/incidents/${i.id}`)}
                className="grid w-full grid-cols-[52px_1fr_46px_74px_62px] items-center gap-3 px-4 py-2.5 text-left transition hover:bg-white/3"
              >
                <span className="text-[11.5px] text-zinc-400">
                  {TYPE_LABEL[i.incident_type] || i.incident_type}
                </span>
                <span className="truncate text-[12px] text-zinc-300" title={i.raw_content}>
                  {i.raw_content}
                </span>
                <span className="text-right font-mono text-[12px] tabular-nums text-zinc-300">
                  {i.risk_score?.toFixed(0) ?? '—'}
                </span>
                <span className={`text-[11.5px] font-medium ${r.cls}`}>{r.label}</span>
                <span className="text-right text-[11px] text-zinc-500">{relativeTime(i.created_at)}</span>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
