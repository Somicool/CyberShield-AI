const STYLES = {
  critical: 'bg-red-500/15 text-red-400 border-red-500/40',
  high: 'bg-orange-500/15 text-orange-400 border-orange-500/40',
  medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40',
  low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
}

export default function ThreatBadge({ level }) {
  const style = STYLES[level] || 'bg-slate-500/15 text-slate-400 border-slate-500/40'
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${style} uppercase tracking-wide`}>
      {level || 'unknown'}
    </span>
  )
}
