import { Link } from 'react-router-dom'
import { FolderSearch, ScanSearch, FolderKanban, Share2, Bot } from 'lucide-react'

/**
 * Compact launcher row. Every destination is an existing page — no new
 * functionality, just faster access to it.
 */
export default function QuickActions({ topCaseId }) {
  const actions = [
    {
      label: 'New Investigation',
      icon: FolderSearch,
      // Jump straight into the highest-priority case when one exists.
      to: topCaseId ? `/dashboard/investigate/${topCaseId}` : '/dashboard/cases',
    },
    { label: 'Check Threat', icon: ScanSearch, to: '/dashboard/check' },
    { label: 'Open Cases', icon: FolderKanban, to: '/dashboard/cases' },
    { label: 'Threat Graph', icon: Share2, to: '/dashboard/graph' },
    { label: 'AI Copilot', icon: Bot, to: '/dashboard/copilot' },
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map(({ label, icon: Icon, to }) => (
        <Link
          key={label}
          to={to}
          className="inline-flex items-center gap-2 rounded-md border border-white/8 bg-white/2 px-3 py-2 text-[14px] text-zinc-300 transition hover:border-cyan-400/30 hover:bg-white/5 hover:text-zinc-100"
        >
          <Icon size={14} className="text-cyan-300/70" />
          {label}
        </Link>
      ))}
    </div>
  )
}
