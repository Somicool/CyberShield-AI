/**
 * Product wordmark: Cyber**Ai**d.
 *
 * The "Ai" inside "Aid" is tinted with the accent so the name carries its own
 * meaning — aid for investigators, delivered by AI. Rendered as one accessible
 * string (`aria-label`) so screen readers never read it as three fragments.
 */
export default function Brand({ className = '', accentClass = 'text-cyan-300' }) {
  return (
    <span className={className} aria-label="CyberAid">
      Cyber<span className={accentClass}>Ai</span>d
    </span>
  )
}
