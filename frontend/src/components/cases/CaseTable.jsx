import { Search as Investigate, FileText, Share2, Download } from 'lucide-react'
import ThreatBadge from '../ThreatBadge'
import CaseStatusBadge from './CaseStatusBadge'
import AssignOfficerMenu from './AssignOfficerMenu'
import { SkeletonRows } from './Skeleton'
import { deriveCaseId, THREAT_DOT } from '../../lib/caseHelpers'

const TYPE_LABEL = { url: 'URL / Link', sms: 'SMS', email: 'Email', qr: 'QR Code' }

const RISK_TEXT = {
  critical: 'text-red-400',
  high: 'text-orange-400',
  medium: 'text-yellow-400',
  low: 'text-emerald-400',
}

function IconAction({ title, onClick, children }) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-white"
    >
      {children}
    </button>
  )
}

/**
 * Section 2 + 3 — the investigation table with per-row quick actions.
 * Sticky header, keyboard-selectable rows, and multi-select checkboxes for
 * bulk operations. Presentational only: all data + handlers come from props.
 */
export default function CaseTable({
  rows = [],
  loading,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  activeId,
  onSelectRow,
  actions,
}) {
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.incident.id))

  return (
    <div className="max-h-[70vh] overflow-auto rounded-xl border border-slate-800">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-3">
              <input
                type="checkbox"
                aria-label="Select all cases"
                checked={allSelected}
                onChange={onToggleSelectAll}
                className="h-4 w-4 accent-purple-600"
              />
            </th>
            <th className="px-4 py-3 font-medium">Case ID</th>
            <th className="px-4 py-3 font-medium">Threat Type</th>
            <th className="px-4 py-3 font-medium">Risk</th>
            <th className="px-4 py-3 font-medium">Level</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Officer</th>
            <th className="px-4 py-3 font-medium">Created</th>
            <th className="px-4 py-3 font-medium">Updated</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {loading ? (
            <SkeletonRows rows={7} cols={10} />
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-4 py-16 text-center">
                <p className="text-slate-400">No cases match the current filters.</p>
                <p className="mt-1 text-sm text-slate-600">Try clearing search or filters.</p>
              </td>
            </tr>
          ) : (
            rows.map(({ incident, meta }) => {
              const selected = selectedIds.has(incident.id)
              const isActive = activeId === incident.id
              return (
                <tr
                  key={incident.id}
                  tabIndex={0}
                  onClick={() => onSelectRow(incident.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSelectRow(incident.id)
                  }}
                  className={`cursor-pointer outline-none transition focus:bg-slate-900 ${
                    isActive ? 'bg-purple-950/30' : 'hover:bg-slate-900/70'
                  }`}
                >
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`Select ${deriveCaseId(incident)}`}
                      checked={selected}
                      onChange={() => onToggleSelect(incident.id)}
                      className="h-4 w-4 accent-purple-600"
                    />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-purple-300">
                    {deriveCaseId(incident)}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{TYPE_LABEL[incident.incident_type] || incident.incident_type}</td>
                  <td className={`px-4 py-3 font-mono tabular-nums ${RISK_TEXT[incident.threat_level] || 'text-slate-300'}`}>
                    {incident.risk_score?.toFixed(0) ?? '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${THREAT_DOT[incident.threat_level] || THREAT_DOT.unknown}`} />
                      <ThreatBadge level={incident.threat_level} />
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <CaseStatusBadge status={meta.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">
                    {meta.assignedOfficer || <span className="text-slate-600">Unassigned</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                    {new Date(incident.created_at).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                    {meta.updatedAt ? new Date(meta.updatedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-0.5">
                      <IconAction title="Investigate" onClick={() => actions.onInvestigate(incident)}>
                        <Investigate size={15} />
                      </IconAction>
                      <IconAction title="Generate AI Report" onClick={() => actions.onReport(incident)}>
                        <FileText size={15} />
                      </IconAction>
                      <IconAction title="View Threat Graph" onClick={() => actions.onGraph(incident)}>
                        <Share2 size={15} />
                      </IconAction>
                      <IconAction title="Export PDF" onClick={() => actions.onExportPdf(incident)}>
                        <Download size={15} />
                      </IconAction>
                      <AssignOfficerMenu
                        current={meta.assignedOfficer}
                        onAssign={(name) => actions.onAssign(incident.id, name)}
                      />
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
