import { CheckCircle2, Archive, FileText, X } from 'lucide-react'
import AssignOfficerMenu from './AssignOfficerMenu'

/**
 * Appears when one or more cases are selected. Bulk actions operate on the
 * selected set and delegate to the workflow store / report helpers.
 */
export default function BulkActionBar({ count, onAssign, onResolve, onExport, onArchive, onClear }) {
  if (count === 0) return null

  const btn =
    'inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700'

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-purple-700/40 bg-purple-950/20 px-4 py-3">
      <span className="text-sm font-medium text-purple-200">{count} selected</span>
      <div className="mx-1 h-4 w-px bg-slate-700" />

      <AssignOfficerMenu
        align="left"
        onAssign={onAssign}
        trigger={<span className={btn}>Assign Officer</span>}
      />
      <button className={btn} onClick={onResolve}>
        <CheckCircle2 size={14} /> Mark Resolved
      </button>
      <button className={btn} onClick={onExport}>
        <FileText size={14} /> Export Reports
      </button>
      <button className={btn} onClick={onArchive}>
        <Archive size={14} /> Archive
      </button>

      <button
        className="ml-auto inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
        onClick={onClear}
      >
        <X size={14} /> Clear
      </button>
    </div>
  )
}
