import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart3, RefreshCw, AlertCircle, Loader2 } from 'lucide-react'
import { getStats, listIncidents } from '../api/incidents'
import { summarize, deriveKeyIntel } from '../lib/analytics'
import SummaryStrip from '../components/analytics/SummaryStrip'
import ThreatLandscape from '../components/analytics/ThreatLandscape'
import ThreatActivity from '../components/analytics/ThreatActivity'
import { RiskIntelligence, KeyIntelligence } from '../components/analytics/IntelPanels'

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 14, label: '14 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
]

const INCIDENT_WINDOW = 100

/**
 * Cyber Intelligence & Analytics.
 *
 * Reuses the existing /api/incidents/stats endpoint (including its `days`
 * parameter for the date range) plus the incident list for the highest
 * observed risk score. All figures and observations are computed from that
 * real data — see lib/analytics.js. Nothing is estimated or invented.
 */
export default function Analytics() {
  const [days, setDays] = useState(14)
  const [stats, setStats] = useState(null)
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(
    async (period, manual = false) => {
      if (manual) setRefreshing(true)
      setError('')
      try {
        const [statsData, list] = await Promise.all([
          getStats(period),
          listIncidents({ page: 1, pageSize: INCIDENT_WINDOW }),
        ])
        setStats(statsData)
        setIncidents(list.items || [])
      } catch {
        setError('Could not load analytics. The detection service may be offline.')
      } finally {
        setLoading(false)
        if (manual) setRefreshing(false)
      }
    },
    []
  )

  useEffect(() => {
    load(days)
  }, [days, load])

  const summary = useMemo(() => summarize(stats, incidents), [stats, incidents])
  const keyIntel = useMemo(() => deriveKeyIntel(summary), [summary])

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-375 space-y-4 p-6">
        {/* header */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
              <BarChart3 size={18} />
            </span>
            <div>
              <h1 className="text-[21px] font-semibold tracking-tight text-zinc-50">
                Cyber Intelligence &amp; Analytics
              </h1>
              <p className="mt-0.5 text-[14px] text-zinc-500">
                Threat patterns, investigation activity, and cybercrime trends.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* date range */}
            <div className="flex rounded-md border border-white/8 bg-white/2 p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r.days}
                  onClick={() => setDays(r.days)}
                  className={`rounded px-2.5 py-1.5 text-[13px] font-medium transition ${
                    days === r.days
                      ? 'bg-cyan-400/12 text-cyan-200'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => load(days, true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/8 bg-white/3 px-2.5 py-1.5 text-[13.5px] text-zinc-300 transition hover:bg-white/6 disabled:opacity-50"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </header>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-900/60 bg-red-950/30 px-4 py-3 text-[14px] text-red-300">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 rounded-lg border border-white/7 bg-white/2 px-4 py-16 text-[14.5px] text-zinc-500">
            <Loader2 size={15} className="animate-spin" /> Loading analytics…
          </div>
        ) : (
          <>
            {/* operational summary */}
            <SummaryStrip summary={summary} />

            {/* threat landscape */}
            <ThreatLandscape stats={stats} />

            {/* trend */}
            <ThreatActivity dailyCounts={stats?.daily_counts || []} trend={summary?.trend} days={days} />

            {/* risk + key intelligence */}
            <div className="grid gap-4 xl:grid-cols-2">
              <RiskIntelligence summary={summary} />
              <KeyIntelligence items={keyIntel} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
