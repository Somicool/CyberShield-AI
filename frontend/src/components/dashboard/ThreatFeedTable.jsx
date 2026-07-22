import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Activity, Search } from 'lucide-react'
import { listIncidents } from '../../api/incidents'
import ThreatBadge from '../ThreatBadge'

const THREAT_LEVELS = ['critical', 'high', 'medium', 'low']
const INCIDENT_TYPES = ['url', 'email', 'sms', 'qr']
const POLL_INTERVAL_MS = 10000

/**
 * Section 4 — Live Threat Feed.
 *
 * The original incident table, unchanged in behaviour: full-text search,
 * threat-level / type filters, 10s auto-refresh, pagination and threat
 * badges. `search` is lifted to the parent so the AI Intelligence feed can
 * pivot the officer straight to relevant incidents.
 */
export default function ThreatFeedTable({ search, setSearch, onTotal }) {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [threatLevel, setThreatLevel] = useState('')
  const [incidentType, setIncidentType] = useState('')
  const [loading, setLoading] = useState(true)
  const pageSize = 15

  const fetchData = useCallback(async () => {
    try {
      const data = await listIncidents({ page, pageSize, threatLevel, incidentType, search })
      setItems(data.items)
      setTotal(data.total)
      onTotal?.(data.total)
    } finally {
      setLoading(false)
    }
  }, [page, threatLevel, incidentType, search, onTotal])

  useEffect(() => {
    fetchData()
    // Poll periodically so new incidents surface without a manual refresh.
    const interval = setInterval(fetchData, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchData])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Activity size={16} className="text-sky-400" />
        <h3 className="text-sm font-semibold tracking-wide text-slate-200">Live Threat Feed</h3>
        <span className="ml-1 text-xs text-slate-500">{total} incidents tracked</span>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search content, domains, senders..."
            value={search}
            onChange={(e) => {
              setPage(1)
              setSearch(e.target.value)
            }}
            className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2 pl-9 pr-3 text-sm focus:border-purple-600 focus:outline-none"
          />
        </div>
        <select
          value={threatLevel}
          onChange={(e) => {
            setPage(1)
            setThreatLevel(e.target.value)
          }}
          className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm focus:border-purple-600 focus:outline-none"
        >
          <option value="">All threat levels</option>
          {THREAT_LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={incidentType}
          onChange={(e) => {
            setPage(1)
            setIncidentType(e.target.value)
          }}
          className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm focus:border-purple-600 focus:outline-none"
        >
          <option value="">All types</option>
          {INCIDENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Content</th>
              <th className="px-4 py-3 font-medium">Risk Score</th>
              <th className="px-4 py-3 font-medium">Threat Level</th>
              <th className="px-4 py-3 font-medium">Detected</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Loading...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No incidents match these filters.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-900/60">
                  <td className="px-4 py-3 text-xs uppercase text-slate-400">{item.incident_type}</td>
                  <td className="max-w-md truncate px-4 py-3">
                    <Link to={`/dashboard/incidents/${item.id}`} className="text-purple-300 hover:underline">
                      {item.raw_content}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums">{item.risk_score?.toFixed(1) ?? '-'}</td>
                  <td className="px-4 py-3">
                    <ThreatBadge level={item.threat_level} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">{new Date(item.created_at).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  )
}
