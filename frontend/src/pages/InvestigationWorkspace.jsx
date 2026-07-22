import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Sparkles,
  Cpu,
  Radar,
  Network,
  ListChecks,
  Clock,
  NotebookPen,
  Boxes,
  AlertCircle,
} from 'lucide-react'
import { getIncident, getGraphConnections, investigateIncident } from '../api/incidents'
import {
  useCaseWorkflow,
  getCaseMeta,
  setStatus,
  assignOfficer,
  setNotes,
  stampTimeline,
} from '../lib/caseWorkflow'
import {
  deriveCaseId,
  detectionConfidence,
  domainForIncident,
  openInvestigationReport,
  CASE_STATUSES,
} from '../lib/caseHelpers'
import { extractEntities } from '../lib/entities'
import { buildBriefing } from '../lib/briefing'
import { Skeleton } from '../components/cases/Skeleton'
import RelatedCases from '../components/cases/RelatedCases'
import CaseTimeline from '../components/cases/CaseTimeline'
import AssignOfficerMenu from '../components/cases/AssignOfficerMenu'
import Section from '../components/investigation/Section'
import InvestigationHeader from '../components/investigation/InvestigationHeader'
import BriefingPanel from '../components/investigation/BriefingPanel'
import AISummarySection from '../components/investigation/AISummarySection'
import DetectionBreakdown from '../components/investigation/DetectionBreakdown'
import ThreatIntelligence from '../components/investigation/ThreatIntelligence'
import LinkedEntities from '../components/investigation/LinkedEntities'
import AIRecommendations from '../components/investigation/AIRecommendations'
import OfficerNotes from '../components/investigation/OfficerNotes'
import FutureModules from '../components/investigation/FutureModules'

const TIMELINE_STEPS = [
  { key: 'submitted', label: 'Complaint Submitted' },
  { key: 'detected', label: 'AI Detection Completed' },
  { key: 'intel', label: 'Threat Intelligence Collected' },
  { key: 'investigation', label: 'Officer Investigation Started' },
  { key: 'report', label: 'Report Generated' },
  { key: 'closed', label: 'Case Closed' },
]

/**
 * Investigation Workspace — the flagship end-to-end case environment.
 *
 * Data sources (all existing APIs): getIncident (detection + Gemini +
 * cached investigation), investigateIncident (WHOIS/DNS/SSL/GeoIP), and the
 * Neo4j threat graph (linked entities + related cases). Workflow state
 * (status, officer, notes, timeline) is persisted via the caseWorkflow store.
 */
export default function InvestigationWorkspace() {
  const { id } = useParams()
  const navigate = useNavigate()
  const workflow = useCaseWorkflow()

  const [incident, setIncident] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [investigating, setInvestigating] = useState(false)
  const [briefingOpen, setBriefingOpen] = useState(false)
  const [graph, setGraph] = useState({ linkedEntities: 0, related: [], loading: true, error: false })

  const meta = getCaseMeta(id) // re-derived on workflow change
  const caseId = incident ? deriveCaseId(incident) : ''
  const confidence = detectionConfidence(incident)
  const entities = useMemo(() => (incident ? extractEntities(incident) : {}), [incident])

  // ---- load incident detail ----------------------------------------------
  const fetchIncident = useCallback(async () => {
    try {
      const data = await getIncident(id)
      setIncident(data)
      setError('')
    } catch {
      setError('Case not found or the service is unavailable.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    setLoading(true)
    fetchIncident()
  }, [fetchIncident])

  // Opening the workspace marks the investigation as started.
  useEffect(() => {
    if (!incident) return
    const current = getCaseMeta(incident.id)
    if (current.status === 'open') setStatus(incident.id, 'investigating')
    else stampTimeline(incident.id, 'investigation')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incident?.id])

  // ---- graph correlation --------------------------------------------------
  const loadGraph = useCallback(
    async (dom) => {
      if (!dom) {
        setGraph({ linkedEntities: 0, related: [], loading: false, error: false })
        return
      }
      setGraph((g) => ({ ...g, loading: true, error: false }))
      try {
        const data = await getGraphConnections('Domain', dom)
        const connections = data.connections || []
        const entityKeys = new Set(connections.map((c) => `${c.type}:${c.properties?.value}`))

        const byIncident = new Map()
        for (const c of connections) {
          const iid = c.via_incident_id
          if (!iid || iid === id) continue
          if (!byIncident.has(iid)) byIncident.set(iid, [])
          byIncident.get(iid).push(c)
        }

        const relatedIds = [...byIncident.keys()].slice(0, 6)
        const summaries = await Promise.all(relatedIds.map((iid) => getIncident(iid).catch(() => null)))

        const related = relatedIds.map((iid, idx) => {
          const conns = byIncident.get(iid)
          const shared = { Domain: [dom], Wallet: [], Email: [], TelegramHandle: [], Phone: [] }
          for (const c of conns) {
            if (shared[c.type] && c.properties?.value) shared[c.type].push(c.properties.value)
          }
          const similarity = Math.min(99, 55 + (1 + conns.length) * 12)
          const summary = summaries[idx]
          return {
            incidentId: iid,
            caseId: summary ? deriveCaseId(summary) : `CASE-${String(iid).slice(0, 6)}`,
            similarity,
            shared,
          }
        })

        setGraph({ linkedEntities: entityKeys.size, related, loading: false, error: false })
      } catch {
        setGraph({ linkedEntities: 0, related: [], loading: false, error: true })
      }
    },
    [id]
  )

  useEffect(() => {
    if (!incident) return
    loadGraph(domainForIncident(incident))
  }, [incident, loadGraph])

  // ---- derived briefing ---------------------------------------------------
  const briefing = useMemo(
    () => (incident ? buildBriefing(incident, { entities, related: graph.related, linkedEntities: graph.linkedEntities }) : null),
    [incident, entities, graph.related, graph.linkedEntities]
  )

  // ---- actions ------------------------------------------------------------
  const canInvestigate = incident?.incident_type === 'url'

  const runInvestigation = useCallback(async () => {
    if (!canInvestigate) return
    setInvestigating(true)
    try {
      await investigateIncident(id)
      stampTimeline(id, 'intel')
      await fetchIncident()
    } catch {
      setError('Investigation failed. Please try again.')
    } finally {
      setInvestigating(false)
    }
  }, [canInvestigate, id, fetchIncident])

  const generateReport = useCallback(() => {
    if (!incident) return
    stampTimeline(id, 'report')
    openInvestigationReport(incident, getCaseMeta(id), deriveCaseId(incident), {
      briefing,
      entities,
      related: graph.related,
    })
  }, [incident, id, briefing, entities, graph.related])

  const viewGraph = useCallback(() => {
    const dom = domainForIncident(incident)
    navigate(dom ? `/dashboard/graph?type=Domain&value=${encodeURIComponent(dom)}` : '/dashboard/graph')
  }, [incident, navigate])

  const openEntity = useCallback(
    (type, value) => navigate(`/dashboard/graph?type=${type}&value=${encodeURIComponent(value)}`),
    [navigate]
  )

  // ---- render -------------------------------------------------------------
  if (loading) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (error || !incident) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-2 rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          <AlertCircle size={16} /> {error || 'Case not found.'}
        </div>
        <Link to="/dashboard/cases" className="mt-4 inline-block text-sm text-purple-400 hover:underline">
          &larr; Back to Cases
        </Link>
      </div>
    )
  }

  const timelineStamps = {
    submitted: incident.created_at,
    detected: incident.created_at,
    intel: meta.timeline?.intel || (incident.investigation_data?.investigation ? incident.created_at : null),
    investigation: meta.timeline?.investigation,
    report: meta.timeline?.report,
    closed: meta.timeline?.closed,
  }

  return (
    <div className="p-8">
      <InvestigationHeader
        incident={incident}
        meta={meta}
        caseId={caseId}
        confidence={confidence}
        linkedCases={graph.loading ? '…' : graph.related.length}
        canInvestigate={canInvestigate}
        investigating={investigating}
        onRunInvestigation={runInvestigation}
        onGenerateReport={generateReport}
        onViewGraph={viewGraph}
        onExportPdf={generateReport}
        onOpenBriefing={() => setBriefingOpen(true)}
      />

      {/* Workflow controls */}
      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
        <label className="text-xs text-slate-500">Case status</label>
        <select
          value={meta.status}
          onChange={(e) => setStatus(id, e.target.value)}
          className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-sm focus:border-purple-600 focus:outline-none"
        >
          {CASE_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <div className="mx-1 h-4 w-px bg-slate-700" />
        <span className="text-xs text-slate-500">Officer</span>
        <span className="text-sm text-slate-200">{meta.assignedOfficer || 'Unassigned'}</span>
        <AssignOfficerMenu
          align="left"
          current={meta.assignedOfficer}
          onAssign={(name) => assignOfficer(id, name)}
          trigger={<span className="cursor-pointer text-xs text-purple-400 hover:underline">change</span>}
        />
      </div>

      <div className="mt-5 space-y-5">
        <Section icon={Sparkles} title="AI Investigation Summary">
          <AISummarySection incident={incident} confidence={confidence} />
        </Section>

        <Section icon={Cpu} title="Detection Breakdown">
          <DetectionBreakdown incident={incident} confidence={confidence} />
        </Section>

        <Section
          icon={Radar}
          title="Threat Intelligence"
          subtitle={incident.investigation_data?.investigation ? 'WHOIS · DNS · SSL · Hosting' : 'not yet collected'}
        >
          <ThreatIntelligence
            incident={incident}
            canInvestigate={canInvestigate}
            investigating={investigating}
            onRun={runInvestigation}
          />
        </Section>

        <div className="grid gap-5 xl:grid-cols-2">
          <Section icon={Network} title="Linked Entities">
            <LinkedEntities entities={entities} onOpenEntity={openEntity} />
          </Section>

          <Section icon={Boxes} title="Related Cases" subtitle="via Threat Graph">
            <RelatedCases
              items={graph.related}
              loading={graph.loading}
              error={graph.error}
              onOpen={(rid) => navigate(`/dashboard/investigate/${rid}`)}
            />
          </Section>
        </div>

        <Section icon={ListChecks} title="AI Recommendations">
          <AIRecommendations actions={briefing?.actions} />
        </Section>

        <Section icon={Clock} title="Investigation Timeline">
          <CaseTimeline stamps={timelineStamps} steps={TIMELINE_STEPS} />
        </Section>

        <Section icon={NotebookPen} title="Officer Notes">
          <OfficerNotes value={meta.notes} onSave={(text) => setNotes(id, text)} />
        </Section>

        <Section icon={Boxes} title="Future Modules" defaultOpen={false}>
          <FutureModules />
        </Section>
      </div>

      <BriefingPanel
        open={briefingOpen}
        onClose={() => setBriefingOpen(false)}
        briefing={briefing}
        caseId={caseId}
        threatLevel={incident.threat_level}
      />
    </div>
  )
}
