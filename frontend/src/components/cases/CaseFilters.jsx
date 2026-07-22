import { Search, SlidersHorizontal, ArrowDownWideNarrow } from 'lucide-react'
import { CASE_STATUSES } from '../../lib/caseHelpers'

const THREAT_LEVELS = ['critical', 'high', 'medium', 'low']
const THREAT_TYPES = ['url', 'email', 'sms', 'qr']

const selectClass =
  'rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-purple-600 focus:outline-none'

/**
 * Header controls for the Cases workspace: text search, status / threat
 * level / threat type filters, and sort order. Pure controlled component —
 * all state lives in the page.
 */
export default function CaseFilters({ value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch })

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[220px] flex-1">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          aria-label="Search cases"
          placeholder="Search cases, content, case ID..."
          value={value.search}
          onChange={(e) => set({ search: e.target.value })}
          className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2 pl-9 pr-3 text-sm focus:border-purple-600 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <SlidersHorizontal size={15} className="text-slate-500" />
        <select aria-label="Filter by status" value={value.status} onChange={(e) => set({ status: e.target.value })} className={selectClass}>
          <option value="">All statuses</option>
          {CASE_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <select aria-label="Filter by threat level" value={value.threatLevel} onChange={(e) => set({ threatLevel: e.target.value })} className={selectClass}>
          <option value="">All levels</option>
          {THREAT_LEVELS.map((l) => (
            <option key={l} value={l}>
              {l[0].toUpperCase() + l.slice(1)}
            </option>
          ))}
        </select>

        <select aria-label="Filter by threat type" value={value.threatType} onChange={(e) => set({ threatType: e.target.value })} className={selectClass}>
          <option value="">All types</option>
          {THREAT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <ArrowDownWideNarrow size={15} className="text-slate-500" />
        <select aria-label="Sort cases" value={value.sort} onChange={(e) => set({ sort: e.target.value })} className={selectClass}>
          <option value="latest">Sort: Latest</option>
          <option value="risk">Sort: Highest Risk</option>
        </select>
      </div>
    </div>
  )
}
