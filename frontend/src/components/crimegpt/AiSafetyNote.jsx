import { ShieldAlert } from 'lucide-react'

/**
 * Persistent, low-key reminder that everything CrimeGPT produces — legal
 * sections, case law, drafted documents — is decision-support, not legal
 * advice. Deliberately quiet, but never hidden.
 */
export default function AiSafetyNote({ className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[12px] text-amber-200/70 ${className}`}
      title="Legal sections, case law and documents produced here are AI-generated suggestions. An officer must verify them before official use."
    >
      <ShieldAlert size={12} className="shrink-0" />
      AI decision-support — verify before official use.
    </span>
  )
}
