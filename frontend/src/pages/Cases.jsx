import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderKanban, AlertCircle, RefreshCw } from 'lucide-react'
import { listIncidents, getIncident } from '../api/incidents'
import {
  useCaseWorkflow,
  getCaseMeta,
  setStatus,
  assignOfficer,
  bulkSetStatus,
  bulkAssignOfficer,
  stampTimeline,
} from '../lib/caseWorkflow'
import { threatRank, openCaseReport, openBatchReport, deriveCaseId } from '../lib/caseHelpers'
import CaseFilters from '../components/cases/CaseFilters'
import CaseTable from '../components/cases/CaseTable'
import BulkActionBar from '../components/cases/BulkActionBar'
import CaseSummaryPanel from '../components/cases/CaseSummaryPanel'

const WORKING_SET_SIZE = 100
const POLL_INTERVAL_MS = 20000

const DEFAULT_FILTERS = {
  search: '',
  status: '',
  threatLevel: '',
  threatType: '',
  sort: 'latest',
}

/**
 * Cases — the Cyber Crime investigation workspace.
 *
 * Data comes from the existing read-only /incidents API (a 100-row working
 * set, filtered/sorted client-side so the frontend-managed status filter
 * works). Case workflow state (status, officer, timeline) lives in the
 * caseWorkflow store; graph-derived intelligence loads lazily in the panel.
 */
export default function Cases() {
  const workflow = useCaseWorkflow() // re-render on any workflow mutation
  const navigate = useNavigate()

  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [activeId, setActiveId] = useState(null)

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

  // Compose incidents with their workflow meta, apply status filter + sort.
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
    // workflow is included so status/officer edits re-derive rows.
  }, [incidents, filters.status, filters.sort, workflow])

  const activeRow = rows.find((r) => r.incident.id === activeId) || null

  // ---- selection ---------------------------------------------------------
  const toggleSelect = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleSelectAll = () =>
    setSelectedIds((prev) => {
      const visible = rows.map((r) => r.incident.id)
      const allSelected = visible.length > 0 && visible.every((id) => prev.has(id))
      return allSelected ? new Set() : new Set(visible)
    })

  const clearSelection = () => setSelectedIds(new Set())

  // ---- report helpers ----------------------------------------------------
  const generateReport = useCallback(async (incidentLike) => {
    const full =
      incidentLike && 'investigation_data' in incidentLike
        ? incidentLike
        : await getIncident(incidentLike.id).catch(() => incidentLike)
    openCaseReport(full, getCaseMeta(full.id), deriveCaseId(full))
  }, [])

  // ---- row / panel actions ----------------------------------------------
  const openInvestigation = useCallback(
    (incident) => {
      setStatus(incident.id, 'investigating')
      navigate(`/dashboard/investigate/${incident.id}`)
    },
    [navigate]
  )

  const viewGraph = useCallback(() => navigate('/dashboard/graph'), [navigate])

  const rowActions = useMemo(
    () => ({
      onInvestigate: openInvestigation,
      onReport: generateReport,
      onGraph: viewGraph,
      onExportPdf: generateReport,
      onAssign: (id, name) => assignOfficer(id, name),
    }),
    [openInvestigation, generateReport, viewGraph]
  )

  // ---- bulk actions ------------------------------------------------------
  const selectedList = rows.filter((r) => selectedIds.has(r.incident.id))
  const bulkAssign = (name) => {
    bulkAssignOfficer([...selectedIds], name)
  }
  const bulkResolve = () => bulkSetStatus([...selectedIds], 'resolved')
  const bulkArchive = () => bulkSetStatus([...selectedIds], 'closed')
  const bulkExport = () => openBatchReport(selectedList)

  return (
    <div className="flex flex-col gap-5 p-8">
      {/* Section 1 — header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-300">
            <FolderKanban size={20} />
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Cases</h2>
            <p className="text-sm text-slate-500">Manage, investigate and monitor cybercrime investigations.</p>
          </div>
        </div>
        <button
          onClick={() => loadCases(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </header>

      <CaseFilters value={filters} onChange={setFilters} />

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <BulkActionBar
        count={selectedIds.size}
        onAssign={bulkAssign}
        onResolve={bulkResolve}
        onExport={bulkExport}
        onArchive={bulkArchive}
        onClear={clearSelection}
      />

      {/* Table + sticky summary panel */}
      <div className={`grid gap-5 ${activeRow ? 'xl:grid-cols-[1fr_400px]' : 'grid-cols-1'}`}>
        <div className="min-w-0">
          <CaseTable
            rows={rows}
            loading={loading}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            activeId={activeId}
            onSelectRow={setActiveId}
            actions={rowActions}
          />
          {!loading && (
            <p className="mt-3 text-xs text-slate-600">
              Showing {rows.length} case{rows.length !== 1 ? 's' : ''} · workflow state is stored locally until a
              case-management API is connected.
            </p>
          )}
        </div>

        {activeRow && (
          <div className="xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:self-start">
            <div className="h-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40">
              <CaseSummaryPanel
                key={activeRow.incident.id}
                incident={activeRow.incident}
                meta={activeRow.meta}
                onClose={() => setActiveId(null)}
                onOpenInvestigation={openInvestigation}
                onViewGraph={viewGraph}
                onGenerateReport={generateReport}
                onChangeStatus={(id, status) => {
                  setStatus(id, status)
                  if (status === 'investigating') stampTimeline(id, 'investigation')
                }}
                onAssign={(id, name) => assignOfficer(id, name)}
                onOpenRelated={(id) => {
                  // Open in-panel if the related case is in the working set,
                  // otherwise fall back to its full investigation page.
                  if (incidents.some((i) => i.id === id)) setActiveId(id)
                  else navigate(`/dashboard/incidents/${id}`)
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
