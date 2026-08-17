import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

/**
 * Shared presentation primitives for the redesigned Command Center dashboard.
 *
 * Visual language: graphite surfaces, hairline borders, no glow/neon, a single
 * muted amber accent. Flat and editorial rather than heavily boxed.
 */

export function Panel({ children, className = '' }) {
  return (
    <section
      className={`overflow-hidden rounded-lg border border-white/7 bg-white/2 ${className}`}
    >
      {children}
    </section>
  )
}

export function PanelHead({ title, hint, action }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-2.5">
      <div className="flex items-baseline gap-2 min-w-0">
        <h3 className="truncate text-[12.5px] font-semibold uppercase tracking-[0.08em] text-zinc-300">
          {title}
        </h3>
        {hint && <span className="shrink-0 text-[11px] text-zinc-500">{hint}</span>}
      </div>
      {action}
    </div>
  )
}

/** Subtle amber "go to the full dataset" link used in every panel header. */
export function PanelLink({ to, children }) {
  return (
    <Link
      to={to}
      className="group inline-flex shrink-0 items-center gap-1 text-[11.5px] font-medium text-amber-300/80 transition hover:text-amber-200"
    >
      {children}
      <ArrowRight size={12} className="transition group-hover:translate-x-0.5" />
    </Link>
  )
}

/** Severity dot — red reserved for critical, amber for high, neutral below. */
export function SeverityDot({ level, className = '' }) {
  const color =
    level === 'critical'
      ? 'bg-red-400'
      : level === 'high'
        ? 'bg-amber-400'
        : level === 'medium'
          ? 'bg-zinc-400'
          : level === 'low'
            ? 'bg-emerald-400'
            : 'bg-zinc-600'
  return <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${color} ${className}`} />
}

export function EmptyLine({ children }) {
  return <p className="px-4 py-6 text-center text-[12.5px] text-zinc-500">{children}</p>
}
