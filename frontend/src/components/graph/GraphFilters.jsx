import { useState } from 'react'
import { ChevronDown, Filter } from 'lucide-react'
import { typeLabel, typeColor } from '../../lib/graphModel'

/**
 * Section 10 — Filters. Type, relationship, minimum-connections and
 * hide-isolated all operate on the loaded graph in real time. Threat Level
 * and Date Range are shown as "Not Available" because the current graph
 * backend exposes neither per-node threat nor timestamps.
 */
export default function GraphFilters({ value, onChange, availableTypes, availableRels }) {
  const [open, setOpen] = useState(false)
  const set = (patch) => onChange({ ...value, ...patch })

  const toggleSet = (key, item) => {
    const next = new Set(value[key])
    next.has(item) ? next.delete(item) : next.add(item)
    set({ [key]: next })
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-2 px-4 py-2.5 text-left">
        <ChevronDown size={15} className={`text-slate-500 transition-transform ${open ? '' : '-rotate-90'}`} />
        <Filter size={15} className="text-slate-400" />
        <span className="text-sm font-semibold text-slate-200">Filters</span>
      </button>

      {open && (
        <div className="grid gap-4 border-t border-slate-800 px-4 py-3 md:grid-cols-2">
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">Entity Types</p>
            <div className="flex flex-wrap gap-1.5">
              {availableTypes.map((t) => {
                const visible = !value.hiddenTypes.has(t)
                return (
                  <button
                    key={t}
                    onClick={() => toggleSet('hiddenTypes', t)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
                      visible ? 'border-slate-600 bg-slate-800 text-slate-200' : 'border-slate-800 bg-slate-900 text-slate-600'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: visible ? typeColor(t) : '#475569' }} />
                    {typeLabel(t)}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">Relationship Types</p>
            <div className="flex flex-wrap gap-1.5">
              {availableRels.map((r) => {
                const visible = !value.hiddenRels.has(r)
                return (
                  <button
                    key={r}
                    onClick={() => toggleSet('hiddenRels', r)}
                    className={`rounded-full border px-2.5 py-1 text-xs transition ${
                      visible ? 'border-slate-600 bg-slate-800 text-slate-200' : 'border-slate-800 bg-slate-900 text-slate-600'
                    }`}
                  >
                    {r}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Minimum connections</label>
            <input
              type="number"
              min={0}
              value={value.minConnections}
              onChange={(e) => set({ minConnections: Math.max(0, Number(e.target.value) || 0) })}
              className="w-20 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-sm focus:border-purple-600 focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={value.hideIsolated}
              onChange={(e) => set({ hideIsolated: e.target.checked })}
              className="h-4 w-4 accent-purple-600"
            />
            Hide isolated nodes
          </label>

          <div className="text-xs text-slate-500">
            Threat Level: <span className="text-slate-400">Not Available</span>
          </div>
          <div className="text-xs text-slate-500">
            Date Range: <span className="text-slate-400">Not Available</span>
          </div>
        </div>
      )}
    </div>
  )
}
