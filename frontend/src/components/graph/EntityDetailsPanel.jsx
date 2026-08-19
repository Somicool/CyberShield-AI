import { useMemo, useState } from 'react'
import { X, FolderOpen, FileText, Crosshair, Copy, Network, Check } from 'lucide-react'
import ThreatBadge from '../ThreatBadge'
import { Skeleton } from '../cases/Skeleton'
import { buildAdjacency, typeLabel, typeColor, ENTITY_QUERY_TYPES } from '../../lib/graphModel'

const NA = 'Not Available'

function Stat({ label, children }) {
  return (
    <div className="min-w-0">
      <div className="text-[11.5px] uppercase tracking-[0.08em] text-cyan-300/85">{label}</div>
      <div className="mt-0.5 truncate text-[13.5px] text-zinc-200">{children}</div>
    </div>
  )
}

const BTN =
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-white/10 bg-black/35 px-2.5 py-2 text-[12.5px] font-medium text-zinc-200 transition hover:border-white/20 hover:text-zinc-50 disabled:opacity-40'

/**
 * Entity details — a compact panel beside the graph. Connected cases/entities
 * come from the loaded graph; risk and timestamps come from the fetched
 * incident. Anything the backend does not expose shows "Not Available".
 */
export default function EntityDetailsPanel({
  node,
  model,
  incidentDetail,
  loadingDetail,
  onClose,
  onOpenInvestigation,
  onViewCase,
  onCenter,
  onSearchRelated,
}) {
  const [copied, setCopied] = useState(false)

  const stats = useMemo(() => {
    if (!node) return { connectedCases: 0, connectedEntities: 0, incidentNeighbors: [], entityNeighbors: [] }
    const adj = buildAdjacency(model)
    const neighbors = [...(adj.get(node.id) || [])].map((id) => model.nodesById.get(id)).filter(Boolean)
    const entityNeighbors = neighbors.filter((n) => n.type !== 'Incident')
    const incidentNeighbors = neighbors.filter((n) => n.type === 'Incident')

    let connectedCases
    if (node.type === 'Incident') {
      const twoHop = new Set()
      for (const nb of neighbors) {
        for (const nn of adj.get(nb.id) || []) {
          const t = model.nodesById.get(nn)
          if (t && t.type === 'Incident' && t.id !== node.id) twoHop.add(t.id)
        }
      }
      connectedCases = twoHop.size
    } else {
      connectedCases = incidentNeighbors.length
    }
    return {
      connectedCases,
      connectedEntities: entityNeighbors.length,
      incidentNeighbors,
      entityNeighbors,
    }
  }, [node, model])

  if (!node) return null

  const isIncident = node.type === 'Incident'
  const canQuery = ENTITY_QUERY_TYPES.includes(node.type)
  const linkedIncidentId = isIncident ? node.value : stats.incidentNeighbors[0]?.value

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(node.value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <aside className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-white/8 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: typeColor(node.type) }} />
          <h3 className="truncate text-[13px] font-semibold uppercase tracking-[0.08em] text-zinc-300">
            {typeLabel(node.type)}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={copy}
            title="Copy value"
            aria-label="Copy value"
            className="rounded p-1 text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
          <button
            onClick={() => onCenter(node.id)}
            title="Center on graph"
            aria-label="Center on graph"
            className="rounded p-1 text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200"
          >
            <Crosshair size={14} />
          </button>
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="rounded p-1 text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        <div>
          <div className="text-[11.5px] uppercase tracking-[0.08em] text-cyan-300/85">Entity</div>
          <div className="mt-0.5 break-all font-mono text-[13px] text-zinc-100">
            {node.type === 'TelegramHandle' ? `@${node.value}` : node.value}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-white/5 pt-3">
          <Stat label="Risk Score">
            {loadingDetail ? (
              <Skeleton className="h-4 w-10" />
            ) : isIncident && incidentDetail ? (
              `${incidentDetail.risk_score?.toFixed(1)}/100`
            ) : (
              NA
            )}
          </Stat>
          <Stat label="Threat Level">
            {loadingDetail ? (
              <Skeleton className="h-4 w-14" />
            ) : isIncident && incidentDetail?.threat_level ? (
              <ThreatBadge level={incidentDetail.threat_level} />
            ) : (
              NA
            )}
          </Stat>
          <Stat label="Related Incidents">{isIncident ? stats.connectedCases : stats.incidentNeighbors.length}</Stat>
          <Stat label="Related Entities">{stats.connectedEntities}</Stat>
          <Stat label="First Observed">
            {loadingDetail ? (
              <Skeleton className="h-4 w-20" />
            ) : isIncident && incidentDetail ? (
              new Date(incidentDetail.created_at).toLocaleString()
            ) : (
              NA
            )}
          </Stat>
          <Stat label="Times Observed">{isIncident ? 1 : stats.incidentNeighbors.length}</Stat>
        </div>

        {stats.incidentNeighbors.length > 0 && !isIncident && (
          <div className="border-t border-white/5 pt-3">
            <div className="mb-1.5 text-[11.5px] uppercase tracking-[0.08em] text-cyan-300/85">Related Incidents</div>
            <ul className="space-y-1">
              {stats.incidentNeighbors.slice(0, 6).map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => onOpenInvestigation(n.value)}
                    className="w-full truncate rounded px-1 py-0.5 text-left font-mono text-[12.5px] text-cyan-200/85 transition hover:bg-white/5 hover:text-cyan-200"
                  >
                    {n.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {stats.entityNeighbors.length > 0 && (
          <div className="border-t border-white/5 pt-3">
            <div className="mb-1.5 text-[11.5px] uppercase tracking-[0.08em] text-cyan-300/85">Related Entities</div>
            <ul className="space-y-1">
              {stats.entityNeighbors.slice(0, 8).map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => onCenter(n.id)}
                    className="flex w-full items-center gap-2 truncate rounded px-1 py-0.5 text-left text-[12.5px] text-zinc-300 transition hover:bg-white/5 hover:text-zinc-100"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: typeColor(n.type) }} />
                    <span className="truncate">{n.label}</span>
                    <span className="ml-auto shrink-0 text-[11.5px] text-zinc-500">{typeLabel(n.type)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1.5 border-t border-white/8 p-3">
        <button className={BTN} onClick={() => linkedIncidentId && onOpenInvestigation(linkedIncidentId)} disabled={!linkedIncidentId}>
          <FolderOpen size={13} /> Investigate
        </button>
        <button className={BTN} onClick={() => linkedIncidentId && onViewCase(linkedIncidentId)} disabled={!linkedIncidentId}>
          <FileText size={13} /> View Case
        </button>
        <button
          className={BTN}
          onClick={() => onSearchRelated(node)}
          disabled={!canQuery}
          title={canQuery ? 'Expand related entities' : 'Not queryable via the graph endpoint'}
        >
          <Network size={13} /> Expand
        </button>
      </div>
    </aside>
  )
}
