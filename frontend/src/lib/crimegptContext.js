/**
 * CrimeGPT context assembly — the single source of truth that feeds legal
 * recommendations, case-law lookups, every generated document and the legal
 * assistant.
 *
 * It reuses the existing investigation context (buildContextString from
 * copilotContext.js — risk, WHOIS/DNS/SSL/GeoIP, related cases, timeline,
 * officer notes) and layers the CrimeGPT case record on top (narrative,
 * reviewed entities, accepted legal sections). Because every consumer reads
 * this one function, editing the narrative or an entity automatically changes
 * what the next document/assistant call sees — no duplicate data entry.
 */
import { buildContextString } from './copilotContext'
import { EMPTY_ENTITIES } from './crimegptStore'

const ENTITY_LABELS = {
  victims: 'Victims',
  suspects: 'Suspects',
  urls: 'URLs',
  domains: 'Domains',
  emails: 'Emails',
  phone_numbers: 'Phone numbers',
  ip_addresses: 'IP addresses',
  wallet_addresses: 'Wallet addresses',
  bank_accounts: 'Bank accounts',
  organizations: 'Organizations',
  dates: 'Dates',
  locations: 'Locations',
  financial_amounts: 'Financial amounts',
}

/**
 * Merge regex-extracted workspace entities (Domain/Email/Phone/Wallet) into
 * the CrimeGPT category shape, so the entity workbench starts pre-populated
 * from the same source the workspace uses.
 */
export function seedEntitiesFromWorkspace(workspaceEntities) {
  const e = { ...EMPTY_ENTITIES }
  if (!workspaceEntities) return e
  e.domains = [...(workspaceEntities.Domain || [])]
  e.emails = [...(workspaceEntities.Email || [])]
  e.phone_numbers = [...(workspaceEntities.Phone || [])]
  e.wallet_addresses = [...(workspaceEntities.Wallet || [])]
  return e
}

function entitiesBlock(entities) {
  if (!entities) return 'REVIEWED ENTITIES: None recorded yet'
  const lines = ['REVIEWED ENTITIES (officer-confirmed):']
  let any = false
  for (const [key, label] of Object.entries(ENTITY_LABELS)) {
    const vals = entities[key] || []
    if (vals.length) {
      any = true
      lines.push(`  ${label}: ${vals.join(', ')}`)
    }
  }
  if (!any) lines.push('  None recorded yet')
  return lines.join('\n')
}

function legalBlock(sections) {
  if (!sections?.length) return 'ACCEPTED LEGAL SECTIONS: None accepted yet'
  const lines = ['ACCEPTED LEGAL SECTIONS (officer-confirmed):']
  sections.forEach((s) => {
    lines.push(`  ${s.act} ${s.section} — ${s.title}${s.reason ? ` (${s.reason})` : ''}`)
  })
  return lines.join('\n')
}

/**
 * Builds the full CrimeGPT context string.
 *
 * @param {object} p
 * @param {object} p.incident   full incident detail
 * @param {string} p.caseId
 * @param {object} p.meta       caseWorkflow meta (status/officer/notes/timeline)
 * @param {object} p.entities   workspace-extracted entities (graph labels)
 * @param {array}  p.related    related cases
 * @param {object} p.crimeCase  CrimeGPT store record (narrative, entities, legalSections)
 */
export function buildCrimeContext({ incident, caseId, meta, entities, related, crimeCase }) {
  const base = buildContextString({ incident, caseId, meta, entities, related })
  const parts = [base, '']

  parts.push('INVESTIGATION NARRATIVE (officer-authored):')
  parts.push(crimeCase?.narrative?.trim() ? crimeCase.narrative.trim() : 'None written yet')
  parts.push('')
  parts.push(entitiesBlock(crimeCase?.entities))
  parts.push('')
  parts.push(legalBlock(crimeCase?.legalSections))

  return parts.join('\n')
}

export { ENTITY_LABELS }
