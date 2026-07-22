import { Globe, Mail, Phone, Wallet, Send } from 'lucide-react'
import { ENTITY_META } from '../../lib/entities'

const ICONS = {
  Domain: Globe,
  Email: Mail,
  Phone: Phone,
  Wallet: Wallet,
  TelegramHandle: Send,
}

/**
 * Section 6 — Linked Entities extracted from the case content. Each entity
 * is a button that deep-links into the Threat Intelligence Graph filtered to
 * that entity (onOpenEntity(type, value)).
 */
export default function LinkedEntities({ entities, onOpenEntity }) {
  const groups = Object.keys(ENTITY_META).filter((type) => (entities?.[type] || []).length > 0)

  if (groups.length === 0) {
    return <p className="text-sm text-slate-500">No domains, emails, phone numbers, wallets or Telegram handles were extracted from this case.</p>
  }

  return (
    <div className="space-y-4">
      {groups.map((type) => {
        const Icon = ICONS[type]
        return (
          <div key={type}>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <Icon size={13} className="text-purple-400" />
              {ENTITY_META[type].label}
              <span className="text-slate-600">({entities[type].length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {entities[type].map((value) => (
                <button
                  key={value}
                  onClick={() => onOpenEntity(type, value)}
                  title={`Open ${value} in Threat Graph`}
                  className="max-w-full truncate rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 font-mono text-xs text-slate-200 transition hover:border-purple-500/50 hover:bg-slate-700"
                >
                  {type === 'TelegramHandle' ? `@${value}` : value}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
