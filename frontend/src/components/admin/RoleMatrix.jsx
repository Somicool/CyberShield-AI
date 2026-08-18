import { Check } from 'lucide-react'

/**
 * Section 4 — Role Management. Permissions reflect what each role can actually
 * access in CyberAid today, shown read-only (permissions are enforced in
 * code/route guards, not configurable at runtime).
 */
const ROLES = [
  {
    name: 'Citizen',
    color: 'text-sky-300',
    permissions: ['Submit URLs / messages for checking', 'View own detection results'],
  },
  {
    name: 'Police Officer',
    color: 'text-purple-300',
    permissions: [
      'View Dashboard & Cases',
      'Investigation Workspace',
      'Threat Intelligence Graph',
      'AI Investigation Copilot',
      'Analytics & Heatmap',
    ],
  },
  {
    name: 'Administrator',
    color: 'text-amber-300',
    permissions: ['Full platform access', 'User & role management', 'System health & configuration'],
  },
]

export default function RoleMatrix() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {ROLES.map((r) => (
        <div key={r.name} className="rounded-xl border border-slate-800 bg-slate-900/72 p-4">
          <h4 className={`text-sm font-semibold ${r.color}`}>{r.name}</h4>
          <ul className="mt-3 space-y-1.5">
            {r.permissions.map((p) => (
              <li key={p} className="flex items-start gap-2 text-xs text-slate-300">
                <Check size={13} className="mt-0.5 shrink-0 text-emerald-400" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="text-[12.5px] text-slate-600 md:col-span-3">Permissions are enforced in code and shown read-only. Configurable permissions are a Planned Module.</p>
    </div>
  )
}
