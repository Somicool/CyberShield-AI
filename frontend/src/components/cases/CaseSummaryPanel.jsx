import { useEffect, useState, useCallback } from 'react'
import { X, FolderOpen, FileText, Share2, Paperclip } from 'lucide-react'
import ThreatBadge from '../ThreatBadge'
import CaseStatusBadge from './CaseStatusBadge'
import CasePriorityRibbon from './CasePriorityRibbon'
import CaseTimeline from './CaseTimeline'
import AICaseSummary from './AICaseSummary'
import RelatedCases from './RelatedCases'
import AssignOfficerMenu from './AssignOfficerMenu'
import EvidenceVault from './EvidenceVault'
import { Skeleton } from './Skeleton'
import { getIncident, getGraphConnections } from '../../api/incidents'
import {
  deriveCaseId,
  detectionConfidence,
  domainForIncident,
  CASE_STATUSES,
} from '../../lib/caseHelpers'

function Stat({ label, children }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm text-slate-200">{children}</div>
    </div>
  )
}

const PanelBtn =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700'

/**
 * Section 5 — sticky Case Summary Panel. Loads the full incident detail and,
 * for cases with a resolvable domain, queries the Neo4j graph to populate
 * linked-entity and related-case intelligence. Composes the priority ribbon,
 * timeline, AI summary and related cases.
 */
export default function CaseSummaryPanel({
  incident,
  meta,
  onClose,
  onOpenInvestigation,
  onViewGraph,
  onGenerateReport,
  onChangeStatus,
  onAssign,
  onOpenRelated,
}) {
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(true)
  const [graph, setGraph] = useState({ linkedEntities: 0, related: [], loading: true, error: false })
  const [showEvidence, setShowEvidence] = useState(false)

  const caseId = deriveCaseId(incident)

  // Load full detail (investigation_data + ai_explanation) for the case.
  useEffect(() => {
    let cancelled = false
    setDetail(null)
    setDetailLoading(true)
    getIncident(incident.id)
      .then((d) => !cancelled && setDetail(d))
      .catch(() => !cancelled && setDetail(null))
      .finally(() => !cancelled && setDetailLoading(false))
    return () => {
      cancelled = true
    }
  }, [incident.id])

  // Correlate through the threat graph once we know the domain.
  const loadGraph = useCallback(async (dom) => {
    if (!dom) {
      setGraph({ linkedEntities: 0, related: [], loading: false, error: false })
      return
    }
    setGraph((g) => ({ ...g, loading: true, error: false }))
    try {
      const data = await getGraphConnections('Domain', dom)
      const connections = data.connections || []

      // Distinct linked entities (excluding the queried domain itself).
      const entityKeys = new Set(connections.map((c) => `${c.type}:${c.properties?.value}`))

      // Group by the incident that links them → related cases.
      const byIncident = new Map()
      for (const c of connections) {
        const iid = c.via_incident_id
        if (!iid || iid === incident.id) continue
        if (!byIncident.has(iid)) byIncident.set(iid, [])
        byIncident.get(iid).push(c)
      }

      const relatedIds = [...byIncident.keys()].slice(0, 6)
      const summaries = await Promise.all(
        relatedIds.map((iid) => getIncident(iid).catch(() => null))
      )

      const related = relatedIds.map((iid, idx) => {
        const conns = byIncident.get(iid)
        const shared = { Domain: [dom], Wallet: [], Email: [], TelegramHandle: [], Phone: [] }
        for (const c of conns) {
          if (shared[c.type] && c.properties?.value) shared[c.type].push(c.properties.value)
        }
        const sharedCount = 1 + conns.length
        const similarity = Math.min(99, 55 + sharedCount * 12)
        const summary = summaries[idx]
        return {
          incidentId: iid,
          caseId: summary ? deriveCaseId(summary) : `CASE-${String(iid).slice(0, 6)}`,
          threatLevel: summary?.threat_level,
          similarity,
          shared,
        }
      })

      setGraph({ linkedEntities: entityKeys.size, related, loading: false, error: false })
    } catch {
      setGraph({ linkedEntities: 0, related: [], loading: false, error: true })
    }
  }, [incident.id])

  useEffect(() => {
    const dom = domainForIncident(detail || incident)
    loadGraph(dom)
  }, [detail, incident, loadGraph])

  const confidence = detectionConfidence(detail || incident)
  const timelineStamps = {
    submitted: incident.created_at,
    detected: incident.created_at,
    intel: (detail?.investigation_data?.investigation ? meta.timeline?.intel || incident.created_at : meta.timeline?.intel),
    ...meta.timeline,
  }
  const evidenceCount = meta.evidence?.length || 0

  return (
    <aside className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-200">Case Investigation Summary</h3>
        <button onClick={onClose} aria-label="Close panel" className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <CasePriorityRibbon
          caseId={caseId}
          threatLevel={incident.threat_level}
          confidence={confidence}
          linkedCases={graph.loading ? '…' : graph.related.length}
        />

        {/* Summary grid */}
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <Stat label="Threat Score">
            <span className="font-mono">{incident.risk_score?.toFixed(1) ?? '-'}/100</span>
          </Stat>
          <Stat label="Threat Type">{incident.incident_type}</Stat>
          <Stat label="Threat Level">
            <ThreatBadge level={incident.threat_level} />
          </Stat>
          <Stat label="Detection Confidence">{confidence != null ? `${confidence}%` : 'N/A'}</Stat>
          <Stat label="Citizen Submission">Public report</Stat>
          <Stat label="Detection Time">{new Date(incident.created_at).toLocaleString()}</Stat>
          <Stat label="Current Status">
            <div className="flex items-center gap-2">
              <CaseStatusBadge status={meta.status} />
            </div>
          </Stat>
          <Stat label="Assigned Officer">
            <div className="flex items-center gap-2">
              <span className={meta.assignedOfficer ? '' : 'text-slate-500'}>
                {meta.assignedOfficer || 'Unassigned'}
              </span>
              <AssignOfficerMenu
                current={meta.assignedOfficer}
                onAssign={(name) => onAssign(incident.id, name)}
                trigger={<span className="cursor-pointer text-[11px] text-purple-400 hover:underline">change</span>}
              />
            </div>
          </Stat>
          <Stat label="Linked Entities">{graph.loading ? '…' : graph.linkedEntities}</Stat>
          <Stat label="Similar Cases">{graph.loading ? '…' : graph.related.length}</Stat>
          <Stat label="Evidence Count">{evidenceCount}</Stat>
        </div>

        {/* Update status control */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Update status</label>
          <select
            value={meta.status}
            onChange={(e) => onChangeStatus(incident.id, e.target.value)}
            className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm focus:border-purple-600 focus:outline-none"
          >
            {CASE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button className={PanelBtn} onClick={() => onOpenInvestigation(incident)}>
            <FolderOpen size={14} /> Open Investigation
          </button>
          <button className={PanelBtn} onClick={() => setShowEvidence(true)}>
            <Paperclip size={14} /> View Evidence
          </button>
          <button className={PanelBtn} onClick={() => onViewGraph(incident)}>
            <Share2 size={14} /> View Threat Graph
          </button>
          <button className={PanelBtn} onClick={() => onGenerateReport(detail || incident)}>
            <FileText size={14} /> Generate AI Report
          </button>
        </div>

        {/* AI summary */}
        {detailLoading ? <Skeleton className="h-28 w-full" /> : <AICaseSummary incident={detail || incident} />}

        {/* Timeline */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h4 className="mb-3 text-sm font-semibold text-slate-200">Investigation Timeline</h4>
          <CaseTimeline stamps={timelineStamps} />
        </div>

        {/* Related cases */}
        <RelatedCases
          items={graph.related}
          loading={graph.loading}
          error={graph.error}
          onOpen={onOpenRelated}
        />
      </div>

      {showEvidence && (
        <EvidenceVault
          incident={incident}
          detail={detail}
          meta={meta}
          onClose={() => setShowEvidence(false)}
        />
      )}
    </aside>
  )
}
