/**
 * Citizen-facing helpers that translate the technical detection result into
 * simple, non-technical language and advice. The underlying numbers come
 * straight from the existing detection backend — nothing is fabricated; this
 * only relabels severity and offers plain-language guidance.
 */

/** Map the backend threat level to a simple citizen verdict. */
export function verdictFor(threatLevel) {
  switch (threatLevel) {
    case 'critical':
    case 'high':
      return {
        key: 'high',
        label: 'High Risk',
        tone: 'text-red-300 border-red-500/50 bg-red-500/10',
        dot: 'bg-red-500',
        headline: 'This looks dangerous',
      }
    case 'medium':
      return {
        key: 'suspicious',
        label: 'Suspicious',
        tone: 'text-amber-300 border-amber-500/50 bg-amber-500/10',
        dot: 'bg-amber-500',
        headline: 'Be careful with this',
      }
    case 'low':
      return {
        key: 'safe',
        label: 'Looks Safe',
        tone: 'text-emerald-300 border-emerald-500/50 bg-emerald-500/10',
        dot: 'bg-emerald-500',
        headline: 'No strong danger signs found',
      }
    default:
      return {
        key: 'unknown',
        label: 'Unknown',
        tone: 'text-slate-300 border-slate-500/50 bg-slate-500/10',
        dot: 'bg-slate-500',
        headline: 'We could not fully assess this',
      }
  }
}

/**
 * A "how sure are we" confidence for the verdict, derived from how decisive the
 * risk score is (a score near the extremes is a more confident call than one
 * near the middle). Returned as a 0-100 integer.
 */
export function confidenceFor(riskScore) {
  if (typeof riskScore !== 'number') return null
  return Math.round(Math.min(99, 55 + Math.abs(riskScore - 50) * 0.9))
}

/** Plain-language recommended actions for citizens. */
export function adviceFor(threatLevel) {
  switch (threatLevel) {
    case 'critical':
    case 'high':
      return [
        'Do not click any links or open attachments.',
        'Never enter your password, OTP, card or bank details.',
        'Report this to CyberAid so officers can act on it.',
        'If you already shared money or details, contact your bank immediately and call the cybercrime helpline 1930.',
      ]
    case 'medium':
      return [
        'Avoid clicking unless you are completely sure it is genuine.',
        'Verify the sender through an official website or phone number you already trust.',
        'Do not share personal or financial information.',
        'When in doubt, report it to CyberAid.',
      ]
    case 'low':
      return [
        'No strong danger signs were found, but always stay cautious.',
        'Never share OTP or passwords, even on sites that look genuine.',
        'If anything feels off, report it to CyberAid.',
      ]
    default:
      return [
        'Treat it as suspicious until you can verify it.',
        'Do not share personal or financial information.',
        'Report it to CyberAid if you are unsure.',
      ]
  }
}
