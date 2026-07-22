/**
 * Client-side entity extraction for display in the Investigation Workspace.
 *
 * The backend extracts these same entities server-side and pushes them into
 * Neo4j, but exposes no per-incident "list my entities" endpoint — so for
 * display we parse the incident's own content here using the same patterns.
 * Graph correlation itself still goes through the real /detect/graph API.
 *
 * Entity types map 1:1 to the graph's labels: Domain, Email, Phone, Wallet,
 * TelegramHandle — so clicking an entity can deep-link into the graph.
 */

const EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const PHONE = /\+?\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g
const BTC = /\b(?:bc1[a-z0-9]{25,62}|[13][a-zA-Z0-9]{25,34})\b/g
const ETH = /\b0x[a-fA-F0-9]{40}\b/g
const TELEGRAM_LINK = /(?:https?:\/\/)?t\.me\/([a-zA-Z0-9_]{5,32})/g
const TELEGRAM_HANDLE = /@([a-zA-Z0-9_]{5,32})/g
const URL_RE = /https?:\/\/[^\s"'<>]+/gi

function uniq(arr) {
  return [...new Set(arr)]
}

function domainsFrom(text, incidentType) {
  const domains = new Set()
  const urls = text.match(URL_RE) || []
  for (const u of urls) {
    try {
      domains.add(new URL(u).hostname.toLowerCase())
    } catch {
      /* ignore malformed */
    }
  }
  // A bare URL incident may have no scheme.
  if (incidentType === 'url' && domains.size === 0) {
    try {
      domains.add(new URL(text.includes('://') ? text : `http://${text}`).hostname.toLowerCase())
    } catch {
      /* ignore */
    }
  }
  return [...domains]
}

/**
 * Returns entities grouped by graph label:
 *   { Domain: [], Email: [], Phone: [], Wallet: [], TelegramHandle: [] }
 */
export function extractEntities(incident) {
  const text = incident?.raw_content || ''
  const type = incident?.incident_type

  const emails = uniq(text.match(EMAIL) || [])
  const textNoEmails = text.replace(EMAIL, ' ')

  const phones = uniq(text.match(PHONE) || []).filter(
    (m) => m.replace(/\D/g, '').length >= 7
  )

  const wallets = uniq([...(text.match(BTC) || []), ...(text.match(ETH) || [])])

  const telegram = new Set()
  let m
  while ((m = TELEGRAM_LINK.exec(text))) telegram.add(m[1])
  while ((m = TELEGRAM_HANDLE.exec(textNoEmails))) telegram.add(m[1])
  TELEGRAM_LINK.lastIndex = 0
  TELEGRAM_HANDLE.lastIndex = 0

  return {
    Domain: domainsFrom(text, type),
    Email: emails,
    Phone: phones,
    Wallet: wallets,
    TelegramHandle: [...telegram],
  }
}

export const ENTITY_META = {
  Domain: { label: 'Domains' },
  Email: { label: 'Emails' },
  Phone: { label: 'Phone Numbers' },
  Wallet: { label: 'Wallet Addresses' },
  TelegramHandle: { label: 'Telegram Handles' },
}
