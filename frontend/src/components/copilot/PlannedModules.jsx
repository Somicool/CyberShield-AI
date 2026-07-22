import { Mic, Languages, Scale, Rss, Landmark, Database } from 'lucide-react'

const MODULES = [
  { icon: Mic, name: 'Voice Interaction' },
  { icon: Languages, name: 'Multilingual Assistant' },
  { icon: Scale, name: 'Legal Recommendation Engine' },
  { icon: Rss, name: 'Live Threat Feed' },
  { icon: Landmark, name: 'CERT-In Integration' },
  { icon: Database, name: 'CCTNS Integration' },
]

/**
 * Section 12 — Future Modules for the Copilot. Honest "Planned Module"
 * placeholders only.
 */
export default function PlannedModules() {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {MODULES.map((m) => (
        <div key={m.name} className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-3 opacity-80">
          <div className="flex items-center gap-2">
            <m.icon size={15} className="text-slate-500" />
            <span className="text-xs font-medium text-slate-300">{m.name}</span>
          </div>
          <span className="mt-2 inline-block rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
            Planned Module
          </span>
        </div>
      ))}
    </div>
  )
}
