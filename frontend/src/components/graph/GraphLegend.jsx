import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { NODE_TYPES } from '../../lib/graphModel'

const RELATIONSHIPS = [
  ['Appears In', 'Entity was observed in an incident'],
  ['Observed Together', 'Entities seen in the same incident'],
]

const THREATS = [
  ['Critical', '#f87171'],
  ['High', '#fb923c'],
  ['Medium', '#facc15'],
  ['Low', '#34d399'],
]

/**
 * Section 11 — collapsible legend: node colours/icons, relationship meanings
 * and threat colours.
 */
export default function GraphLegend() {
  const [open, setOpen] = useState(true)

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
      >
        <ChevronDown size={15} className={`text-slate-500 transition-transform ${open ? '' : '-rotate-90'}`} />
        <span className="text-sm font-semibold text-slate-200">Legend</span>
      </button>
      {open && (
        <div className="grid gap-4 border-t border-slate-800 px-4 py-3 sm:grid-cols-3">
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">Node Types</p>
            <ul className="space-y-1.5">
              {Object.entries(NODE_TYPES).map(([type, meta]) => (
                <li key={type} className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-slate-900" style={{ background: meta.color }}>
                    {meta.glyph}
                  </span>
                  {meta.label}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">Relationships</p>
            <ul className="space-y-1.5">
              {RELATIONSHIPS.map(([rel, desc]) => (
                <li key={rel} className="text-xs text-slate-300">
                  <span className="font-medium text-slate-200">{rel}</span>
                  <span className="text-slate-500"> — {desc}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">Threat Levels</p>
            <ul className="space-y-1.5">
              {THREATS.map(([label, color]) => (
                <li key={label} className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="h-3 w-3 rounded-full" style={{ background: color }} />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
