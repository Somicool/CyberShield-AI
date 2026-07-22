import { useEffect, useState, useCallback, useRef } from 'react'
import { ShieldHalf } from 'lucide-react'
import { getStats, listIncidents } from '../api/incidents'
import { deriveInsights } from '../lib/intel'
import CommandOverview from '../components/dashboard/CommandOverview'
import IntelligenceAlerts from '../components/dashboard/IntelligenceAlerts'
import HighPriorityCases from '../components/dashboard/HighPriorityCases'
import ThreatFeedTable from '../components/dashboard/ThreatFeedTable'

const POLL_INTERVAL_MS = 10000
const ANALYSIS_PAGE_SIZE = 100

/**
 * Police Dashboard Home — Cyber Crime Command Center.
 *
 * Composes four sections from the existing read-only APIs:
 *   1. Command Overview  (KPIs from /incidents/stats)
 *   2. AI Intelligence   (patterns derived from recent incidents)
 *   3. High Priority     (recent HIGH/CRITICAL incidents)
 *   4. Live Threat Feed  (the original searchable/paginated table)
 *
 * Routing, APIs and auth are untouched — this only re-composes data the
 * dashboard already had access to.
 */
export default function LiveFeed() {
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [search, setSearch] = useState('')
  const feedRef = useRef(null)

  const loadOverview = useCallback(async () => {
    // Stats power the KPIs; the recent set (100 newest) powers the AI
    // intelligence derivation and the high-priority triage list.
    const [statsData, recentData] = await Promise.all([
      getStats(14),
      listIncidents({ page: 1, pageSize: ANALYSIS_PAGE_SIZE }),
    ])
    setStats(statsData)
    setRecent(recentData.items || [])
  }, [])

  useEffect(() => {
    loadOverview().catch(() => {})
    const interval = setInterval(() => loadOverview().catch(() => {}), POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [loadOverview])

  const insights = deriveInsights(recent, stats?.daily_counts || [])
  const highPriority = recent.filter(
    (i) => i.threat_level === 'critical' || i.threat_level === 'high'
  )

  function handleInspect(insight) {
    // Pivot the officer to the underlying incidents via the existing feed search.
    setSearch(insight.query || '')
    feedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="space-y-8 p-8">
      <header className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-300">
          <ShieldHalf size={20} />
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Dashboard</h2>
          <p className="text-sm text-slate-500">Cyber Crime Command Center · real-time threat overview</p>
        </div>
      </header>

      <CommandOverview stats={stats} />

      <IntelligenceAlerts insights={insights} onInspect={handleInspect} />

      <HighPriorityCases cases={highPriority} />

      <div ref={feedRef} className="scroll-mt-6">
        <ThreatFeedTable search={search} setSearch={setSearch} />
      </div>
    </div>
  )
}
