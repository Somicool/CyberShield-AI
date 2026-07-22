/**
 * api.js — the ONLY place the extension talks to CyberShield AI.
 *
 * There is NO AI/model logic in the extension. Every check calls the existing
 * FastAPI backend:
 *   - POST /api/detect/scan  → fast, non-persisting URL risk check (real-time)
 *   - POST /api/detect       → full analysis incl. Gemini AI summary
 *   - POST /api/complaints   → citizen complaint / report (requires JWT)
 *
 * CONFIG.apiBase / dashboardUrl point at the running CyberShield instance.
 * Change these for a deployed backend.
 */

export const CONFIG = {
  apiBase: 'http://127.0.0.1:8000/api',
  dashboardUrl: 'http://localhost:5173',
}

async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${CONFIG.apiBase}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    const err = new Error(detail.detail || `Request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return res.json()
}

/** Fast real-time risk check (no incident is created). */
export function scanUrl(url) {
  return request('/detect/scan', { method: 'POST', body: { url } })
}

/** Full analysis: risk score, threat level + Gemini AI explanation. */
export function analyzeUrl(url) {
  return request('/detect', { method: 'POST', body: { type: 'url', content: url } })
}

/** File a report for a website. Requires an authenticated citizen token. */
export function reportWebsite({ url, category = 'Suspicious Website', description }, token) {
  return request('/complaints', {
    method: 'POST',
    token,
    body: {
      category,
      description: description || `Reported from CyberShield Guardian: ${url}`,
      url,
    },
  })
}

/**
 * The site origin (scheme://host) for a URL. Real-time browsing protection
 * checks the ORIGIN, not the full path/query — the URL-only model treats long
 * query strings (e.g. Google search / YouTube watch URLs) as suspicious, which
 * caused false positives on safe sites. Malicious domains are still caught
 * because their origin itself is flagged.
 */
export function originOf(url) {
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

/**
 * Maps a backend threat_level to the extension's verdict:
 *   - 'malicious'  (critical)   → block with the full warning page
 *   - 'suspicious' (high)       → non-blocking caution (badge + notification)
 *   - 'safe'       (medium/low) → no interruption
 * Blocking is reserved for high-confidence malicious sites; anything uncertain
 * is a warning, not a block.
 */
export function verdictFromLevel(threatLevel) {
  if (threatLevel === 'critical') return 'malicious'
  if (threatLevel === 'high') return 'suspicious'
  return 'safe'
}

/**
 * Qualitative confidence in the verdict, derived from how decisive the risk
 * score is (distance from the neutral midpoint). Shown next to the Safe /
 * Malicious verdict so "High" reads as "high confidence in that verdict" —
 * avoids a bare percentage looking like a danger level.
 */
export function confidenceLabel(score) {
  if (score == null) return 'N/A'
  const distance = Math.abs(score - 50) / 50 // 0..1
  if (distance >= 0.6) return 'High'
  if (distance >= 0.3) return 'Medium'
  return 'Low'
}

/**
 * URLs the extension should NOT scan or warn about: the CyberShield app /
 * backend themselves, localhost / loopback, and private-network addresses.
 * These are trusted or local development contexts, not internet phishing
 * targets, so scanning them produces false alarms.
 */
export function isTrustedOrExempt(url) {
  try {
    const u = new URL(url)
    const host = u.hostname
    const exempt = new Set()
    try { exempt.add(new URL(CONFIG.dashboardUrl).hostname) } catch { /* ignore */ }
    try { exempt.add(new URL(CONFIG.apiBase).hostname) } catch { /* ignore */ }
    if (exempt.has(host)) return true
    if (host === 'localhost' || host.endsWith('.localhost') || host === '127.0.0.1' || host === '::1') return true
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true
    if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(host)) return true
    return false
  } catch {
    return false
  }
}
