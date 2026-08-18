import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { NODE_TYPES } from '../../lib/graphModel'

const RELATIONSHIPS = [
  ['Appears In', 'Entity was observed in an incident'],
  ['Observed Together', 'Entities seen in the same incident'],
]

/**
 * Legend — collapsed by default. Node colours/glyphs, relationship meanings and
 * the one risk marker the canvas draws.
 */
export default function GraphLegend() {
  const [open, setOpen] = useState(false)

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-[#111722]/82 backdrop-blur-md">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <ChevronRight size={14} className={`text-zinc-500 transition-transform ${open ? 'rotate-90' : ''}`} />
        <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-zinc-300">Legend</span>
      </button>

      {open && (
        <div className="grid gap-4 border-t border-white/5 px-3 py-3 sm:grid-cols-3">
          <div>
            <p className="mb-2 text-[11.5px] uppercase tracking-[0.08em] text-zinc-500">Node Types</p>
            <ul className="grid grid-cols-2 gap-1.5">
              {Object.entries(NODE_TYPES).map(([type, meta]) => (
                <li key={type} className="flex items-center gap-2 text-[12.5px] text-zinc-300">
                  <span
                    className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-[#0a0f18]"
                    style={{ background: meta.color }}
                  >
                    {meta.glyph}
                  </span>
                  {meta.label}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-[11.5px] uppercase tracking-[0.08em] text-zinc-500">Relationships</p>
            <ul className="space-y-1.5">
              {RELATIONSHIPS.map(([rel, desc]) => (
                <li key={rel} className="text-[12.5px] text-zinc-300">
                  <span className="font-medium text-zinc-200">{rel}</span>
                  <span className="text-zinc-500"> — {desc}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-[11.5px] uppercase tracking-[0.08em] text-zinc-500">Markers</p>
            <ul className="space-y-1.5 text-[12.5px] text-zinc-300">
              <li className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border" style={{ borderColor: 'rgba(234,140,72,0.85)' }} />
                Reused across investigations
              </li>
              <li className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border border-zinc-100/80" />
                Selected / search origin
              </li>
              <li className="text-zinc-500">Per-node threat level: Not Available</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
