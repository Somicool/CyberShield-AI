import { useState } from 'react'
import { ChevronRight, Filter } from 'lucide-react'
import { typeLabel, typeColor } from '../../lib/graphModel'

/**
 * Filters — collapsed by default so the officer reaches the graph first.
 * Type, relationship, minimum-connections and hide-isolated all operate on the
 * loaded graph in real time. Threat Level and Date Range read "Not Available"
 * because the graph backend exposes neither per-node threat nor timestamps.
 */
export default function GraphFilters({ value, onChange, availableTypes, availableRels }) {
  const [open, setOpen] = useState(false)
  const set = (patch) => onChange({ ...value, ...patch })

  const toggleSet = (key, item) => {
    const next = new Set(value[key])
    next.has(item) ? next.delete(item) : next.add(item)
    set({ [key]: next })
  }

  const chip = (visible) =>
    `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] transition ${
      visible
        ? 'border-white/15 bg-white/5 text-zinc-200'
        : 'border-white/8 bg-transparent text-zinc-600'
    }`

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-[#111722]/82 backdrop-blur-md">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <ChevronRight size={14} className={`text-zinc-500 transition-transform ${open ? 'rotate-90' : ''}`} />
        <Filter size={14} className="text-zinc-500" />
        <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-zinc-300">Filters</span>
      </button>

      {open && (
        <div className="grid gap-4 border-t border-white/5 px-3 py-3 md:grid-cols-2">
          <div>
            <p className="mb-2 text-[11.5px] uppercase tracking-[0.08em] text-zinc-500">Entity Types</p>
            <div className="flex flex-wrap gap-1.5">
              {availableTypes.map((t) => {
                const visible = !value.hiddenTypes.has(t)
                return (
                  <button key={t} onClick={() => toggleSet('hiddenTypes', t)} className={chip(visible)}>
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: visible ? typeColor(t) : '#52525b' }}
                    />
                    {typeLabel(t)}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11.5px] uppercase tracking-[0.08em] text-zinc-500">Relationship Types</p>
            <div className="flex flex-wrap gap-1.5">
              {availableRels.map((r) => {
                const visible = !value.hiddenRels.has(r)
                return (
                  <button key={r} onClick={() => toggleSet('hiddenRels', r)} className={chip(visible)}>
                    {r}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[12.5px] text-zinc-400">Minimum connections</label>
            <input
              type="number"
              min={0}
              value={value.minConnections}
              onChange={(e) => set({ minConnections: Math.max(0, Number(e.target.value) || 0) })}
              className="w-20 rounded-md border border-white/10 bg-black/35 px-2 py-1 text-[13px] text-zinc-200 outline-none focus:border-cyan-400/40"
            />
          </div>

          <label className="flex items-center gap-2 text-[12.5px] text-zinc-300">
            <input
              type="checkbox"
              checked={value.hideIsolated}
              onChange={(e) => set({ hideIsolated: e.target.checked })}
              className="h-3.5 w-3.5 accent-cyan-400"
            />
            Hide isolated nodes
          </label>

          <div className="text-[12.5px] text-zinc-500">
            Threat Level: <span className="text-zinc-400">Not Available</span>
          </div>
          <div className="text-[12.5px] text-zinc-500">
            Date Range: <span className="text-zinc-400">Not Available</span>
          </div>
        </div>
      )}
    </div>
  )
}
