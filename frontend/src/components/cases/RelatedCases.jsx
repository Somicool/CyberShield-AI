import { Network } from 'lucide-react'
import { Skeleton } from './Skeleton'

const SHARED_LABELS = {
  Domain: 'Shared Domain',
  Wallet: 'Shared Wallet',
  Email: 'Shared Email',
  TelegramHandle: 'Shared Telegram',
  Phone: 'Shared Phone',
}

/**
 * Section 9 — Related Cases, discovered through the Neo4j Threat
 * Intelligence Graph. Each entry lists the entities shared with the current
 * case and a similarity score derived from how many entities overlap.
 * Clicking opens that investigation.
 */
export default function RelatedCases({ items = [], loading, error, onOpen }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/72 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Network size={15} className="text-sky-400" />
        <h4 className="text-sm font-semibold text-slate-200">Related Cases</h4>
        <span className="ml-auto text-[12.5px] text-slate-500">via Threat Graph</span>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : error ? (
        <p className="text-xs text-slate-500">Threat graph lookup unavailable right now.</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-slate-500">No linked investigations found for this case's entities.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((rc) => (
            <li key={rc.incidentId}>
              <button
                onClick={() => onOpen(rc.incidentId)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-left transition hover:border-slate-700 hover:bg-slate-800/70"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-purple-300">{rc.caseId}</span>
                  <span className="rounded bg-sky-500/15 px-2 py-0.5 text-[11.5px] font-semibold text-sky-300">
                    {rc.similarity}% match
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Object.entries(rc.shared).map(([type, values]) =>
                    values.length ? (
                      <span
                        key={type}
                        className="max-w-[180px] truncate rounded border border-slate-700 bg-slate-800/75 px-1.5 py-0.5 text-[11.5px] text-slate-300"
                        title={`${SHARED_LABELS[type] || type}: ${values.join(', ')}`}
                      >
                        {SHARED_LABELS[type] || type}: {values[0]}
                        {values.length > 1 ? ` +${values.length - 1}` : ''}
                      </span>
                    ) : null
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
