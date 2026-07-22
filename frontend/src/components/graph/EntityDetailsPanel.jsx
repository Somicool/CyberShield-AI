import { useMemo, useState } from 'react'
import { X, FolderOpen, Crosshair, Copy, Search, Check } from 'lucide-react'
import ThreatBadge from '../ThreatBadge'
import { Skeleton } from '../cases/Skeleton'
import { buildAdjacency, typeLabel, typeColor, ENTITY_QUERY_TYPES } from '../../lib/graphModel'

const NA = 'Not Available'

function Stat({ label, children }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm text-slate-200">{children}</div>
    </div>
  )
}

const Btn = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700 disabled:opacity-40'

/**
 * Section 5 — Entity Details Panel. Real values come from the graph model
 * (connected cases/entities, times observed) and, for Incident nodes, from a
 * fetched incident detail (risk, threat, timestamps). Unknown fields show
 * "Not Available" rather than fabricated data.
 */
export default function EntityDetailsPanel({
  node,
  model,
  incidentDetail,
  loadingDetail,
  onClose,
  onOpenInvestigation,
  onCenter,
  onSearchRelated,
}) {
  const [copied, setCopied] = useState(false)

  const stats = useMemo(() => {
    if (!node) return { connectedCases: 0, connectedEntities: 0 }
    const adj = buildAdjacency(model)
    const neighbors = [...(adj.get(node.id) || [])].map((id) => model.nodesById.get(id)).filter(Boolean)
    const connectedEntities = neighbors.filter((n) => n.type !== 'Incident').length
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
      connectedCases = neighbors.filter((n) => n.type === 'Incident').length
    }
    return { connectedCases, connectedEntities, incidentNeighbors: neighbors.filter((n) => n.type === 'Incident') }
  }, [node, model])

  if (!node) return null

  const isIncident = node.type === 'Incident'
  const canQuery = ENTITY_QUERY_TYPES.includes(node.type)
  const timesObserved = isIncident ? 1 : stats.connectedCases

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(node.value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  const openInvestigation = () => {
    if (isIncident) onOpenInvestigation(node.value)
    else if (stats.incidentNeighbors?.length) onOpenInvestigation(stats.incidentNeighbors[0].value)
  }

  return (
    <aside className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ background: typeColor(node.type) }} />
          <h3 className="text-sm font-semibold text-slate-200">Entity Intelligence</h3>
        </div>
        <button onClick={onClose} aria-label="Close panel" className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Entity Value</div>
          <div className="mt-0.5 break-all font-mono text-sm text-slate-100">
            {node.type === 'TelegramHandle' ? `@${node.value}` : node.value}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <Stat label="Entity Type">{typeLabel(node.type)}</Stat>
          <Stat label="Times Observed">{timesObserved}</Stat>
          <Stat label="Risk Score">
            {loadingDetail ? <Skeleton className="h-4 w-10" /> : isIncident && incidentDetail ? `${incidentDetail.risk_score?.toFixed(1)}/100` : NA}
          </Stat>
          <Stat label="Threat Level">
            {loadingDetail ? <Skeleton className="h-4 w-14" /> : isIncident && incidentDetail?.threat_level ? <ThreatBadge level={incidentDetail.threat_level} /> : NA}
          </Stat>
          <Stat label="First Seen">
            {loadingDetail ? <Skeleton className="h-4 w-20" /> : isIncident && incidentDetail ? new Date(incidentDetail.created_at).toLocaleString() : NA}
          </Stat>
          <Stat label="Last Seen">
            {loadingDetail ? <Skeleton className="h-4 w-20" /> : isIncident && incidentDetail ? new Date(incidentDetail.created_at).toLocaleString() : NA}
          </Stat>
          <Stat label="Connected Cases">{stats.connectedCases}</Stat>
          <Stat label="Connected Entities">{stats.connectedEntities}</Stat>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button className={Btn} onClick={openInvestigation} disabled={!isIncident && !stats.incidentNeighbors?.length}>
            <FolderOpen size={14} /> Open Investigation
          </button>
          <button className={Btn} onClick={() => onCenter(node.id)}>
            <Crosshair size={14} /> Center Graph
          </button>
          <button className={Btn} onClick={copy}>
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy Value'}
          </button>
          <button className={Btn} onClick={() => onSearchRelated(node)} disabled={!canQuery} title={canQuery ? 'Expand related entities' : 'Not queryable via the graph endpoint'}>
            <Search size={14} /> Search Related
          </button>
        </div>

        {!canQuery && !isIncident && (
          <p className="text-[11px] text-slate-600">This node type cannot be expanded through the current graph endpoint.</p>
        )}
      </div>
    </aside>
  )
}
