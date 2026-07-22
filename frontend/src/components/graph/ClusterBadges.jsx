import { Boxes } from 'lucide-react'
import { typeLabel } from '../../lib/graphModel'

const CONF = {
  High: 'bg-red-500/15 text-red-300 border-red-500/40',
  Medium: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  Low: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
}

/**
 * Section 8 — Cluster Detection. Each badge is a real connected component of
 * the graph containing multiple incidents (a candidate campaign). Nothing is
 * synthesised. Clicking focuses the cluster.
 */
export default function ClusterBadges({ clusters = [], onFocus }) {
  if (clusters.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {clusters.map((c) => (
        <button
          key={c.id}
          onClick={() => onFocus?.(c.nodeIds[0])}
          className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-left transition hover:bg-slate-900"
        >
          <Boxes size={16} className="text-purple-400" />
          <span className="text-sm text-slate-200">Campaign Cluster</span>
          <span className="text-xs text-slate-500">{c.incidentCount} linked cases</span>
          {c.sharedTypes.length > 0 && (
            <span className="text-[11px] text-slate-500">· shared {c.sharedTypes.map(typeLabel).join('/')}</span>
          )}
          <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase ${CONF[c.confidence]}`}>
            {c.confidence} confidence
          </span>
        </button>
      ))}
    </div>
  )
}
