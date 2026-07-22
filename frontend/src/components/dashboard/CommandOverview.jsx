import { Folder, ShieldAlert, Inbox, CheckCircle2, Gauge, Timer } from 'lucide-react'
import KpiCard from './KpiCard'
import { todayUtcKey } from '../../lib/intel'

function riskDescriptor(score) {
  if (score >= 70) return { direction: 'up', label: 'Elevated' }
  if (score >= 40) return { direction: 'flat', label: 'Moderate' }
  return { direction: 'down', label: 'Low' }
}

/**
 * Section 1 — Command Overview.
 *
 * KPIs are derived from the real /incidents/stats payload. Two of the
 * requested metrics (cases resolved today, average investigation time)
 * have no backing field in the current backend, so they render as "—"
 * instead of fabricated figures — the card slots stay in place for when
 * a resolution/case-workflow API lands.
 */
export default function CommandOverview({ stats }) {
  const daily = stats?.daily_counts || []
  const today = daily.length ? daily[daily.length - 1] : null
  const yesterday = daily.length > 1 ? daily[daily.length - 2] : null

  const todayKey = todayUtcKey()
  const newToday = today && today.date === todayKey ? today.count : 0

  const criticalCount =
    stats?.by_threat_level?.find((r) => r.threat_level === 'critical')?.count || 0
  const total = stats?.total_incidents || 0
  const avgRisk = stats?.average_risk_score ?? 0

  // Real trend: today's new complaints vs yesterday.
  let complaintTrend = { direction: 'flat', label: 'vs yesterday' }
  if (today && yesterday) {
    const delta = today.count - yesterday.count
    complaintTrend = {
      direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
      label: `${delta >= 0 ? '+' : ''}${delta} vs yesterday`,
    }
  }

  const criticalShare = total ? Math.round((criticalCount / total) * 100) : 0

  const cards = [
    {
      icon: Folder,
      label: 'Active Cases',
      value: total.toLocaleString(),
      accent: 'purple',
      trend: { direction: 'up', label: `+${newToday} today` },
    },
    {
      icon: ShieldAlert,
      label: 'Critical Threats',
      value: criticalCount.toLocaleString(),
      accent: 'red',
      trend: { direction: criticalShare >= 30 ? 'up' : 'flat', label: `${criticalShare}% of cases` },
    },
    {
      icon: Inbox,
      label: 'New Complaints Today',
      value: newToday.toLocaleString(),
      accent: 'sky',
      trend: complaintTrend,
    },
    {
      icon: CheckCircle2,
      label: 'Cases Resolved Today',
      value: '—',
      accent: 'emerald',
    },
    {
      icon: Gauge,
      label: 'Average Risk Score',
      value: `${avgRisk.toFixed(0)}`,
      accent: 'amber',
      trend: riskDescriptor(avgRisk),
    },
    {
      icon: Timer,
      label: 'Avg. Investigation Time',
      value: '—',
      accent: 'slate',
    },
  ]

  return (
    <section>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <KpiCard key={c.label} {...c} />
        ))}
      </div>
    </section>
  )
}
