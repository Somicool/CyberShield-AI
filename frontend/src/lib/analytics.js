/**
 * Analytics derivations.
 *
 * Every value here is computed arithmetically from the existing
 * /api/incidents/stats payload (and the incident list for "highest risk").
 * No LLM, no estimates, no invented figures — if the data can't support an
 * observation, the helper returns null and the UI says so.
 */

export const TYPE_LABEL = { url: 'URL / Link', email: 'Email', sms: 'SMS', qr: 'QR Code' }
export const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low']

/** Chart palette: semantic only — red = critical, amber = elevated, green = safe. */
export const SEVERITY_COLOR = {
  critical: '#f87171',
  high: '#fbbf24',
  medium: '#a1a1aa',
  low: '#34d399',
}

/** Muted gold ramp for threat types (single accent hue, varying depth). */
export const TYPE_RAMP = ['#d4a72c', '#a8842a', '#7d6326', '#57431d']

export const CHART_AXIS = '#71717a'
export const CHART_GRID = '#27272a'
export const TOOLTIP_STYLE = {
  background: '#18181b',
  border: '1px solid #3f3f46',
  borderRadius: 6,
  fontSize: 12,
  color: '#e4e4e7',
}

function pct(part, whole) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0
}

/**
 * Trend direction across the daily series. Compares the first half of the
 * period to the second half. Returns null when there aren't enough points
 * to make a defensible statement.
 */
export function deriveTrend(dailyCounts = []) {
  const points = dailyCounts.filter((d) => d && typeof d.count === 'number')
  if (points.length < 2) return null

  const mid = Math.floor(points.length / 2)
  const firstHalf = points.slice(0, mid)
  const secondHalf = points.slice(mid)
  const sum = (arr) => arr.reduce((s, d) => s + d.count, 0)
  const a = sum(firstHalf)
  const b = sum(secondHalf)
  if (a === 0 && b === 0) return null

  const change = a === 0 ? 100 : Math.round(((b - a) / a) * 100)
  const dir = change > 10 ? 'up' : change < -10 ? 'down' : 'flat'
  return {
    dir,
    change,
    label: dir === 'up' ? 'Increasing' : dir === 'down' ? 'Decreasing' : 'Stable',
    sentence:
      dir === 'up'
        ? 'Threat activity increased over the selected period.'
        : dir === 'down'
          ? 'Threat activity decreased over the selected period.'
          : 'Threat activity remained stable over the selected period.',
  }
}

/** Rolls the stats payload into the figures the page displays. */
export function summarize(stats, incidents = []) {
  if (!stats) return null

  const total = stats.total_incidents || 0
  const avgRisk = stats.average_risk_score ?? 0
  const levels = stats.by_threat_level || []
  const types = stats.by_type || []

  const countFor = (lvl) => levels.find((r) => r.threat_level === lvl)?.count || 0
  const levelTotal = levels.reduce((s, r) => s + r.count, 0)

  const critical = countFor('critical')
  const low = countFor('low')

  const topTypeRow = [...types].sort((a, b) => b.count - a.count)[0] || null
  const typeTotal = types.reduce((s, r) => s + r.count, 0)

  // Highest observed risk score in the loaded incident window (real values).
  const highestRisk = incidents.length
    ? Math.max(...incidents.map((i) => i.risk_score ?? 0))
    : null

  return {
    total,
    avgRisk,
    critical,
    criticalPct: pct(critical, levelTotal),
    lowPct: pct(low, levelTotal),
    highestRisk,
    topType: topTypeRow?.incident_type || null,
    topTypeCount: topTypeRow?.count || 0,
    topTypePct: topTypeRow ? pct(topTypeRow.count, typeTotal) : 0,
    trend: deriveTrend(stats.daily_counts),
    levelTotal,
    typeTotal,
  }
}

/**
 * Short, factual observations for the Key Intelligence panel. Each is a plain
 * arithmetic statement about the real data — never a generated conclusion.
 */
export function deriveKeyIntel(summary) {
  if (!summary || summary.total === 0) return []
  const out = []

  if (summary.topType) {
    out.push({
      id: 'top-type',
      tone: 'neutral',
      text: `${TYPE_LABEL[summary.topType] || summary.topType} threats dominate current activity — ${summary.topTypeCount} of ${summary.typeTotal} cases (${summary.topTypePct}%).`,
    })
  }

  if (summary.critical > 0) {
    out.push({
      id: 'critical-share',
      tone: summary.criticalPct >= 40 ? 'critical' : 'elevated',
      text: `${summary.critical} case${summary.critical === 1 ? '' : 's'} rated critical severity — ${summary.criticalPct}% of all recorded threats.`,
    })
  }

  if (summary.trend) {
    out.push({
      id: 'trend',
      tone: summary.trend.dir === 'up' ? 'elevated' : summary.trend.dir === 'down' ? 'safe' : 'neutral',
      text: `${summary.trend.sentence}${summary.trend.dir !== 'flat' ? ` (${summary.trend.change > 0 ? '+' : ''}${summary.trend.change}% between period halves)` : ''}`,
    })
  }

  if (summary.avgRisk >= 60) {
    out.push({
      id: 'avg-risk',
      tone: 'elevated',
      text: `Average risk score is ${summary.avgRisk.toFixed(1)}/100, indicating an elevated overall threat level.`,
    })
  } else if (summary.avgRisk > 0 && summary.lowPct >= 60) {
    out.push({
      id: 'mostly-low',
      tone: 'safe',
      text: `${summary.lowPct}% of recorded checks were low risk, suggesting most reported content is benign.`,
    })
  }

  return out
}
