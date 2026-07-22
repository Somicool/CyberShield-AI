/**
 * Composes a read-only investigation briefing for officers by combining the
 * Gemini explanation (generated at detection) with the structured backend
 * investigation results (WHOIS/DNS/SSL) and Neo4j graph correlations.
 *
 * This is NOT a chatbot and makes no new model calls — it stitches together
 * facts that already exist into natural-language paragraphs an officer can
 * read at a glance.
 */

import { recommendedActions, recommendedPriority } from './caseHelpers'

const SUSPICIOUS_TLDS = ['tk', 'xyz', 'top', 'gq', 'ml', 'cf', 'ga', 'work', 'click', 'link']

function tldOf(domain) {
  if (!domain) return null
  const parts = domain.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : null
}

/**
 * @param {object} incident  full incident detail (with investigation_data + ai_explanation)
 * @param {object} graph     { entities, related, linkedEntities }
 * @returns {{ narrative: string[], priority: string, actions: string[] }}
 */
export function buildBriefing(incident, graph = {}) {
  const narrative = []
  const inv = incident?.investigation_data || {}
  const investigation = inv.investigation || null
  const entities = graph.entities || {}
  const related = graph.related || []

  // 1. Lead with the Gemini assessment.
  if (incident?.ai_explanation) {
    narrative.push(incident.ai_explanation)
  }

  // 2. Domain age + TLD signal (from WHOIS).
  const domain = entities.Domain?.[0]
  const ageDays = investigation?.whois?.domain_age_days
  const tld = tldOf(domain)
  if (typeof ageDays === 'number' && ageDays >= 0) {
    if (ageDays <= 60) {
      narrative.push(
        `The domain was registered only ${ageDays} day${ageDays === 1 ? '' : 's'} ago${
          tld && SUSPICIOUS_TLDS.includes(tld) ? ` and uses a high-risk .${tld} top-level domain` : ''
        } — newly registered domains are a common hallmark of short-lived phishing infrastructure.`
      )
    }
  } else if (tld && SUSPICIOUS_TLDS.includes(tld)) {
    narrative.push(`The domain uses a high-risk .${tld} top-level domain frequently abused in scam campaigns.`)
  }

  // 3. Wallet / Telegram entity signals + graph reuse.
  const wallets = entities.Wallet || []
  const telegram = entities.TelegramHandle || []
  if (wallets.length) {
    const walletShares = related.filter((r) => (r.shared?.Wallet || []).length).length
    narrative.push(
      walletShares > 0
        ? `An embedded crypto wallet address has also appeared in ${walletShares} related complaint${walletShares === 1 ? '' : 's'}, indicating reused cash-out infrastructure.`
        : `An embedded crypto wallet address was extracted and added to the intelligence graph for monitoring.`
    )
  }
  if (telegram.length) {
    narrative.push(`A Telegram handle (@${telegram[0]}) linked to this complaint is being tracked for connections to other incidents.`)
  }

  // 4. Coordinated-campaign signal from related cases.
  if (related.length >= 2) {
    narrative.push(
      `This case shares infrastructure with ${related.length} other complaints, which points to an organised campaign rather than an isolated attack.`
    )
  }

  // 5. Investigation red flags.
  const redFlags = investigation?.red_flags || []
  if (redFlags.length) {
    narrative.push(`Investigation surfaced additional red flags: ${redFlags.join('; ')}.`)
  }

  if (narrative.length === 0) {
    narrative.push('No AI assessment is available for this case yet. Run investigation to gather intelligence.')
  }

  const priority = recommendedPriority(incident?.threat_level)
  const actions = [...recommendedActions(incident?.threat_level)]
  if (wallets.length) actions.push('Monitor linked wallet')
  if (telegram.length) actions.push('Track Telegram handle')

  return { narrative, priority, actions: [...new Set(actions)] }
}
