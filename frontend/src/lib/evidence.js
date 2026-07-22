/**
 * Evidence Vault helpers — integrity hashing and auto-derivation of case
 * artifacts from data the backend already produced (the reported content,
 * detection findings, WHOIS/DNS/SSL/GeoIP investigation).
 *
 * Each evidence item is content-addressed: a SHA-256 hash is computed over
 * its content via the Web Crypto API, giving a tamper-evident fingerprint
 * (the "integrity hashing" the module is meant to provide). Nothing is
 * fabricated — auto artifacts are only emitted for data that actually exists
 * on the incident. Officer-added items are hashed the same way.
 *
 * Evidence item shape:
 *   {
 *     id: string,          // unique id
 *     key?: string,        // stable de-dupe key for auto artifacts
 *     kind: 'artifact' | 'note' | 'url' | 'file',
 *     label: string,       // short title
 *     content: string,     // text body / url / filename
 *     source: 'auto' | 'manual',
 *     addedBy: string,
 *     addedAt: ISOString,
 *     hash: string,        // SHA-256 hex of content
 *     meta?: object,       // extra info (file size/type, etc.)
 *   }
 */

export const EVIDENCE_KINDS = {
  artifact: { label: 'Artifact', tone: 'text-purple-300 border-purple-500/40 bg-purple-500/10' },
  note: { label: 'Note', tone: 'text-sky-300 border-sky-500/40 bg-sky-500/10' },
  url: { label: 'URL', tone: 'text-amber-300 border-amber-500/40 bg-amber-500/10' },
  file: { label: 'File', tone: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10' },
}

/** SHA-256 hex digest of a string using the Web Crypto API. */
export async function sha256Hex(text) {
  try {
    const bytes = new TextEncoder().encode(String(text ?? ''))
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return ''
  }
}

/** SHA-256 hex digest of raw bytes (used for uploaded files). */
export async function sha256HexBytes(arrayBuffer) {
  try {
    const digest = await crypto.subtle.digest('SHA-256', arrayBuffer)
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return ''
  }
}

function rid() {
  return `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Builds an evidence item, computing its integrity hash. `source`, `addedBy`
 * and `addedAt` default to a manual officer entry made now.
 */
export async function makeEvidenceItem({ kind, label, content, source = 'manual', addedBy = 'Officer', key, meta, hash }) {
  return {
    id: rid(),
    key: key || null,
    kind,
    label,
    content,
    source,
    addedBy,
    addedAt: new Date().toISOString(),
    hash: hash ?? (await sha256Hex(content)),
    meta: meta || null,
  }
}

/**
 * Derives the automatic evidence artifacts for a case from its incident and
 * (optional) full detail. Only produces items for data that is present.
 * Returns unhashed descriptors — hashes are attached by hashAutoEvidence.
 */
export function deriveAutoEvidence(incident, detail) {
  const src = detail || incident || {}
  const inv = src.investigation_data || {}
  const investigation = inv.investigation || null
  const items = []

  // 1. The original reported content (the primary piece of evidence).
  if (src.raw_content) {
    items.push({
      key: 'reported-content',
      kind: src.incident_type === 'url' ? 'url' : 'artifact',
      label: src.incident_type === 'url' ? 'Reported URL' : 'Reported content',
      content: src.raw_content,
    })
  }

  // 2. Detection result snapshot.
  const detParts = []
  if (src.risk_score != null) detParts.push(`Risk score: ${Number(src.risk_score).toFixed(1)}/100`)
  if (src.threat_level) detParts.push(`Threat level: ${src.threat_level}`)
  if (src.incident_type) detParts.push(`Type: ${src.incident_type}`)
  const prob = inv.ml_phishing_probability ?? inv.ml_scam_probability
  if (typeof prob === 'number') detParts.push(`ML probability: ${(prob * 100).toFixed(1)}%`)
  if (detParts.length) {
    items.push({
      key: 'detection-result',
      kind: 'artifact',
      label: 'Detection result',
      content: detParts.join('\n'),
    })
  }

  // 3. Heuristics that fired.
  const heur = inv.heuristics_triggered || investigation?.heuristics_triggered || []
  if (heur.length) {
    items.push({
      key: 'heuristics',
      kind: 'artifact',
      label: 'Heuristics triggered',
      content: heur.map((h) => (typeof h === 'string' ? h : h?.name || JSON.stringify(h))).join('\n'),
    })
  }

  // 4. AI explanation (Gemini).
  if (src.ai_explanation) {
    items.push({
      key: 'ai-explanation',
      kind: 'artifact',
      label: 'AI analysis (Gemini)',
      content: src.ai_explanation,
    })
  }

  // 5. Investigation intelligence (WHOIS / DNS / SSL / GeoIP).
  if (investigation) {
    const w = investigation.whois || {}
    const d = investigation.dns || {}
    const s = investigation.ssl || {}
    const g = investigation.geolocation || {}
    const lines = []
    if (w.registrar) lines.push(`Registrar: ${w.registrar}`)
    if (w.creation_date) lines.push(`Domain created: ${w.creation_date}`)
    if (w.domain_age_days != null) lines.push(`Domain age (days): ${w.domain_age_days}`)
    if (d.a_records?.length) lines.push(`A records: ${d.a_records.join(', ')}`)
    if (d.nameservers?.length) lines.push(`Name servers: ${d.nameservers.join(', ')}`)
    if (s.issuer) lines.push(`SSL issuer: ${s.issuer}`)
    if (s.valid_until) lines.push(`SSL valid until: ${s.valid_until}`)
    if (g.country) lines.push(`Hosting country: ${g.country}`)
    if (g.city) lines.push(`Hosting city: ${g.city}`)
    if (lines.length) {
      items.push({
        key: 'threat-intel',
        kind: 'artifact',
        label: 'Threat intelligence',
        content: lines.join('\n'),
      })
    }

    const flags = investigation.red_flags || []
    if (flags.length) {
      items.push({
        key: 'red-flags',
        kind: 'artifact',
        label: 'Investigation red flags',
        content: flags.join('\n'),
      })
    }
  }

  return items
}

/** Hashes a set of auto descriptors into full, persistable evidence items. */
export async function hashAutoEvidence(descriptors) {
  return Promise.all(
    descriptors.map((d) =>
      makeEvidenceItem({ ...d, source: 'auto', addedBy: 'System (auto-collected)' })
    )
  )
}

export function shortHash(hash) {
  return hash ? `${hash.slice(0, 12)}…${hash.slice(-6)}` : '—'
}

export function formatBytes(n) {
  if (n == null) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
