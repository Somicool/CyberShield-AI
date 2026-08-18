import { useState } from 'react'
import { Route, ArrowDown, X } from 'lucide-react'
import { typeLabel, typeColor, displayValue } from '../../lib/graphModel'

const field =
  'h-9 min-w-40 flex-1 rounded-md border border-white/10 bg-black/35 px-2.5 text-[13px] text-zinc-200 outline-none transition focus:border-cyan-400/40'

/**
 * Investigation Path. Computes and displays the shortest connection path
 * between two entities over the REAL loaded graph (BFS). If no connection
 * exists in the loaded data, that is stated honestly.
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
        <select value={source} onChange={(e) => setSource(e.target.value)} className={field} aria-label="Path source">
          <option value="">From entity…</option>
          {options}
        </select>
        <select value={target} onChange={(e) => setTarget(e.target.value)} className={field} aria-label="Path target">
          <option value="">To entity…</option>
          {options}
        </select>
        <button
          onClick={() => source && target && onTrace(source, target)}
          disabled={!source || !target}
          className="btn-primary h-9 px-3 text-[13px]"
        >
          <Route size={14} /> Trace
        </button>
        {computed && (
          <button onClick={onClear} className="inline-flex items-center gap-1 text-[12.5px] text-zinc-500 hover:text-zinc-300">
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {computed &&
        (path?.length ? (
          <ol className="space-y-1">
            {path.map((n, i) => (
              <li key={n.id}>
                <button
                  onClick={() => onFocus?.(n.id)}
                  className="flex w-full items-center gap-2 rounded-md border border-white/8 bg-black/20 px-3 py-2 text-left text-[13px] text-zinc-200 transition hover:border-white/15"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: typeColor(n.type) }} />
                  <span className="text-zinc-500">{typeLabel(n.type)}:</span>
                  <span className="truncate">{displayValue(n.type, n.value)}</span>
                </button>
                {i < path.length - 1 && (
                  <div className="flex justify-center py-0.5 text-zinc-600">
                    <ArrowDown size={13} />
                  </div>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-[13px] text-zinc-500">
            No connection path exists between these entities in the loaded graph.
          </p>
        ))}
    </div>
  )
}
