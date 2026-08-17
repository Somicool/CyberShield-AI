import { RefreshCw } from 'lucide-react'

function clock(date) {
  if (!date) return '—'
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

/**
 * Compact command-center header: title, one-line purpose, live status,
 * last-updated clock and a manual refresh. Replaces the oversized old header.
 */
export default function CommandHeader({ lastUpdated, onRefresh, refreshing, live }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-[19px] font-semibold tracking-tight text-zinc-50">
          Cyber Crime Command Center
        </h1>
        <p className="mt-0.5 text-[12.5px] text-zinc-500">
          Real-time overview of cybercrime activity and investigation priorities
        </p>
      </div>

      <div className="flex items-center gap-4">
        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-zinc-500">
          <span className="relative flex h-1.5 w-1.5">
            {live && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
            )}
            <span
              className={`relative inline-flex h-1.5 w-1.5 rounded-full ${live ? 'bg-emerald-400' : 'bg-zinc-600'}`}
            />
          </span>
          {live ? 'Live' : 'Offline'}
        </span>

        <span className="hidden text-[11.5px] text-zinc-500 sm:inline">
          Updated <span className="tabular-nums text-zinc-400">{clock(lastUpdated)}</span>
        </span>

        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/8 bg-white/3 px-2.5 py-1.5 text-[12px] text-zinc-300 transition hover:bg-white/6 disabled:opacity-50"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>
    </header>
  )
}
