/**
 * Assembles a read-only investigation context for the Copilot from data that
 * already exists in the backend (incident detail, cached WHOIS/DNS/SSL/GeoIP,
 * threat-graph results, workflow store). Nothing here is fabricated — missing
 * data is explicitly labelled so the model can say "Not Available".
 */
import { deriveCaseId, detectionConfidence } from './caseHelpers'
import { statusLabel } from './caseHelpers'

/** Which real backend sources are present for this investigation. */
export function investigationSources(incident, related, meta) {
  const inv = incident?.investigation_data || {}
  const investigation = inv.investigation || null
  return {
    risk: incident?.risk_score != null,
    heuristics: (inv.heuristics_triggered || []).length > 0,
    gemini: Boolean(incident?.ai_explanation),
    whois: Boolean(investigation?.whois),
    dns: Boolean(investigation?.dns),
    ssl: Boolean(investigation?.ssl),
    geoip: Boolean(investigation?.geolocation),
    graph: Array.isArray(related),
    related: (related || []).length > 0,
    notes: Boolean(meta?.notes),
    timeline: Object.keys(meta?.timeline || {}).length > 0,
  }
}

export const SOURCE_LABELS = {
  risk: 'Risk Score',
  heuristics: 'Detection Heuristics',
  gemini: 'Gemini Summary',
  whois: 'WHOIS',
  dns: 'DNS',
  ssl: 'SSL',
  geoip: 'GeoIP',
  graph: 'Threat Graph',
  related: 'Related Cases',
  notes: 'Officer Notes',
  timeline: 'Timeline',
}

/** High/Medium/Low grounding confidence based on how much real data exists. */
export function groundingConfidence(sources) {
  const present = Object.values(sources).filter(Boolean).length
  if (present >= 7) return 'High'
  if (present >= 4) return 'Medium'
  return 'Low'
}

function fmt(v) {
  return v == null || v === '' ? 'Not Available' : v
}

/** Builds the plain-text context block sent to the Copilot backend. */
export function buildContextString({ incident, caseId, meta, entities, related }) {
  if (!incident) return ''
  const inv = incident.investigation_data || {}
  const investigation = inv.investigation || null
  const conf = detectionConfidence(incident)
  const lines = []

  lines.push(`CASE ID: ${caseId}`)
  lines.push(`INCIDENT ID: ${incident.id}`)
  lines.push(`THREAT TYPE: ${incident.incident_type}`)
  lines.push(`RISK SCORE: ${fmt(incident.risk_score)} / 100`)
  lines.push(`THREAT LEVEL: ${fmt(incident.threat_level)}`)
  lines.push(`AI CONFIDENCE: ${conf != null ? conf + '%' : 'Not Available'}`)
  lines.push(`CURRENT STATUS: ${statusLabel(meta?.status || 'open')}`)
  lines.push(`ASSIGNED OFFICER: ${meta?.assignedOfficer || 'Unassigned'}`)
  lines.push(`DETECTION TIME: ${new Date(incident.created_at).toLocaleString()}`)
  lines.push(`REPORTED CONTENT: ${incident.raw_content}`)

  lines.push('')
  lines.push(`GEMINI SUMMARY: ${incident.ai_explanation ? incident.ai_explanation : 'Not Available'}`)

  const heur = inv.heuristics_triggered || []
  lines.push('')
  if (heur.length) {
    lines.push('TRIGGERED HEURISTICS:')
    heur.forEach((h) => lines.push(`- ${h.reason} (+${h.points})`))
  } else {
    lines.push('TRIGGERED HEURISTICS: None recorded')
  }

  lines.push('')
  if (investigation) {
    const w = investigation.whois || {}
    const d = investigation.dns || {}
    const s = investigation.ssl || {}
    const g = investigation.geolocation || null
    lines.push('WHOIS:')
    lines.push(`  Registrar: ${fmt(w.registrar)}`)
    lines.push(`  Domain age (days): ${fmt(w.domain_age_days)}`)
    lines.push(`  Creation date: ${fmt(w.creation_date)}`)
    lines.push(`  Expiration: ${fmt(w.expiration_date)}`)
    lines.push('DNS:')
    lines.push(`  A records: ${d.a_records?.join(', ') || 'None'}`)
    lines.push(`  MX records: ${d.mx_records?.join(', ') || 'None'}`)
    lines.push(`  Name servers: ${d.nameservers?.join(', ') || 'None'}`)
    lines.push('SSL:')
    lines.push(`  Issuer: ${fmt(s.issuer)}`)
    lines.push(`  Valid until: ${fmt(s.valid_until)} (expired: ${s.is_expired ?? 'Not Available'})`)
    lines.push('GEOIP:')
    lines.push(`  IP: ${d.a_records?.[0] || 'Not Available'}`)
    lines.push(`  Country: ${fmt(g?.country)}`)
    lines.push(`  City: ${fmt(g?.city)}`)
    lines.push(`  ISP: Not Available`)
    if (investigation.red_flags?.length) lines.push(`RED FLAGS: ${investigation.red_flags.join('; ')}`)
  } else {
    lines.push('WHOIS: Not collected for this investigation')
    lines.push('DNS: Not collected for this investigation')
    lines.push('SSL: Not collected for this investigation')
    lines.push('GEOIP: Not collected for this investigation')
  }

  lines.push('')
  lines.push('LINKED ENTITIES (extracted from case content):')
  const anyEntities = entities && Object.values(entities).some((v) => v.length)
  if (anyEntities) {
    for (const [type, vals] of Object.entries(entities)) {
      if (vals.length) lines.push(`  ${type}: ${vals.join(', ')}`)
    }
  } else {
    lines.push('  None extracted')
  }

  lines.push('')
  if ((related || []).length) {
    lines.push('RELATED CASES (from Threat Intelligence Graph):')
    related.forEach((rc) => {
      const shared = Object.entries(rc.shared || {})
        .filter(([, v]) => v.length)
        .map(([t, v]) => `${t}: ${v.join(', ')}`)
        .join('; ')
      lines.push(`- ${rc.caseId} (${rc.similarity}% match)${shared ? ` — shared ${shared}` : ''}`)
    })
  } else {
    lines.push('RELATED CASES: None found in the threat graph')
  }

  lines.push('')
  lines.push(`OFFICER NOTES: ${meta?.notes ? meta.notes : 'None recorded'}`)

  const tl = meta?.timeline || {}
  lines.push('')
  lines.push('TIMELINE:')
  lines.push(`  Complaint/Detection: ${new Date(incident.created_at).toLocaleString()}`)
  if (tl.intel) lines.push(`  Threat intelligence collected: ${new Date(tl.intel).toLocaleString()}`)
  if (tl.investigation) lines.push(`  Investigation started: ${new Date(tl.investigation).toLocaleString()}`)
  if (tl.report) lines.push(`  Report generated: ${new Date(tl.report).toLocaleString()}`)
  if (tl.closed) lines.push(`  Case closed: ${new Date(tl.closed).toLocaleString()}`)

  return lines.join('\n')
}

/** One-click investigation prompts (Section 4). */
export const QUICK_ACTIONS = [
  { id: 'summary', label: 'Summarize Investigation', prompt: 'Summarize this investigation.' },
  { id: 'risk', label: 'Explain Risk Score', prompt: 'Explain how the risk score for this case was determined.' },
  { id: 'whois', label: 'Explain WHOIS', prompt: 'What does the WHOIS record indicate about this domain?' },
  { id: 'dns', label: 'Explain DNS', prompt: 'What do the DNS records tell us about this case?' },
  { id: 'ssl', label: 'Explain SSL Certificate', prompt: 'Explain the SSL certificate findings for this case.' },
  { id: 'graph', label: 'Summarize Threat Graph', prompt: 'Summarize what the threat graph reveals about this case.' },
  { id: 'related', label: 'Find Related Cases', prompt: 'Which cases are related to this investigation and why?' },
  { id: 'notes', label: 'Generate Officer Notes', prompt: 'Draft concise officer investigation notes for this case.' },
  { id: 'timeline', label: 'Generate Investigation Timeline', prompt: 'Lay out the investigation timeline for this case.' },
  { id: 'report', label: 'Generate Final Report', prompt: 'Generate a final investigation report for this case.' },
  { id: 'next', label: 'Suggest Next Actions', prompt: 'What are the recommended next actions for this investigation?' },
]

/** Follow-up suggestions adapted to which sources are available (Section 9). */
export function suggestionsFor(sources) {
  const s = []
  if (sources.whois) s.push({ label: 'Explain WHOIS', prompt: 'What does the WHOIS record indicate?' })
  if (sources.dns) s.push({ label: 'Explain DNS', prompt: 'What do the DNS records indicate?' })
  if (sources.related) s.push({ label: 'Show Related Cases', prompt: 'Which cases are related and why?' })
  if (sources.graph) s.push({ label: 'Analyze Threat Graph', prompt: 'Analyze the threat graph for this case.' })
  s.push({ label: 'Generate Report', prompt: 'Generate a final investigation report for this case.' })
  s.push({ label: 'Recommend Next Actions', prompt: 'What are the recommended next actions?' })
  return s.slice(0, 6)
}
