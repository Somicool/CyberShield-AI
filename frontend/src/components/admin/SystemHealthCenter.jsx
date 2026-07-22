import { Activity, RefreshCw } from 'lucide-react'
import { Skeleton } from '../cases/Skeleton'

const DOT = {
  healthy: 'bg-emerald-500',
  unavailable: 'bg-red-500',
  unknown: 'bg-slate-500',
}
const TEXT = {
  healthy: 'text-emerald-400',
  unavailable: 'text-red-400',
  unknown: 'text-slate-400',
}

/**
 * Flagship — System Health Center. Runs real on-demand checks against the
 * services CyberShield actually uses (results come from GET /api/admin/health).
 * Continuous/live monitoring is not implemented and is labelled as planned.
 */
export default function SystemHealthCenter({ health, loading, onRefresh }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-purple-400" />
          <h3 className="text-sm font-semibold text-slate-200">System Health Center</h3>
          {health?.checked_at && (
            <span className="text-xs text-slate-500">· checked {new Date(health.checked_at).toLocaleTimeString()}</span>
          )}
        </div>
        <button onClick={onRefresh} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800">
          <RefreshCw size={13} /> Re-check
        </button>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(health?.services || []).map((s) => (
            <div key={s.name} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <span className={`h-2.5 w-2.5 rounded-full ${DOT[s.status] || DOT.unknown}`} />
                  {s.name}
                </span>
                <span className={`text-xs font-semibold uppercase ${TEXT[s.status] || TEXT.unknown}`}>{s.status}</span>
              </div>
              <div className="mt-2 text-xs text-slate-400">Current state: {s.state}</div>
              <div className="mt-0.5 text-[11px] text-slate-600">
                Last check: {s.last_check ? new Date(s.last_check).toLocaleTimeString() : '—'}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-2 text-[11px] text-slate-600">
        Checks run on load and on demand. Continuous live monitoring & alerting is a <span className="text-slate-400">Planned Module</span>.
      </p>
    </div>
  )
}
