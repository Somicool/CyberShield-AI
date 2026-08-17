import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderKanban, AlertCircle, RefreshCw, Trash2, ShieldAlert, ShieldQuestion, ShieldCheck } from 'lucide-react'
import { listIncidents, getIncident, deleteIncident } from '../api/incidents'
import { useCaseWorkflow, getCaseMeta, setStatus, removeCase } from '../lib/caseWorkflow'
import { threatRank, openCaseReport, deriveCaseId } from '../lib/caseHelpers'
import CaseFilters from '../components/cases/CaseFilters'
import SeveritySection from '../components/cases/SeveritySection'
import CaseCard from '../components/cases/CaseCard'

const WORKING_SET_SIZE = 100
const POLL_INTERVAL_MS = 20000

const DEFAULT_FILTERS = {
  search: '',
  status: '',
  threatLevel: '',
  threatType: '',
  sort: 'risk',
}

// Three officer-facing priority groups. "Urgent" merges the backend's
// critical + high levels, since both demand immediate attention.
const GROUPS = [
  {
    key: 'urgent',
    tone: 'urgent',
    icon: ShieldAlert,
    title: 'Urgent / Critical',
    subtitle: 'Immediate action required',
    levels: ['critical', 'high'],
  },
  {
    key: 'medium',
    tone: 'medium',
    icon: ShieldQuestion,
    title: 'Medium Priority',
    subtitle: 'Review and monitor',
    levels: ['medium'],
  },
  {
    key: 'low',
    tone: 'low',
    icon: ShieldCheck,
    title: 'Low Priority',
    subtitle: 'Logged for the record',
    levels: ['low'],
  },
]

/**
 * Cases — the Cyber Crime investigation workspace, organised into three
 * priority sections. Each section opens to reveal its cases as individual
 * boxes (no table), each offering exactly four actions.
 *
 * Data still comes from the existing read-only /incidents API; case workflow
 * state (status, officer, timeline) still lives in the caseWorkflow store.
 */
export default function Cases() {
  const workflow = useCaseWorkflow() // re-render on any workflow mutation
  const navigate = useNavigate()

  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [openGroup, setOpenGroup] = useState('urgent')
  const [reportBusyId, setReportBusyId] = useState(null)
  const [deleteBusyId, setDeleteBusyId] = useState(null)
  const [notice, setNotice] = useState('')

  const loadCases = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setLoading(true)
      setError('')
      try {
        const data = await listIncidents({
          page: 1,
          pageSize: WORKING_SET_SIZE,
          search: filters.search || undefined,
          threatLevel: filters.threatLevel || undefined,
          incidentType: filters.threatType || undefined,
        })
        setIncidents(data.items || [])
      } catch {
        setError('Could not load cases. The detection service may be offline.')
      } finally {
        setLoading(false)
      }
    },
    [filters.search, filters.threatLevel, filters.threatType]
  )

  useEffect(() => {
    loadCases(true)
    const interval = setInterval(() => loadCases(false), POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [loadCases])

  // Compose incidents with workflow meta, apply the status filter + sort.
  const rows = useMemo(() => {
    let list = incidents.map((incident) => ({ incident, meta: getCaseMeta(incident.id) }))
    if (filters.status) list = list.filter((r) => r.meta.status === filters.status)
    list.sort((a, b) => {
      if (filters.sort === 'risk') {
        const byRisk = (b.incident.risk_score ?? 0) - (a.incident.risk_score ?? 0)
        if (byRisk !== 0) return byRisk
        return threatRank(b.incident.threat_level) - threatRank(a.incident.threat_level)
      }
      return new Date(b.incident.created_at) - new Date(a.incident.created_at)
    })
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidents, filters.status, filters.sort, workflow])

  // Bucket the cases into the three priority groups.
  const grouped = useMemo(() => {
    const buckets = { urgent: [], medium: [], low: [] }
    for (const row of rows) {
      const lvl = row.incident.threat_level
      const group = GROUPS.find((g) => g.levels.includes(lvl))
      if (group) buckets[group.key].push(row)
      else buckets.low.push(row) // unknown/unscored → lowest priority
    }
    return buckets
  }, [rows])

  // ---- the four card actions (all existing functionality) ----------------
  const openInvestigation = useCallback(
    (incident) => {
      setStatus(incident.id, 'investigating')
      navigate(`/dashboard/investigate/${incident.id}`)
    },
    [navigate]
  )

  /** Collected detection + investigation evidence for this incident. */
  const viewEvidence = useCallback(
    (incident) => navigate(`/dashboard/incidents/${incident.id}`),
    [navigate]
  )

  /** Open the threat graph built specifically for this case. */
  const viewGraph = useCallback(
    (incident) => navigate(`/dashboard/graph?incident=${incident.id}`),
    [navigate]
  )

  const generateReport = useCallback(async (incident) => {
    setReportBusyId(incident.id)
    try {
      const full = await getIncident(incident.id).catch(() => incident)
      openCaseReport(full, getCaseMeta(incident.id), deriveCaseId(incident))
    } finally {
      setReportBusyId(null)
    }
  }, [])

  /**
   * Permanently deletes a single case. The card confirms first; here we call
   * the police-guarded API, drop the row locally and purge its workflow state.
   */
  const handleDelete = useCallback(async (incident) => {
    setDeleteBusyId(incident.id)
    setError('')
    try {
      await deleteIncident(incident.id)
      setIncidents((prev) => prev.filter((i) => i.id !== incident.id))
      removeCase(incident.id)
      setNotice(`Case ${deriveCaseId(incident)} was permanently deleted.`)
    } catch (e) {
      const status = e?.response?.status
      setError(
        status === 401 || status === 403
          ? 'You do not have permission to delete cases. Sign in as a police officer or administrator.'
          : 'Could not delete this case. Please try again.'
      )
    } finally {
      setDeleteBusyId(null)
    }
  }, [])

  return (
    <div className="min-h-full bg-[#16181c]">
      <div className="mx-auto flex max-w-375 flex-col gap-4 p-6">
        {/* header */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-amber-400/25 bg-amber-400/10 text-amber-300">
              <FolderKanban size={18} />
            </span>
            <div>
              <h1 className="text-[19px] font-semibold tracking-tight text-zinc-50">Cases</h1>
              <p className="mt-0.5 text-[12.5px] text-zinc-500">
                Manage, investigate and monitor cybercrime investigations by priority.
              </p>
            </div>
          </div>
          <button
            onClick={() => loadCases(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/8 bg-white/3 px-2.5 py-1.5 text-[12px] text-zinc-300 transition hover:bg-white/6"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </header>

        <CaseFilters value={filters} onChange={setFilters} />

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-900/60 bg-red-950/30 px-4 py-3 text-[12.5px] text-red-300">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {notice && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-900/60 bg-emerald-950/25 px-4 py-2.5 text-[12.5px] text-emerald-300">
            <span className="inline-flex items-center gap-2">
              <Trash2 size={14} /> {notice}
            </span>
            <button onClick={() => setNotice('')} className="text-emerald-400/70 hover:text-emerald-200">
              Dismiss
            </button>
          </div>
        )}

        {/* three priority sections */}
        <div className="flex flex-col gap-3">
          {GROUPS.map((g) => {
            const list = grouped[g.key]
            return (
              <SeveritySection
                key={g.key}
                tone={g.tone}
                icon={g.icon}
                title={g.title}
                subtitle={g.subtitle}
                count={list.length}
                open={openGroup === g.key}
                loading={loading}
                onToggle={() => setOpenGroup((cur) => (cur === g.key ? null : g.key))}
              >
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {list.map(({ incident, meta }) => (
                    <CaseCard
                      key={incident.id}
                      incident={incident}
                      meta={meta}
                      reportBusy={reportBusyId === incident.id}
                      deleteBusy={deleteBusyId === incident.id}
                      onOpenInvestigation={openInvestigation}
                      onViewEvidence={viewEvidence}
                      onViewGraph={viewGraph}
                      onGenerateReport={generateReport}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </SeveritySection>
            )
          })}
        </div>

        {!loading && (
          <p className="text-[11px] text-zinc-600">
            {rows.length} case{rows.length !== 1 ? 's' : ''} loaded · status &amp; officer assignment are managed
            inside each investigation.
          </p>
        )}
      </div>
    </div>
  )
}
