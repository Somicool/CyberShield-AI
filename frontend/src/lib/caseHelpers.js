/**
 * Pure helpers for the Cases workspace: case-number derivation, status and
 * priority metadata, confidence/recommendation derivation, and report
 * building. No React, no side effects (except the print-report window),
 * so these are trivially testable and reusable.
 */

// ---- Case status model (frontend workflow layer) -------------------------

export const CASE_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'evidence_pending', label: 'Evidence Pending' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

export const STATUS_STYLES = {
  open: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
  investigating: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
  evidence_pending: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  resolved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  closed: 'bg-slate-500/15 text-slate-400 border-slate-500/40',
}

export function statusLabel(value) {
  return CASE_STATUSES.find((s) => s.value === value)?.label || 'Open'
}

// ---- Threat / priority ---------------------------------------------------

export const THREAT_DOT = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-emerald-500',
  unknown: 'bg-slate-500',
}

const THREAT_RANK = { critical: 4, high: 3, medium: 2, low: 1, unknown: 0 }
export function threatRank(level) {
  return THREAT_RANK[level] ?? 0
}

// ---- Case ID -------------------------------------------------------------

/**
 * Deterministic, human-friendly case number derived from the incident's
 * creation year + a stable hash of its UUID, e.g. CASE-2026-0241.
 */
export function deriveCaseId(incident) {
  if (!incident) return 'CASE-------'
  const year = new Date(incident.created_at).getUTCFullYear() || new Date().getUTCFullYear()
  let hash = 0
  const id = String(incident.id)
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  const num = String(hash % 10000).padStart(4, '0')
  return `CASE-${year}-${num}`
}

// ---- Detection confidence ------------------------------------------------

/**
 * Detection confidence as a 0–100 integer. Prefers the ML probability
 * stored on the incident's investigation_data; falls back to the risk
 * score when probability isn't available.
 */
export function detectionConfidence(incident) {
  const inv = incident?.investigation_data || {}
  const prob = inv.ml_phishing_probability ?? inv.ml_scam_probability
  if (typeof prob === 'number') return Math.round(prob * 100)
  if (typeof incident?.risk_score === 'number') return Math.round(incident.risk_score)
  return null
}

// ---- Recommended actions (derived from severity) -------------------------

export function recommendedActions(threatLevel) {
  switch (threatLevel) {
    case 'critical':
      return ['Freeze Domain', 'Notify CERT-In', 'Escalate to Senior Officer']
    case 'high':
      return ['Notify CERT-In', 'Escalate to Cyber Crime Unit', 'Monitor Infrastructure']
    case 'medium':
      return ['Monitor Domain', 'Advise Complainant', 'Watchlist Entities']
    case 'low':
      return ['Log & Monitor']
    default:
      return ['Review Manually']
  }
}

export function recommendedPriority(threatLevel) {
  if (threatLevel === 'critical') return 'Critical'
  if (threatLevel === 'high') return 'High'
  if (threatLevel === 'medium') return 'Medium'
  return 'Low'
}

// ---- Domain extraction (for graph lookups) -------------------------------

export function domainForIncident(incident) {
  if (!incident) return null
  const raw = incident.raw_content || ''
  const candidate = raw.includes('://') ? raw : raw.match(/https?:\/\/\S+/i)?.[0] || (incident.incident_type === 'url' ? `http://${raw}` : null)
  if (!candidate) return null
  try {
    return new URL(candidate).hostname.toLowerCase() || null
  } catch {
    return null
  }
}

// ---- AI report (compiled from real data, printed to PDF via browser) -----

function esc(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Opens a print-ready report window built entirely from real incident data
 * (detection result, Gemini explanation, investigation findings). The user
 * saves it as PDF via the browser's print dialog — no fake export backend.
 */
export function openCaseReport(incident, meta, caseId) {
  const inv = incident?.investigation_data || {}
  const investigation = inv.investigation || null
  const heuristics = inv.heuristics_triggered || []
  const conf = detectionConfidence(incident)

  const win = window.open('', '_blank', 'width=820,height=1000')
  if (!win) return

  const redFlags = investigation?.red_flags || []
  const html = `<!doctype html><html><head><meta charset="utf-8"/>
    <title>${esc(caseId)} — Investigation Report</title>
    <style>
      body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0d1420;margin:40px;line-height:1.5}
      h1{font-size:20px;margin:0 0 4px}
      h2{font-size:14px;margin:24px 0 8px;text-transform:uppercase;letter-spacing:.05em;color:#475569;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
      .meta{color:#64748b;font-size:12px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;font-size:13px;margin-top:8px}
      .k{color:#64748b}
      code{word-break:break-all}
      ul{margin:6px 0;padding-left:18px;font-size:13px}
      .foot{margin-top:32px;color:#94a3b8;font-size:11px;border-top:1px solid #e2e8f0;padding-top:8px}
    </style></head><body>
    <h1>CyberAid — Investigation Report</h1>
    <div class="meta">${esc(caseId)} · Generated ${new Date().toLocaleString()}</div>

    <h2>Case Overview</h2>
    <div class="grid">
      <div><span class="k">Threat Type:</span> ${esc(incident.incident_type)}</div>
      <div><span class="k">Threat Level:</span> ${esc(incident.threat_level)}</div>
      <div><span class="k">Risk Score:</span> ${esc(incident.risk_score?.toFixed?.(1) ?? incident.risk_score)}/100</div>
      <div><span class="k">Detection Confidence:</span> ${conf != null ? conf + '%' : 'N/A'}</div>
      <div><span class="k">Status:</span> ${esc(statusLabel(meta?.status || 'open'))}</div>
      <div><span class="k">Assigned Officer:</span> ${esc(meta?.assignedOfficer || 'Unassigned')}</div>
      <div><span class="k">Detected:</span> ${new Date(incident.created_at).toLocaleString()}</div>
    </div>

    <h2>Reported Content</h2>
    <p><code>${esc(incident.raw_content)}</code></p>

    <h2>AI Assessment</h2>
    <p>${esc(incident.ai_explanation || 'No AI explanation available.')}</p>

    ${heuristics.length ? `<h2>Warning Signs</h2><ul>${heuristics.map((h) => `<li>${esc(h.reason)}</li>`).join('')}</ul>` : ''}

    ${investigation ? `<h2>Domain Investigation</h2>
      <div class="grid">
        <div><span class="k">Registrar:</span> ${esc(investigation.whois?.registrar || 'Unknown')}</div>
        <div><span class="k">Domain age (days):</span> ${esc(investigation.whois?.domain_age_days ?? 'Unknown')}</div>
        <div><span class="k">SSL issuer:</span> ${esc(investigation.ssl?.issuer || 'N/A')}</div>
        <div><span class="k">Hosting country:</span> ${esc(investigation.geolocation?.country || 'Unknown')}</div>
      </div>
      ${redFlags.length ? `<ul>${redFlags.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}` : ''}

    <h2>Recommended Actions</h2>
    <ul>${recommendedActions(incident.threat_level).map((a) => `<li>${esc(a)}</li>`).join('')}</ul>

    <div class="foot">This report was compiled automatically by CyberAid from recorded detection and
    investigation data. Verify findings before operational or legal action.</div>
    <script>window.onload=function(){setTimeout(function(){window.print()},250)}</script>
    </body></html>`

  win.document.write(html)
  win.document.close()
}

/**
 * Opens a single print-ready summary covering several selected cases — used
 * by the bulk "Export Reports" action. Built from the list data already in
 * memory (no extra fetches), printable to PDF via the browser.
 */
export function openBatchReport(cases) {
  const win = window.open('', '_blank', 'width=900,height=1000')
  if (!win) return
  const rows = cases
    .map(({ incident, meta }) => {
      return `<tr>
        <td>${esc(deriveCaseId(incident))}</td>
        <td>${esc(incident.incident_type)}</td>
        <td>${esc(incident.risk_score?.toFixed?.(0) ?? incident.risk_score)}</td>
        <td>${esc(incident.threat_level)}</td>
        <td>${esc(statusLabel(meta?.status || 'open'))}</td>
        <td>${esc(meta?.assignedOfficer || 'Unassigned')}</td>
        <td>${new Date(incident.created_at).toLocaleString()}</td>
      </tr>`
    })
    .join('')

  const html = `<!doctype html><html><head><meta charset="utf-8"/>
    <title>Cyber Crime — Case Export (${cases.length})</title>
    <style>
      body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0d1420;margin:40px}
      h1{font-size:18px;margin:0 0 4px}
      .meta{color:#64748b;font-size:12px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left}
      th{background:#f1f5f9;text-transform:uppercase;font-size:10px;letter-spacing:.05em;color:#475569}
    </style></head><body>
    <h1>CyberAid — Case Export</h1>
    <div class="meta">${cases.length} cases · Generated ${new Date().toLocaleString()}</div>
    <table>
      <thead><tr><th>Case ID</th><th>Type</th><th>Risk</th><th>Level</th><th>Status</th><th>Officer</th><th>Created</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <script>window.onload=function(){setTimeout(function(){window.print()},250)}</script>
    </body></html>`
  win.document.write(html)
  win.document.close()
}

/**
 * Section 11 — full printable Investigation Report. Compiles the AI briefing,
 * summary, scores, WHOIS/DNS/SSL, heuristics, linked entities, officer notes
 * and timeline into one print-ready document (browser Save-as-PDF). Built
 * entirely from recorded data — nothing is fabricated.
 */
export function openInvestigationReport(incident, meta, caseId, { briefing, entities, related } = {}) {
  const win = window.open('', '_blank', 'width=880,height=1000')
  if (!win) return

  const inv = incident?.investigation_data || {}
  const investigation = inv.investigation || null
  const heuristics = inv.heuristics_triggered || []
  const conf = detectionConfidence(incident)

  const timelineSteps = [
    ['Complaint Submitted', incident.created_at],
    ['AI Detection Completed', incident.created_at],
    ['Threat Intelligence Collected', investigation ? meta?.timeline?.intel || null : null],
    ['Officer Investigation Started', meta?.timeline?.investigation || null],
    ['Report Generated', new Date().toISOString()],
    ['Case Closed', meta?.timeline?.closed || null],
  ]

  const entitySection = entities
    ? Object.entries(entities)
        .filter(([, vals]) => vals.length)
        .map(([type, vals]) => `<div><span class="k">${esc(type)}:</span> ${esc(vals.join(', '))}</div>`)
        .join('')
    : ''

  const briefingHtml = briefing?.narrative?.map((p) => `<p>${esc(p)}</p>`).join('') || ''

  const relatedHtml = (related || [])
    .map((rc) => {
      const shared = Object.entries(rc.shared || {})
        .filter(([, vals]) => vals.length)
        .map(([type, vals]) => `${esc(type)}: ${esc(vals.join(', '))}`)
        .join(' · ')
      return `<li>${esc(rc.caseId)} — ${esc(rc.similarity)}% match${shared ? ` (shared ${shared})` : ''}</li>`
    })
    .join('')

  const html = `<!doctype html><html><head><meta charset="utf-8"/>
    <title>${esc(caseId)} — Investigation Report</title>
    <style>
      body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0d1420;margin:40px;line-height:1.5}
      h1{font-size:20px;margin:0 0 4px}
      h2{font-size:13px;margin:22px 0 6px;text-transform:uppercase;letter-spacing:.05em;color:#475569;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
      .meta{color:#64748b;font-size:12px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;font-size:13px;margin-top:6px}
      .k{color:#64748b}
      ul{margin:6px 0;padding-left:18px;font-size:13px}
      ol{font-size:13px}
      code{word-break:break-all}
      p{font-size:13px;margin:6px 0}
      .foot{margin-top:28px;color:#94a3b8;font-size:11px;border-top:1px solid #e2e8f0;padding-top:8px}
    </style></head><body>
    <h1>CyberAid — Investigation Report</h1>
    <div class="meta">${esc(caseId)} · Generated ${new Date().toLocaleString()}</div>

    <h2>Case Overview</h2>
    <div class="grid">
      <div><span class="k">Threat Type:</span> ${esc(incident.incident_type)}</div>
      <div><span class="k">Threat Level:</span> ${esc(incident.threat_level)}</div>
      <div><span class="k">Risk Score:</span> ${esc(incident.risk_score?.toFixed?.(1) ?? incident.risk_score)}/100</div>
      <div><span class="k">Detection Confidence:</span> ${conf != null ? conf + '%' : 'N/A'}</div>
      <div><span class="k">Status:</span> ${esc(statusLabel(meta?.status || 'open'))}</div>
      <div><span class="k">Assigned Officer:</span> ${esc(meta?.assignedOfficer || 'Unassigned')}</div>
      <div><span class="k">Detected:</span> ${new Date(incident.created_at).toLocaleString()}</div>
    </div>

    <h2>Reported Content</h2>
    <p><code>${esc(incident.raw_content)}</code></p>

    ${briefingHtml ? `<h2>AI Investigation Briefing</h2>${briefingHtml}
      ${briefing?.actions?.length ? `<p><strong>Recommended priority:</strong> ${esc(briefing.priority)}</p><ul>${briefing.actions.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}` : ''}

    <h2>AI Summary</h2>
    <p>${esc(incident.ai_explanation || 'No AI explanation available.')}</p>

    ${heuristics.length ? `<h2>Triggered Heuristics</h2><ul>${heuristics.map((h) => `<li>${esc(h.reason)} (+${esc(h.points)})</li>`).join('')}</ul>` : ''}

    ${investigation ? `<h2>Threat Intelligence</h2>
      <div class="grid">
        <div><span class="k">Registrar:</span> ${esc(investigation.whois?.registrar || 'Not Available')}</div>
        <div><span class="k">Domain age (days):</span> ${esc(investigation.whois?.domain_age_days ?? 'Not Available')}</div>
        <div><span class="k">Creation date:</span> ${esc(investigation.whois?.creation_date || 'Not Available')}</div>
        <div><span class="k">Expiration:</span> ${esc(investigation.whois?.expiration_date || 'Not Available')}</div>
        <div><span class="k">A records:</span> ${esc(investigation.dns?.a_records?.join(', ') || 'None')}</div>
        <div><span class="k">MX records:</span> ${esc(investigation.dns?.mx_records?.join(', ') || 'None')}</div>
        <div><span class="k">Name servers:</span> ${esc(investigation.dns?.nameservers?.join(', ') || 'None')}</div>
        <div><span class="k">SSL issuer:</span> ${esc(investigation.ssl?.issuer || 'Not Available')}</div>
        <div><span class="k">Hosting IP:</span> ${esc(investigation.dns?.a_records?.[0] || 'Not Available')}</div>
        <div><span class="k">Hosting country:</span> ${esc(investigation.geolocation?.country || 'Not Available')}</div>
        <div><span class="k">Hosting city:</span> ${esc(investigation.geolocation?.city || 'Not Available')}</div>
        <div><span class="k">ISP:</span> Not Available</div>
      </div>
      ${investigation.red_flags?.length ? `<ul>${investigation.red_flags.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}` : ''}

    ${entitySection ? `<h2>Linked Entities</h2><div class="grid">${entitySection}</div>` : ''}

    ${relatedHtml ? `<h2>Related Cases</h2><ul>${relatedHtml}</ul>` : ''}

    <h2>Investigation Timeline</h2>
    <ol>${timelineSteps.map(([label, at]) => `<li>${esc(label)} — ${at ? new Date(at).toLocaleString() : 'Pending'}</li>`).join('')}</ol>

    ${meta?.notes ? `<h2>Officer Notes</h2><p>${esc(meta.notes)}</p>` : ''}

    <div class="foot">Compiled automatically by CyberAid from recorded detection, investigation and
    threat-graph data. This report contains no fabricated evidence; verify all findings before operational
    or legal action.</div>
    <script>window.onload=function(){setTimeout(function(){window.print()},250)}</script>
    </body></html>`

  win.document.write(html)
  win.document.close()
}
