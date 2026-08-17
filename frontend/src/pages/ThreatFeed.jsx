import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Activity } from 'lucide-react'
import { getStats, listIncidents } from '../api/incidents'
import { deriveInsights } from '../lib/intel'
import IntelligenceAlerts from '../components/dashboard/IntelligenceAlerts'
import ThreatFeedTable from '../components/dashboard/ThreatFeedTable'

const POLL_INTERVAL_MS = 15000
const ANALYSIS_PAGE_SIZE = 100

/**
 * Live Feed — the complete threat stream and full AI intelligence feed.
 *
 * This page holds the full datasets that used to be embedded in the dashboard
 * (which is now a summary). Both sections reuse the existing, unchanged
 * IntelligenceAlerts and ThreatFeedTable components, so search, filters,
 * auto-refresh, pagination and threat badges all behave exactly as before.
 */
export default function ThreatFeed() {
  const [params] = useSearchParams()
  const [insights, setInsights] = useState([])
  const [search, setSearch] = useState('')
  const intelRef = useRef(null)
  const feedRef = useRef(null)

  const loadInsights = useCallback(async () => {
    try {
      const [stats, recent] = await Promise.all([
        getStats(14),
        listIncidents({ page: 1, pageSize: ANALYSIS_PAGE_SIZE }),
      ])
      setInsights(deriveInsights(recent.items || [], stats?.daily_counts || []))
    } catch {
      /* feed table surfaces its own errors */
    }
  }, [])

  useEffect(() => {
    loadInsights()
    const interval = setInterval(loadInsights, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [loadInsights])

  // Deep-link from the dashboard: ?view=intel focuses the intelligence feed.
  useEffect(() => {
    if (params.get('view') === 'intel') {
      intelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [params])

  // Clicking an insight pivots the table's search to the underlying incidents.
  function handleInspect(insight) {
    setSearch(insight.query || '')
    feedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-full bg-[#16181c]">
      <div className="mx-auto max-w-375 space-y-6 p-6">
        <header className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-amber-400/25 bg-amber-400/10 text-amber-300">
            <Activity size={18} />
          </span>
          <div>
            <h1 className="text-[19px] font-semibold tracking-tight text-zinc-50">Live Feed</h1>
            <p className="mt-0.5 text-[12.5px] text-zinc-500">
              Complete threat stream and AI intelligence findings
            </p>
          </div>
        </header>

        <div ref={intelRef} className="scroll-mt-6">
          <IntelligenceAlerts insights={insights} onInspect={handleInspect} />
        </div>

        <div ref={feedRef} className="scroll-mt-6">
          <ThreatFeedTable
            search={search}
            setSearch={setSearch}
            // Drill-through filters from Analytics (?level= / ?type=).
            initialThreatLevel={params.get('level') || ''}
            initialIncidentType={params.get('type') || ''}
          />
        </div>
      </div>
    </div>
  )
}
