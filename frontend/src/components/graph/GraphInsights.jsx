import { Lightbulb } from 'lucide-react'

const SEV = {
  critical: 'border-l-red-500/70',
  high: 'border-l-orange-500/70',
  medium: 'border-l-yellow-500/70',
}

/**
 * Section 6 — Graph Insights. Natural-language observations derived strictly
 * from the loaded graph (entity reuse, clusters). Clicking focuses the node.
 */
export default function GraphInsights({ insights = [], onFocus }) {
  if (insights.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm text-slate-400">
        <Lightbulb size={16} className="text-slate-500" />
        No cross-case patterns in the current graph yet. Search or expand entities to surface intelligence.
      </div>
    )
  }
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {insights.map((ins) => (
        <button
          key={ins.id}
          onClick={() => onFocus?.(ins.focusId)}
          className={`rounded-lg border border-slate-800 border-l-2 ${SEV[ins.severity] || 'border-l-slate-600'} bg-slate-900/60 p-3 text-left text-sm text-slate-300 transition hover:bg-slate-900`}
        >
          {ins.text}
        </button>
      ))}
    </div>
  )
}
