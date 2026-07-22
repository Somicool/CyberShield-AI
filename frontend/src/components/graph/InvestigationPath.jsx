import { useState } from 'react'
import { Route, ArrowDown, X } from 'lucide-react'
import { typeLabel, typeColor, displayValue } from '../../lib/graphModel'

/**
 * Section 7 — Investigation Path. Computes and displays the shortest
 * connection path between two entities over the REAL loaded graph (BFS). If
 * no connection exists in the loaded data, that is stated honestly.
 */
export default function InvestigationPath({ nodes = [], path, computed, onTrace, onClear, onFocus }) {
  const [source, setSource] = useState('')
  const [target, setTarget] = useState('')

  const options = nodes.map((n) => (
    <option key={n.id} value={n.id}>
      {typeLabel(n.type)}: {displayValue(n.type, n.value)}
    </option>
  ))

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select value={source} onChange={(e) => setSource(e.target.value)} className="min-w-[160px] flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm focus:border-purple-600 focus:outline-none">
          <option value="">From entity…</option>
          {options}
        </select>
        <select value={target} onChange={(e) => setTarget(e.target.value)} className="min-w-[160px] flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm focus:border-purple-600 focus:outline-none">
          <option value="">To entity…</option>
          {options}
        </select>
        <button
          onClick={() => source && target && onTrace(source, target)}
          disabled={!source || !target}
          className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-purple-500 disabled:opacity-50"
        >
          <Route size={15} /> Trace
        </button>
        {computed && (
          <button onClick={onClear} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200">
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {computed && (path?.length ? (
        <ol className="space-y-1">
          {path.map((n, i) => (
            <li key={n.id}>
              <button
                onClick={() => onFocus?.(n.id)}
                className="flex w-full items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-900"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: typeColor(n.type) }} />
                <span className="text-slate-400">{typeLabel(n.type)}:</span>
                {displayValue(n.type, n.value)}
              </button>
              {i < path.length - 1 && (
                <div className="flex justify-center py-0.5 text-slate-600">
                  <ArrowDown size={13} />
                </div>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-slate-500">No connection path exists between these entities in the loaded graph.</p>
      ))}
    </div>
  )
}
