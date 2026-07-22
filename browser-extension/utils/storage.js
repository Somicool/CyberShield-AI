/**
 * storage.js — thin promise wrapper around chrome.storage.local.
 *
 * Stores ONLY minimal, non-sensitive local state:
 *   - settings   : { protectionEnabled }
 *   - history    : [{ url, host, date, prediction, riskScore }]  (local browsing history)
 *   - stats      : { protectedWebsites, threatsBlocked, lastScan }
 *   - authToken  : JWT bridged from the CyberShield web session (never a password)
 *
 * No passwords are ever stored. History never leaves the device.
 */

const KEYS = {
  settings: 'guardian.settings',
  history: 'guardian.history',
  stats: 'guardian.stats',
  token: 'guardian.authToken',
}

const HISTORY_LIMIT = 200

const DEFAULT_SETTINGS = { protectionEnabled: true }
const DEFAULT_STATS = { protectedWebsites: 0, threatsBlocked: 0, lastScan: null }

function get(key, fallback) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (res) => resolve(res[key] ?? fallback))
  })
}

function set(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve)
  })
}

export async function getSettings() {
  return { ...DEFAULT_SETTINGS, ...(await get(KEYS.settings, {})) }
}

export async function setProtectionEnabled(enabled) {
  const s = await getSettings()
  s.protectionEnabled = Boolean(enabled)
  await set(KEYS.settings, s)
  return s
}

export async function getStats() {
  return { ...DEFAULT_STATS, ...(await get(KEYS.stats, {})) }
}

export async function getHistory() {
  return (await get(KEYS.history, [])) || []
}

export async function clearHistory() {
  await set(KEYS.history, [])
}

/**
 * Records a scan into local history + updates aggregate stats.
 * prediction is 'safe' | 'malicious'.
 */
export async function recordScan({ url, host, prediction, riskScore }) {
  const history = await getHistory()
  const entry = { url, host, date: new Date().toISOString(), prediction, riskScore }
  const next = [entry, ...history].slice(0, HISTORY_LIMIT)
  await set(KEYS.history, next)

  const stats = await getStats()
  stats.protectedWebsites += 1
  if (prediction === 'malicious') stats.threatsBlocked += 1
  stats.lastScan = entry.date
  await set(KEYS.stats, stats)
  return entry
}

export async function getToken() {
  return get(KEYS.token, null)
}

export async function setToken(token) {
  await set(KEYS.token, token || null)
}
