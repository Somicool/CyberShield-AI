import { useEffect, useState, useCallback, useMemo } from 'react'
import { getStats, listIncidents } from '../api/incidents'
import { deriveInsights, todayUtcKey } from '../lib/intel'
import { useCaseWorkflow, getCaseMeta } from '../lib/caseWorkflow'
import { deriveCaseId, threatRank } from '../lib/caseHelpers'
import CommandHeader from '../components/dashboard/CommandHeader'
import OperationalOverview from '../components/dashboard/OperationalOverview'
import PriorityNow from '../components/dashboard/PriorityNow'
import ThreatOverview from '../components/dashboard/ThreatOverview'
import IntelDigest from '../components/dashboard/IntelDigest'
import RecentActivity from '../components/dashboard/RecentActivity'
import QuickActions from '../components/dashboard/QuickActions'

const POLL_INTERVAL_MS = 10000
const ANALYSIS_PAGE_SIZE = 100
const RESOLVED = new Set(['resolved', 'closed'])

const TYPE_WORD = { url: 'URL', email: 'Email', sms: 'SMS', qr: 'QR' }

function formatDuration(ms) {
  if (!ms || ms <= 0) return null
  const mins = Math.round(ms / 60000)
  if (mins < 60) return { value: String(mins), suffix: 'min' }
  const hrs = mins / 60
  if (hrs < 48) return { value: hrs.toFixed(1), suffix: 'hrs' }
  return { value: (hrs / 24).toFixed(1), suffix: 'days' }
}

/**
 * Police Dashboard — Cyber Crime Command Center (summary view).
 *
 * Answers, in order: is anything critical happening, which cases need
 * attention, what patterns are emerging, what threat mix are we seeing, what
 * happened recently, and where to go next. Complete datasets deliberately live
 * on their dedicated pages (Cases, Live Feed, Analytics, Threat Graph).
 *
 * All figures come from the existing read-only APIs (/incidents,
 * /incidents/stats) plus the officer workflow store — nothing is fabricated.
 */
export default function LiveFeed() {
  const workflow = useCaseWorkflow() // re-render when officers change case state
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [live, setLive] = useState(true)

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      const [statsData, recentData] = await Promise.all([
        getStats(14),
        listIncidents({ page: 1, pageSize: ANALYSIS_PAGE_SIZE }),
      ])
      setStats(statsData)
      setRecent(recentData.items || [])
      setLastUpdated(new Date())
      setLive(true)
    } catch {
      setLive(false)
    } finally {
      if (manual) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [load])

  // ---- compose incidents with officer workflow state ----------------------
  const withMeta = useMemo(
    () => recent.map((incident) => ({ incident, meta: getCaseMeta(incident.id) })),
    // workflow is a dependency so status/officer edits re-derive everything
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recent, workflow]
  )

  // ---- Priority Now: top 5 unresolved high/critical cases -----------------
  const priority = useMemo(
    () =>
      withMeta
        .filter(
          ({ incident, meta }) =>
            (incident.threat_level === 'critical' || incident.threat_level === 'high') &&
            !RESOLVED.has(meta.status)
        )
        .sort((a, b) => {
          const byRisk = (b.incident.risk_score ?? 0) - (a.incident.risk_score ?? 0)
          if (byRisk !== 0) return byRisk
          return threatRank(b.incident.threat_level) - threatRank(a.incident.threat_level)
        }),
    [withMeta]
  )

  const insights = useMemo(
    () => deriveInsights(recent, stats?.daily_counts || []),
    [recent, stats]
  )

  // ---- Operational Overview metrics (all real) ---------------------------
  const metrics = useMemo(() => {
    const daily = stats?.daily_counts || []
    const today = daily.length ? daily[daily.length - 1] : null
    const yesterday = daily.length > 1 ? daily[daily.length - 2] : null
    const newToday = today && today.date === todayUtcKey() ? today.count : 0

    const criticalCount = stats?.by_threat_level?.find((r) => r.threat_level === 'critical')?.count || 0
    const total = stats?.total_incidents || 0
    const avgRisk = stats?.average_risk_score ?? 0

    const resolved = withMeta.filter(({ meta }) => RESOLVED.has(meta.status))
    const activeCases = Math.max(0, total - resolved.length)

    // Average investigation time = detection → resolution, for cases an officer
    // has actually resolved. Shows "—" until at least one case is resolved.
    const durations = resolved
      .map(({ incident, meta }) => {
        const endIso = meta.timeline?.closed || meta.timeline?.review || meta.updatedAt
        if (!endIso) return null
        const ms = new Date(endIso) - new Date(incident.created_at)
        return ms > 0 ? ms : null
      })
      .filter(Boolean)
    const avgMs = durations.length ? durations.reduce((s, d) => s + d, 0) / durations.length : 0
    const avgTime = formatDuration(avgMs)

    let complaintTrend = null
    if (today && yesterday) {
      const delta = today.count - yesterday.count
      complaintTrend = {
        dir: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
        label: `${delta >= 0 ? '+' : ''}${delta} vs yest.`,
      }
    }

    const criticalShare = total ? Math.round((criticalCount / total) * 100) : 0

    return [
      { label: 'Active Cases', value: activeCases.toLocaleString() },
      {
        label: 'Critical Threats',
        value: criticalCount.toLocaleString(),
        alert: criticalCount > 0 ? 'critical' : undefined,
        trend: total ? { dir: 'flat', label: `${criticalShare}% of all` } : null,
      },
      { label: 'New Complaints', value: newToday.toLocaleString(), trend: complaintTrend },
      { label: 'Cases Resolved', value: resolved.length.toLocaleString() },
      {
        label: 'Average Risk',
        value: avgRisk.toFixed(0),
        suffix: '/100',
        alert: avgRisk >= 70 ? 'warn' : undefined,
      },
      {
        label: 'Avg. Investigation',
        value: avgTime ? avgTime.value : '—',
        suffix: avgTime ? avgTime.suffix : undefined,
      },
    ]
  }, [stats, withMeta])

  // ---- Recent Activity: latest events, de-duplicated vs Priority Now -----
  const activity = useMemo(() => {
    const priorityIds = new Set(priority.slice(0, 5).map((p) => p.incident.id))
    const events = []

    for (const { incident, meta } of withMeta) {
      // Detection events — skipped for cases already shown in Priority Now.
      if (!priorityIds.has(incident.id)) {
        const word = TYPE_WORD[incident.incident_type] || incident.incident_type
        const lvl = incident.threat_level || 'unknown'
        events.push({
          id: `det:${incident.id}`,
          at: incident.created_at,
          level: lvl,
          incidentId: incident.id,
          text:
            lvl === 'critical' || lvl === 'high'
              ? `${lvl === 'critical' ? 'Critical' : 'High-risk'} ${word} detected`
              : `${word} checked — ${lvl} risk`,
        })
      }

      // Officer workflow events (real, from the workflow store).
      if (meta.updatedAt) {
        const label = RESOLVED.has(meta.status)
          ? `Case ${deriveCaseId(incident)} marked ${meta.status}`
          : meta.status === 'investigating'
            ? `Investigation started on ${deriveCaseId(incident)}`
            : `Case ${deriveCaseId(incident)} updated`
        events.push({
          id: `wf:${incident.id}:${meta.updatedAt}`,
          at: meta.updatedAt,
          level: RESOLVED.has(meta.status) ? 'low' : 'medium',
          incidentId: incident.id,
          text: label,
        })
      }
    }

    return events.sort((a, b) => new Date(b.at) - new Date(a.at))
  }, [withMeta, priority])

  return (
    <div className="min-h-full bg-[#16181c]">
      <div className="mx-auto max-w-375 space-y-4 p-6">
        <CommandHeader
          lastUpdated={lastUpdated}
          onRefresh={() => load(true)}
          refreshing={refreshing}
          live={live}
        />

        <OperationalOverview metrics={metrics} />

        {/* Priority + threat mix */}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <PriorityNow cases={priority} />
          <ThreatOverview stats={stats} />
        </div>

        {/* Emerging patterns + chronology */}
        <div className="grid gap-4 xl:grid-cols-2">
          <IntelDigest insights={insights} />
          <RecentActivity events={activity} />
        </div>

        <QuickActions topCaseId={priority[0]?.incident.id} />
      </div>
    </div>
  )
}
