import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Scale, Search, FileText, AlertCircle, ArrowLeft, FolderKanban } from 'lucide-react'
import { listIncidents } from '../api/incidents'
import { deriveCaseId, threatRank } from '../lib/caseHelpers'
import useCaseData from '../hooks/useCaseData'
import { Skeleton } from '../components/cases/Skeleton'
import ThreatBadge from '../components/ThreatBadge'
import CrimeGPTModule from '../components/crimegpt/CrimeGPTModule'

const WORKING_SET_SIZE = 100

/**
 * CrimeGPT page — the top-level, police-only entry point. The officer selects
 * a case from the list (or via the header selector / a deep link), and
 * CrimeGPT loads that case's real investigation data (via useCaseData) and
 * renders the integrated legal-intelligence module. No data is re-entered:
 * everything flows from the existing detection/investigation APIs.
 */
export default function CrimeGPT() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [incidents, setIncidents] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [query, setQuery] = useState('')

  const caseData = useCaseData(id)

  useEffect(() => {
    listIncidents({ page: 1, pageSize: WORKING_SET_SIZE })
      .then((d) => setIncidents(d.items || []))
      .catch(() => setIncidents([]))
      .finally(() => setListLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = incidents
    if (q) {
      list = list.filter(
        (i) =>
          (i.raw_content || '').toLowerCase().includes(q) ||
          (i.incident_type || '').toLowerCase().includes(q) ||
          deriveCaseId(i).toLowerCase().includes(q),
      )
    }
    return [...list].sort((a, b) => threatRank(b.threat_level) - threatRank(a.threat_level))
  }, [incidents, query])

  const select = (incidentId) => navigate(`/dashboard/crimegpt/${incidentId}`)

  // ---- case selected: render the module ----------------------------------
  if (id) {
    return (
      <div className="p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard/crimegpt')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              <ArrowLeft size={15} /> All cases
            </button>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-100">CrimeGPT</h1>
              <p className="text-xs text-slate-500">Legal intelligence for {caseData.caseId || 'selected case'}</p>
            </div>
          </div>

          {/* Quick case switcher */}
          <select
            aria-label="Switch case"
            value={id}
            onChange={(e) => select(e.target.value)}
            className="max-w-[280px] rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-purple-600 focus:outline-none"
          >
            {incidents.map((i) => (
              <option key={i.id} value={i.id}>
                {deriveCaseId(i)} · {i.incident_type} · {(i.raw_content || '').slice(0, 30)}
              </option>
            ))}
          </select>
        </div>

        {caseData.loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : caseData.error || !caseData.incident ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            <AlertCircle size={16} /> {caseData.error || 'Case not found.'}
          </div>
        ) : (
          <CrimeGPTModule
            incident={caseData.incident}
            meta={caseData.meta}
            entities={caseData.entities}
            related={caseData.related}
            caseId={caseData.caseId}
            confidence={caseData.confidence}
          />
        )}
      </div>
    )
  }

  // ---- no case selected: pick one ----------------------------------------
  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-purple-500/40 bg-purple-500/10 text-purple-300">
          <Scale size={22} />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">CrimeGPT</h1>
          <p className="text-sm text-slate-500">
            Select a case to open legal recommendations, case law, AI document drafting, the case diary and the legal assistant.
          </p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
        <Search size={16} className="text-slate-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search cases by case number, type or content…"
          className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none"
        />
      </div>

      {listLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-10 text-center text-sm text-slate-500">
          <FolderKanban size={26} className="mx-auto mb-2 text-slate-700" />
          No cases match your search.
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map((i) => (
            <button
              key={i.id}
              onClick={() => select(i.id)}
              className="group flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-left transition hover:border-purple-500/40 hover:bg-slate-900"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-slate-200">{deriveCaseId(i)}</span>
                  <ThreatBadge level={i.threat_level} />
                  <span className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                    {i.incident_type}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">{i.raw_content}</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-purple-600/90 px-3 py-1.5 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
                <FileText size={13} /> Open CrimeGPT
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
