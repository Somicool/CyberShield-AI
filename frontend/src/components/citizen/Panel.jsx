import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

/**
 * Shared presentation primitives for the citizen portal.
 *
 * Same structural language as the police command center (compact headers,
 * hairline borders, frosted translucent surfaces, uppercase section heads) so
 * the two sides of the platform feel like one product — but rendered in the
 * citizen navy/periwinkle theme, with slightly softer radii and roomier text
 * because the audience is the public, not a trained operator.
 */

/** Compact page header — title, one-line subtitle, optional right-hand action. */
export function PageHeader({ title, subtitle, action }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[19px] font-semibold tracking-tight text-slate-50">{title}</h1>
        {subtitle && <p className="text-[13.5px] text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}

export function Panel({ children, className = '' }) {
  return (
    <section
      className={`overflow-hidden rounded-xl border border-white/10 bg-slate-900/80 backdrop-blur-md ${className}`}
    >
      {children}
    </section>
  )
}

export function PanelHead({ title, hint, action }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/6 px-4 py-2.5">
      <div className="flex min-w-0 items-baseline gap-2">
        <h2 className="truncate text-[13.5px] font-semibold uppercase tracking-[0.08em] text-slate-300">
          {title}
        </h2>
        {hint && <span className="shrink-0 text-[12.5px] text-slate-500">{hint}</span>}
      </div>
      {action}
    </div>
  )
}

/** Accent "go somewhere else" link used in panel headers. */
export function PanelLink({ to, children }) {
  return (
    <Link
      to={to}
      className="group inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-cyan-300/85 transition hover:text-cyan-200"
    >
      {children}
      <ArrowRight size={12} className="transition group-hover:translate-x-0.5" />
    </Link>
  )
}

export function EmptyLine({ children }) {
  return <p className="px-4 py-8 text-center text-[13.5px] text-slate-500">{children}</p>
}

/** Label / value row used by detail panels. */
export function Row({ label, children }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 px-4 py-2.5">
      <span className="w-36 shrink-0 text-[12px] uppercase tracking-[0.08em] text-slate-500">{label}</span>
      <span className="min-w-0 flex-1 text-[14px] text-slate-200">{children}</span>
    </div>
  )
}
