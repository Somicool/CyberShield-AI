import { Boxes } from 'lucide-react'
import { typeLabel } from '../../lib/graphModel'

const CONF = {
  High: 'border-red-400/35 text-red-300',
  Medium: 'border-amber-400/35 text-amber-300',
  Low: 'border-white/12 text-zinc-400',
}

/**
 * Cluster detection. Each badge is a real connected component of the graph
 * containing multiple incidents (a candidate campaign). Clicking focuses it.
 */
export default function ClusterBadges({ clusters = [], onFocus }) {
  if (clusters.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {clusters.map((c) => (
        <button
          key={c.id}
          onClick={() => onFocus?.(c.nodeIds[0])}
          className="flex items-center gap-2 rounded-md border border-white/10 bg-[#111722]/82 px-2.5 py-1.5 text-left backdrop-blur-md transition hover:border-white/20"
        >
          <Boxes size={14} className="text-cyan-300/80" />
          <span className="text-[13px] text-zinc-200">Campaign cluster</span>
          <span className="text-[12.5px] text-zinc-500">{c.incidentCount} linked cases</span>
          {c.sharedTypes.length > 0 && (
            <span className="text-[12.5px] text-zinc-500">· shared {c.sharedTypes.map(typeLabel).join('/')}</span>
          )}
          <span className={`rounded border px-1.5 py-0.5 text-[11.5px] font-semibold uppercase ${CONF[c.confidence]}`}>
            {c.confidence}
          </span>
        </button>
      ))}
    </div>
  )
}
