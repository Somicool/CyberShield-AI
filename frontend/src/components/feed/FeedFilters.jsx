import { Search, X } from 'lucide-react'
import { TIME_WINDOWS } from '../../lib/timeWindows'

const THREAT_LEVELS = ['critical', 'high', 'medium', 'low']
const INCIDENT_TYPES = ['url', 'email', 'sms', 'qr']

const field =
  'h-9 rounded-md border border-white/10 bg-black/35 px-2.5 text-[13px] text-zinc-200 outline-none transition focus:border-cyan-400/40'

/**
 * One-line filter bar. Search / threat level / type are the existing
 * server-side filters; the time window narrows the fetched result set
 * client-side, since the incidents API exposes no date parameter.
 */
export default function FeedFilters({ value, onChange, resultNote }) {
  const set = (patch) => onChange({ ...value, ...patch })
  const dirty = value.search || value.threatLevel || value.incidentType || value.timeWindow

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-[#111722]/82 px-2.5 py-2 backdrop-blur-md">
      <div className="relative min-w-50 flex-1">
        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          aria-label="Search incidents"
          placeholder="Search content, domains, senders…"
          value={value.search}
          onChange={(e) => set({ search: e.target.value })}
          className={`${field} w-full pl-8`}
        />
      </div>

      <select
        aria-label="Threat level"
        value={value.threatLevel}
        onChange={(e) => set({ threatLevel: e.target.value })}
        className={field}
      >
        <option value="">All threat levels</option>
        {THREAT_LEVELS.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>

      <select
        aria-label="Incident type"
        value={value.incidentType}
        onChange={(e) => set({ incidentType: e.target.value })}
        className={field}
      >
        <option value="">All types</option>
        {INCIDENT_TYPES.map((t) => (
          <option key={t} value={t}>
            {t.toUpperCase()}
          </option>
        ))}
      </select>

      <select
        aria-label="Time window"
        value={value.timeWindow}
        onChange={(e) => set({ timeWindow: e.target.value })}
        className={field}
      >
        {TIME_WINDOWS.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      {resultNote && <span className="text-[12.5px] text-zinc-500">{resultNote}</span>}

      {dirty && (
        <button
          onClick={() => onChange({ search: '', threatLevel: '', incidentType: '', timeWindow: '' })}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-white/10 bg-black/35 px-2.5 text-[12.5px] text-zinc-400 transition hover:border-white/20 hover:text-zinc-200"
        >
          <X size={13} /> Clear
        </button>
      )}
    </div>
  )
}
