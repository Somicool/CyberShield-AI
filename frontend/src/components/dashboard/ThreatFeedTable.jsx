import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { listIncidents } from '../../api/incidents'
import { hostnameOf, firstUrlIn, relativeTime } from '../../lib/intel'
import { windowCutoff } from '../../lib/timeWindows'
import ThreatBadge from '../ThreatBadge'

const POLL_INTERVAL_MS = 10000
const ROWS_PER_PAGE = 10
/** Widest window the API can return in one call — used for time filtering. */
const WINDOW_FETCH_SIZE = 100

const RISK_COLOR = (level) =>
  level === 'critical'
    ? 'text-red-300'
    : level === 'high'
      ? 'text-amber-300'
      : level === 'low'
        ? 'text-emerald-300'
        : 'text-zinc-200'

/**
 * Recent Threats — the compact incident stream.
 *
 * Search, threat level and type are the existing server-side filters, passed
 * down from the page. The time window has no API parameter, so when one is
 * chosen the newest 100 matching incidents are fetched and narrowed in the
 * browser; the row count states exactly what is being shown. Ten rows at a
 * time keeps the console short, and pagination keeps the full list reachable.
 */
export default function ThreatFeedTable({ filters, onTotal, onNote }) {
  const { search = '', threatLevel = '', incidentType = '', timeWindow = '' } = filters || {}
  const navigate = useNavigate()

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const clientSide = Boolean(timeWindow)

  useEffect(() => {
    setPage(1)
  }, [search, threatLevel, incidentType, timeWindow])

  const fetchData = useCallback(async () => {
    try {
      const data = await listIncidents({
        page: clientSide ? 1 : page,
        pageSize: clientSide ? WINDOW_FETCH_SIZE : ROWS_PER_PAGE,
        threatLevel,
        incidentType,
        search,
      })
      setItems(data.items || [])
      setTotal(data.total || 0)
      onTotal?.(data.total || 0)
      setError('')
    } catch {
      setError('Could not load the threat stream.')
    } finally {
      setLoading(false)
    }
  }, [clientSide, page, threatLevel, incidentType, search, onTotal])

  useEffect(() => {
    fetchData()
    // Poll periodically so new incidents surface without a manual refresh.
    const interval = setInterval(fetchData, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchData])

  // Time window narrowing happens here because the API has no date parameter.
  const windowed = useMemo(() => {
    if (!clientSide) return items
    const cutoff = windowCutoff(timeWindow)
    if (!cutoff) return items
    return items.filter((i) => new Date(i.created_at).getTime() >= cutoff)
  }, [items, clientSide, timeWindow])

  const matching = clientSide ? windowed.length : total
  const totalPages = Math.max(1, Math.ceil(matching / ROWS_PER_PAGE))
  const rows = clientSide ? windowed.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE) : items

  // Tell the page what the filter bar should say about this result set.
  useEffect(() => {
    if (loading) return
    if (clientSide) {
      const capped = total > WINDOW_FETCH_SIZE
      onNote?.(
        `${matching} incident${matching === 1 ? '' : 's'} in window${
          capped ? ` · newest ${WINDOW_FETCH_SIZE} of ${total} scanned` : ''
        }`
      )
    } else {
      onNote?.(`${total} incident${total === 1 ? '' : 's'} matching`)
    }
  }, [loading, clientSide, matching, total, onNote])

  return (
    <section className="overflow-hidden rounded-lg border border-white/10 bg-[#111722]/82 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-2.5">
        <h2 className="text-[14px] font-semibold uppercase tracking-[0.08em] text-zinc-300">Recent Threats</h2>
        <span className="text-[12.5px] text-zinc-500">
          Showing {rows.length} of {matching}
        </span>
      </div>

      {error && <p className="px-4 py-2 text-[13px] text-red-300">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-[13.5px]">
          <thead className="text-left text-[11.5px] uppercase tracking-[0.08em] text-zinc-500">
            <tr className="border-b border-white/5">
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Content / Domain</th>
              <th className="px-4 py-2 font-medium">Risk</th>
              <th className="px-4 py-2 font-medium">Threat</th>
              <th className="px-4 py-2 font-medium">Detected</th>
              <th className="px-4 py-2 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[13.5px] text-zinc-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[13.5px] text-zinc-500">
                  No incidents match these filters.
                </td>
              </tr>
            ) : (
              rows.map((item) => {
                const host = hostnameOf(item.raw_content) || hostnameOf(firstUrlIn(item.raw_content))
                return (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`/dashboard/incidents/${item.id}`)}
                    className="cursor-pointer transition hover:bg-white/4"
                  >
                    <td className="whitespace-nowrap px-4 py-2 text-[12px] uppercase tracking-wide text-zinc-500">
                      {item.incident_type}
                    </td>
                    <td className="max-w-md px-4 py-2">
                      <div className="flex min-w-0 items-baseline gap-2">
                        <span className="truncate text-zinc-200" title={item.raw_content}>
                          {item.raw_content}
                        </span>
                        {host && (
                          <span className="shrink-0 font-mono text-[12px] text-zinc-500">{host}</span>
                        )}
                      </div>
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-2 font-mono tabular-nums ${RISK_COLOR(item.threat_level)}`}
                    >
                      {item.risk_score?.toFixed(1) ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <ThreatBadge level={item.threat_level} />
                    </td>
                    <td
                      className="whitespace-nowrap px-4 py-2 text-zinc-500"
                      title={new Date(item.created_at).toLocaleString()}
                    >
                      {relativeTime(item.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right">
                      <Link
                        to={`/dashboard/incidents/${item.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-[12.5px] text-zinc-300 transition hover:border-cyan-400/40 hover:text-cyan-200"
                      >
                        View <ArrowRight size={11} />
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

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
    </section>
  )
}
