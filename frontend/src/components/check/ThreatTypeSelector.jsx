import { Link2, Mail, MessageSquare } from 'lucide-react'

export const THREAT_MODES = [
  { value: 'url', label: 'URL / Link', icon: Link2 },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'sms', label: 'SMS / Message', icon: MessageSquare },
]

/**
 * Three clearly selectable analysis modes. The active mode is made obvious
 * with the cyan accent, a filled surface and a bottom rule.
 */
export default function ThreatTypeSelector({ value, onChange, disabled }) {
  return (
    <div className="grid grid-cols-3 gap-2 rounded-lg border border-white/7 bg-[#111722]/82 backdrop-blur-md p-1.5">
      {THREAT_MODES.map(({ value: v, label, icon: Icon }) => {
        const active = value === v
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            disabled={disabled}
            aria-pressed={active}
            className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-[14.5px] font-medium transition disabled:opacity-50 ${
              active
                ? 'border border-cyan-400/35 bg-cyan-400/10 text-cyan-200'
                : 'border border-transparent text-zinc-400 hover:bg-white/4 hover:text-zinc-200'
            }`}
          >
            <Icon size={15} className={active ? 'text-cyan-300' : 'text-zinc-500'} />
            {label}
          </button>
        )
      })}
    </div>
  )
}
