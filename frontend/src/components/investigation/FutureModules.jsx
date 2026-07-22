import { Archive, ShieldCheck, Landmark, Database } from 'lucide-react'

const MODULES = [
  { icon: Archive, name: 'Evidence Vault', desc: 'Secure storage of case evidence with integrity hashing.' },
  { icon: ShieldCheck, name: 'Chain of Custody', desc: 'Tamper-evident audit trail of every evidence handoff.' },
  { icon: Landmark, name: 'CERT-In Integration', desc: 'Direct incident escalation to the national CERT.' },
  { icon: Database, name: 'CCTNS Integration', desc: 'Sync with the Crime & Criminal Tracking Network.' },
]

/**
 * Section 12 — Future Modules. Honest "Planned Module" placeholders; no
 * backend functionality is implied or faked.
 */
export default function FutureModules() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {MODULES.map((m) => (
        <div
          key={m.name}
          className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-4 opacity-80"
        >
          <div className="flex items-center gap-2">
            <m.icon size={16} className="text-slate-500" />
            <span className="text-sm font-medium text-slate-300">{m.name}</span>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">{m.desc}</p>
          <span className="mt-3 inline-block rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
            Planned Module
          </span>
        </div>
      ))}
    </div>
  )
}
