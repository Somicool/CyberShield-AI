/**
 * Client-side intelligence derivation.
 *
 * Everything here is computed from REAL incident data returned by the
 * existing /incidents API — no fabricated numbers. These helpers turn the
 * raw incident list into the patterns a Cyber Crime Command Center cares
 * about (repeat infrastructure, coordinated messaging, sudden spikes).
 */

const THREAT_RANK = { critical: 4, high: 3, medium: 2, low: 1, unknown: 0 }

/** Highest-severity threat level among a set of incidents. */
export function topThreatLevel(incidents) {
  return incidents.reduce((worst, i) => {
    const lvl = i.threat_level || 'unknown'
    return THREAT_RANK[lvl] > THREAT_RANK[worst] ? lvl : worst
  }, 'unknown')
}

/** Extract a hostname from a URL-ish string, or null if none. */
export function hostnameOf(raw) {
  if (!raw) return null
  try {
    const withScheme = raw.includes('://') ? raw : `http://${raw}`
    const host = new URL(withScheme).hostname.toLowerCase()
    return host || null
  } catch {
    return null
  }
}

/** Pull the first URL found inside free text (email/SMS bodies). */
export function firstUrlIn(text) {
  if (!text) return null
  const match = text.match(/https?:\/\/[^\s"'<>]+/i)
  return match ? match[0] : null
}

/** Relative "time ago" label for a timestamp. */
export function relativeTime(dateLike) {
  const then = new Date(dateLike).getTime()
  if (Number.isNaN(then)) return ''
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

/** Today's date in UTC as YYYY-MM-DD (matches the backend's date grouping). */
export function todayUtcKey() {
  return new Date().toISOString().slice(0, 10)
}

function normalizeMessage(text) {
  return (text || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Derive intelligence alerts from the recent incident set + daily trend.
 * Returns an array of insight objects sorted by severity, each shaped:
 *   { id, severity, title, detail, timestamp, query }
 * `query` is a search string the UI can drop into the existing feed filter
 * so clicking an insight surfaces exactly the incidents behind it.
 */
export function deriveInsights(incidents = [], dailyCounts = []) {
  const insights = []

  // 1. Repeat domain / shared infrastructure across complaints.
  const byHost = new Map()
  for (const inc of incidents) {
    const host = hostnameOf(inc.raw_content) || hostnameOf(firstUrlIn(inc.raw_content))
    if (!host) continue
    if (!byHost.has(host)) byHost.set(host, [])
    byHost.get(host).push(inc)
  }
  for (const [host, group] of byHost) {
    if (group.length >= 2) {
      const latest = group.reduce((a, b) => (a.created_at > b.created_at ? a : b))
      insights.push({
        id: `host:${host}`,
        severity: topThreatLevel(group),
        title: 'Shared domain across multiple complaints',
        detail: `${host} appears in ${group.length} separate incidents — possible coordinated campaign.`,
        timestamp: latest.created_at,
        query: host,
      })
    }
  }

  // 2. Repeated message reused across complaints (email/SMS templates).
  const byMessage = new Map()
  for (const inc of incidents) {
    if (inc.incident_type !== 'sms' && inc.incident_type !== 'email') continue
    const key = normalizeMessage(inc.raw_content)
    if (key.length < 12) continue
    if (!byMessage.has(key)) byMessage.set(key, [])
    byMessage.get(key).push(inc)
  }
  for (const [, group] of byMessage) {
    if (group.length >= 2) {
      const latest = group.reduce((a, b) => (a.created_at > b.created_at ? a : b))
      const snippet = latest.raw_content.slice(0, 60)
      insights.push({
        id: `msg:${snippet}`,
        severity: topThreatLevel(group),
        title: 'Repeated scam message detected',
        detail: `An identical message was reported ${group.length} times: “${snippet}${latest.raw_content.length > 60 ? '…' : ''}”`,
        timestamp: latest.created_at,
        query: snippet,
      })
    }
  }

  // 3. Spike detection: today's volume vs the recent daily average.
  if (dailyCounts.length >= 3) {
    const today = dailyCounts[dailyCounts.length - 1]
    const prior = dailyCounts.slice(0, -1)
    const avg = prior.reduce((s, d) => s + d.count, 0) / prior.length
    if (today && avg > 0 && today.count >= avg * 1.5 && today.count >= avg + 3) {
      insights.push({
        id: `spike:${today.date}`,
        severity: 'high',
        title: 'Spike in new complaints today',
        detail: `${today.count} complaints logged today vs a recent daily average of ${avg.toFixed(1)}.`,
        timestamp: new Date().toISOString(),
        query: '',
      })
    }
  }

  // 4. Concentration of critical threats needing attention.
  const criticals = incidents.filter((i) => i.threat_level === 'critical')
  if (criticals.length >= 3) {
    const latest = criticals.reduce((a, b) => (a.created_at > b.created_at ? a : b))
    insights.push({
      id: 'critical-volume',
      severity: 'critical',
      title: 'Elevated critical-threat volume',
      detail: `${criticals.length} critical-severity cases are currently active and require review.`,
      timestamp: latest.created_at,
      query: '',
    })
  }

  // 5. Dominant attack vector in recent activity.
  const typeCounts = incidents.reduce((m, i) => {
    m[i.incident_type] = (m[i.incident_type] || 0) + 1
    return m
  }, {})
  const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]
  if (topType && topType[1] >= 3) {
    const label = { url: 'URL / phishing links', sms: 'SMS scams', email: 'phishing emails', qr: 'QR-code scams' }[topType[0]] || topType[0]
    insights.push({
      id: `vector:${topType[0]}`,
      severity: 'medium',
      title: 'Primary attack vector',
      detail: `${label} are the most common threat right now (${topType[1]} recent cases).`,
      timestamp: new Date().toISOString(),
      query: '',
    })
  }

  insights.sort((a, b) => THREAT_RANK[b.severity] - THREAT_RANK[a.severity])
  return insights
}
