import { UserSearch, Grid3x3, Rss, Globe2, ShieldQuestion, Ban } from 'lucide-react'

const MODULES = [
  { icon: UserSearch, name: 'Threat Actor Profiles' },
  { icon: Grid3x3, name: 'MITRE ATT&CK Mapping' },
  { icon: Rss, name: 'External Threat Feeds' },
  { icon: Globe2, name: 'Dark Web Intelligence' },
  { icon: ShieldQuestion, name: 'VirusTotal Integration' },
  { icon: Ban, name: 'AbuseIPDB Integration' },
]

/**
 * Section 13 — Future Modules. Honest "Planned Module" placeholders only; no
 * backend functionality is implied.
 */
export default function PlannedModules() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {MODULES.map((m) => (
        <div key={m.name} className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-4 opacity-80">
          <div className="flex items-center gap-2">
            <m.icon size={16} className="text-slate-500" />
            <span className="text-sm font-medium text-slate-300">{m.name}</span>
          </div>
          <span className="mt-3 inline-block rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
            Planned Module
          </span>
        </div>
      ))}
    </div>
  )
}
