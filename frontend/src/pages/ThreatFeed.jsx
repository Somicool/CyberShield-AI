import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { getStats, listIncidents } from '../api/incidents'
import { deriveInsights, relativeTime } from '../lib/intel'
import IntelSummary from '../components/feed/IntelSummary'
import TriageStrip from '../components/feed/TriageStrip'
import FeedFilters from '../components/feed/FeedFilters'
import IntelligenceAlerts from '../components/dashboard/IntelligenceAlerts'
import ThreatFeedTable from '../components/dashboard/ThreatFeedTable'

const POLL_INTERVAL_MS = 15000
const ANALYSIS_PAGE_SIZE = 100
const SUMMARY_COUNT = 3
const SEVERITY_RANK = { critical: 4, high: 3, medium: 2, low: 1, unknown: 0 }

/**
 * Findings whose entire point is a headline count already shown in the triage
 * strip. They stay in the full intelligence feed but are kept out of the
 * summary so the page doesn't say the same thing twice.
 */
const DUPLICATES_TRIAGE = new Set(['critical-volume'])

/**
 * Live Feed — the cybercrime threat-monitoring console.
 *
 * Intelligence first, incidents second: the three findings that matter now,
 * real severity counts, then a compact stream of the latest incidents. All
 * data comes from the existing /incidents and /incidents/stats endpoints; the
 * complete intelligence feed and the full incident list both stay reachable.
 */
export default function ThreatFeed() {
  const [params] = useSearchParams()

  const [insights, setInsights] = useState([])
  const [stats, setStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [intelOpen, setIntelOpen] = useState(false)
  const [note, setNote] = useState('')

  const [filters, setFilters] = useState({
    search: '',
    // Drill-through from Analytics (?level= / ?type=).
    threatLevel: params.get('level') || '',
    incidentType: params.get('type') || '',
    timeWindow: '',
  })

  const load = useCallback(async () => {
    setRefreshing(true)
    try {
      const [statsData, recent] = await Promise.all([
        getStats(14),
        listIncidents({ page: 1, pageSize: ANALYSIS_PAGE_SIZE }),
      ])
      setStats(statsData)
      setInsights(deriveInsights(recent.items || [], statsData?.daily_counts || []))
      setUpdatedAt(new Date().toISOString())
    } catch {
      /* the threat table surfaces its own errors */
    } finally {
      setLoadingStats(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [load])

  // Deep link from the dashboard: ?view=intel opens the full intelligence feed.
  useEffect(() => {
    if (params.get('view') === 'intel') setIntelOpen(true)
  }, [params])

  // Re-apply a drill-through that arrives while already on this page.
  useEffect(() => {
    const level = params.get('level') || ''
    const type = params.get('type') || ''
    if (level || type) {
      setFilters((f) => ({ ...f, threatLevel: level, incidentType: type }))
    }
  }, [params])

  const counts = useMemo(() => {
    const map = {}
    for (const row of stats?.by_threat_level || []) map[row.threat_level] = row.count
    return map
  }, [stats])

  /** Highest severity first, then most recent. */
  const summary = useMemo(
    () =>
      [...insights]
        .filter((i) => !DUPLICATES_TRIAGE.has(i.id))
        .sort(
          (a, b) =>
            (SEVERITY_RANK[b.severity] || 0) - (SEVERITY_RANK[a.severity] || 0) ||
            new Date(b.timestamp) - new Date(a.timestamp)
        )
        .slice(0, SUMMARY_COUNT),
    [insights]
  )

  // Selecting a finding pivots the stream to the incidents behind it.
  const inspect = useCallback((insight) => {
    setIntelOpen(false)
    setFilters((f) => ({ ...f, search: insight.query || '' }))
  }, [])

  return (
    <div className="min-h-full">
      <div className="mx-auto flex max-w-375 flex-col gap-3 p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[19px] font-semibold tracking-tight text-zinc-50">Live Threat Feed</h1>
            <p className="text-[13px] text-zinc-500">
              Real-time cybercrime incidents and AI intelligence findings
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-black/35 px-2 py-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-emerald-300/90">
                Live
              </span>
            </span>
            {updatedAt && (
              <span className="text-[12.5px] text-zinc-500">Updated {relativeTime(updatedAt)}</span>
            )}
            <button
              onClick={load}
              disabled={refreshing}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/10 bg-black/35 px-2.5 text-[13px] text-zinc-300 transition hover:border-cyan-400/40 hover:text-cyan-200 disabled:opacity-50"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </header>

        <IntelSummary
          items={summary}
          total={insights.length}
          onInspect={inspect}
          onViewAll={() => setIntelOpen(true)}
        />

        <TriageStrip
          counts={counts}
          total={stats?.total_incidents}
          loading={loadingStats}
          activeLevel={filters.threatLevel}
          onSelectLevel={(level) => setFilters((f) => ({ ...f, threatLevel: level }))}
        />

        <FeedFilters value={filters} onChange={setFilters} resultNote={note} />

        <ThreatFeedTable filters={filters} onNote={setNote} />
      </div>

      <IntelligenceAlerts
        open={intelOpen}
        insights={insights}
        onInspect={inspect}
        onClose={() => setIntelOpen(false)}
      />
    </div>
  )
}
