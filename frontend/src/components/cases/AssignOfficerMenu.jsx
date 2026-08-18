import { useEffect, useRef, useState } from 'react'
import { UserPlus, Check } from 'lucide-react'
import { OFFICERS } from '../../lib/officers'

/**
 * Dropdown for assigning a case to an officer. Fully keyboard accessible
 * (Escape to close, focusable options) and closes on outside click.
 *
 * `trigger` lets callers render their own button; if omitted a default
 * "Assign" button is shown.
 */
export default function AssignOfficerMenu({ current, onAssign, trigger, align = 'right' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function pick(name) {
    onAssign(name)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            e.stopPropagation()
            setOpen((o) => !o)
          }
        }}
      >
        {trigger || (
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800/75 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700">
            <UserPlus size={13} /> Assign
          </span>
        )}
      </span>

      {open && (
        <div
          className={`absolute z-30 mt-1 max-h-64 w-56 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900/80 py-1 shadow-xl ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          {OFFICERS.map((o) => (
            <button
              key={o.id}
              role="menuitem"
              onClick={() => pick(o.name)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-slate-800/75"
            >
              <span>
                <span className="block text-slate-200">{o.name}</span>
                <span className="block text-[12.5px] text-slate-500">{o.unit}</span>
              </span>
              {current === o.name && <Check size={14} className="text-emerald-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
