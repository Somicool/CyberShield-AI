import { useState } from 'react'
import { ChevronRight } from 'lucide-react'

/**
 * Collapsible section in the graph workspace palette. Collapsed by default so
 * the canvas keeps the page's visual weight.
 */
export default function GraphSection({ icon: Icon, title, hint, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="overflow-hidden rounded-lg border border-white/10 bg-[#111722]/82 backdrop-blur-md">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <ChevronRight size={14} className={`text-zinc-500 transition-transform ${open ? 'rotate-90' : ''}`} />
        {Icon && <Icon size={14} className="text-zinc-500" />}
        <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-zinc-300">{title}</span>
        {hint && <span className="text-[12.5px] text-zinc-500">· {hint}</span>}
      </button>
      {open && <div className="border-t border-white/5 px-3 py-3">{children}</div>}
    </section>
  )
}
