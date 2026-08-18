import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, FolderKanban, Search, X } from 'lucide-react'
import { listIncidents } from '../../api/incidents'
import { useCaseWorkflow, getCaseMeta } from '../../lib/caseWorkflow'
import { deriveCaseId, statusLabel, threatRank } from '../../lib/caseHelpers'
import { relativeTime } from '../../lib/intel'
import { Skeleton } from '../cases/Skeleton'

const WORKING_SET_SIZE = 100
const ROWS_PER_PAGE = 10
const THREAT_LEVELS = ['critical', 'high', 'medium', 'low']
const INCIDENT_TYPES = ['url', 'email', 'sms', 'qr']

const field =
  'h-9 rounded-md border border-white/10 bg-black/35 px-2.5 text-[13px] text-zinc-200 outline-none transition focus:border-cyan-400/40'

const THREAT_TEXT = {
  critical: 'text-red-300',
  high: 'text-amber-300',
  medium: 'text-zinc-300',
  low: 'text-emerald-300',
}

/** Muted status chip — kept local so the Cases page keeps its own styling. */
function StatusChip({ status }) {
  const tone =
    status === 'evidence_pending'
      ? 'border-amber-400/30 text-amber-300'
      : status === 'resolved'
        ? 'border-emerald-400/30 text-emerald-300'
        : status === 'closed'
          ? 'border-white/10 text-zinc-500'
          : 'border-white/12 text-zinc-300'
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[11.5px] font-medium ${tone}`}>
      {statusLabel(status)}
    </span>
  )
}

/**
 * CrimeGPT case workspace — pick a case to work on.
 *
 * Reads the newest cases through the existing /incidents endpoint and the
 * workflow store for status, then filters and paginates in the browser (case
 * numbers are derived client-side, so they can only be matched here). Opening
 * a row hands off to the existing CrimeGPT case workspace.
 */
export default function CaseSelector({ onOpen }) {
  useCaseWorkflow() // re-render when case status changes
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [threatLevel, setThreatLevel] = useState('')
  const [incidentType, setIncidentType] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    listIncidents({ page: 1, pageSize: WORKING_SET_SIZE })
      .then((d) => setIncidents(d.items || []))
      .catch(() => setIncidents([]))
      .finally(() => setLoading(false))
  }, [])

  // Changing a filter always returns to the first page of results.
  const applySearch = (v) => {
    setPage(1)
    setSearch(v)
  }
  const applyThreatLevel = (v) => {
    setPage(1)
    setThreatLevel(v)
  }
  const applyIncidentType = (v) => {
    setPage(1)
    setIncidentType(v)
  }
  const clearFilters = () => {
    setPage(1)
    setSearch('')
    setThreatLevel('')
    setIncidentType('')
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = incidents
    if (q) {
      list = list.filter(
        (i) =>
          (i.raw_content || '').toLowerCase().includes(q) ||
          (i.incident_type || '').toLowerCase().includes(q) ||
          deriveCaseId(i).toLowerCase().includes(q)
      )
    }
    if (threatLevel) list = list.filter((i) => i.threat_level === threatLevel)
    if (incidentType) list = list.filter((i) => i.incident_type === incidentType)
    return [...list].sort((a, b) => threatRank(b.threat_level) - threatRank(a.threat_level))
  }, [incidents, search, threatLevel, incidentType])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE))
  const rows = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE)
  const dirty = search || threatLevel || incidentType

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-[#111722]/82 px-2.5 py-2 backdrop-blur-md">
        <div className="relative min-w-50 flex-1">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            aria-label="Search case"
            value={search}
            onChange={(e) => applySearch(e.target.value)}
            placeholder="Search by case number, type or content…"
            className={`${field} w-full pl-8`}
          />
        </div>
        <select
          aria-label="Threat level"
          value={threatLevel}
          onChange={(e) => applyThreatLevel(e.target.value)}
          className={field}
        >
          <option value="">All threat levels</option>
          {THREAT_LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select
          aria-label="Case type"
          value={incidentType}
          onChange={(e) => applyIncidentType(e.target.value)}
          className={field}
        >
          <option value="">All types</option>
          {INCIDENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.toUpperCase()}
            </option>
          ))}
        </select>
        {dirty && (
          <button
            onClick={clearFilters}
            className="inline-flex h-9 items-center gap-1 rounded-md border border-white/10 bg-black/35 px-2.5 text-[12.5px] text-zinc-400 transition hover:border-white/20 hover:text-zinc-200"
          >
            <X size={13} /> Clear
          </button>
        )}
      </div>

      <section className="overflow-hidden rounded-lg border border-white/10 bg-[#111722]/82 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-2.5">
          <h2 className="text-[14px] font-semibold uppercase tracking-[0.08em] text-zinc-300">Cases</h2>
          <span className="text-[12.5px] text-zinc-500">
            {loading
              ? 'Loading…'
              : `${filtered.length} of the ${incidents.length} most recent cases`}
          </span>
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-[13.5px] text-zinc-500">
            <FolderKanban size={24} className="mx-auto mb-2 text-zinc-700" />
            No cases match these filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px]">
              <thead className="text-left text-[11.5px] uppercase tracking-[0.08em] text-zinc-500">
                <tr className="border-b border-white/5">
                  <th className="px-4 py-2 font-medium">Case ID</th>
                  <th className="px-4 py-2 font-medium">Threat</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Risk</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Updated</th>
                  <th className="px-4 py-2 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((i) => {
                  const meta = getCaseMeta(i.id)
                  const updated = meta?.updatedAt || i.created_at
                  return (
                    <tr
                      key={i.id}
                      onClick={() => onOpen(i.id)}
                      className="cursor-pointer transition hover:bg-white/4"
                    >
                      <td className="whitespace-nowrap px-4 py-2">
                        <span className="font-mono text-zinc-100">{deriveCaseId(i)}</span>
                        <span className="block max-w-xs truncate text-[12.5px] text-zinc-500" title={i.raw_content}>
                          {i.raw_content}
                        </span>
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-2 text-[12.5px] font-medium uppercase tracking-wide ${
                          THREAT_TEXT[i.threat_level] || 'text-zinc-400'
                        }`}
                      >
                        {i.threat_level || 'unknown'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-[12px] uppercase tracking-wide text-zinc-500">
                        {i.incident_type}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 font-mono tabular-nums text-zinc-200">
                        {i.risk_score != null ? Number(i.risk_score).toFixed(1) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2">
                        <StatusChip status={meta?.status || 'open'} />
                      </td>
                      <td
                        className="whitespace-nowrap px-4 py-2 text-zinc-500"
                        title={new Date(updated).toLocaleString()}
                      >
                        {relativeTime(updated)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right">
                        <span className="inline-flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-[12.5px] text-zinc-300 transition group-hover:border-cyan-400/40">
                          Open <ArrowRight size={11} />
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-white/5 px-4 py-2 text-[12.5px] text-zinc-500">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded border border-white/10 px-2.5 py-1 transition hover:border-white/20 hover:text-zinc-200 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border border-white/10 px-2.5 py-1 transition hover:border-white/20 hover:text-zinc-200 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
