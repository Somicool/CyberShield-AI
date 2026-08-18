import { ChevronDown } from 'lucide-react'
import { SkeletonRows } from './Skeleton'

/**
 * A clickable severity group (Urgent/Critical, Medium, Low). Clicking the
 * header opens that group and reveals its cases as boxes.
 */
const TONE = {
  urgent: {
    dot: 'bg-red-400',
    ring: 'border-red-500/25',
    open: 'border-red-500/40',
    count: 'bg-red-500/12 text-red-300 border-red-500/30',
    icon: 'text-red-300',
  },
  medium: {
    dot: 'bg-amber-400',
    ring: 'border-amber-500/20',
    open: 'border-amber-500/35',
    count: 'bg-amber-500/12 text-amber-300 border-amber-500/30',
    icon: 'text-amber-300',
  },
  low: {
    dot: 'bg-emerald-400',
    ring: 'border-emerald-500/20',
    open: 'border-emerald-500/35',
    count: 'bg-emerald-500/12 text-emerald-300 border-emerald-500/30',
    icon: 'text-emerald-300',
  },
}

export default function SeveritySection({
  tone = 'medium',
  icon: Icon,
  title,
  subtitle,
  count,
  open,
  loading,
  onToggle,
  children,
}) {
  const t = TONE[tone] || TONE.medium

  return (
    <section className={`overflow-hidden rounded-lg border bg-[#111722]/82 backdrop-blur-md transition ${open ? t.open : t.ring}`}>
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-white/3"
      >
        <ChevronDown
          size={16}
          className={`shrink-0 text-zinc-500 transition-transform ${open ? '' : '-rotate-90'}`}
        />
        {Icon && <Icon size={17} className={`shrink-0 ${t.icon}`} />}
        <span className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${t.dot}`} />
          <span className="text-[15.5px] font-semibold tracking-tight text-zinc-100">{title}</span>
        </span>
        <span className="hidden text-[13px] text-zinc-500 sm:inline">{subtitle}</span>
        <span
          className={`ml-auto shrink-0 rounded-full border px-2.5 py-0.5 text-[13px] font-semibold tabular-nums ${t.count}`}
        >
          {count}
        </span>
      </button>

      {open && (
        <div className="border-t border-white/5 p-4">
          {loading ? (
            <div className="overflow-hidden rounded-lg border border-white/6">
              <table className="w-full">
                <tbody><SkeletonRows rows={2} cols={3} /></tbody>
              </table>
            </div>
          ) : count === 0 ? (
            <p className="py-6 text-center text-[14px] text-zinc-500">
              No cases in this category.
            </p>
          ) : (
            children
          )}
        </div>
      )}
    </section>
  )
}
