import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * Collapsible investigation section with a titled header. Keyboard
 * accessible (button toggles, aria-expanded) and used throughout the
 * workspace to keep the long page scannable.
 */
export default function Section({ icon: Icon, title, subtitle, right, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
      <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <ChevronDown
            size={16}
            className={`text-slate-500 transition-transform ${open ? '' : '-rotate-90'}`}
          />
          {Icon && <Icon size={16} className="text-purple-400" />}
          <span className="text-sm font-semibold tracking-wide text-slate-200">{title}</span>
          {subtitle && <span className="text-xs text-slate-500">· {subtitle}</span>}
        </button>
        {right}
      </div>
      {open && <div className="p-4">{children}</div>}
    </section>
  )
}
