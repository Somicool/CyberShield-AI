import { useState } from 'react'
import { FolderSearch, Paperclip, Share2, FileText, Loader2, Trash2, X, Check } from 'lucide-react'
import ThreatBadge from '../ThreatBadge'
import CaseStatusBadge from './CaseStatusBadge'
import { deriveCaseId } from '../../lib/caseHelpers'
import { relativeTime } from '../../lib/intel'

const TYPE_LABEL = { url: 'URL / Link', sms: 'SMS', email: 'Email', qr: 'QR Code' }

const RISK_TEXT = {
  critical: 'text-red-300',
  high: 'text-amber-300',
  medium: 'text-zinc-200',
  low: 'text-emerald-300',
}

function Action({ icon: Icon, label, onClick, busy }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center justify-center gap-1.5 rounded-md border border-white/8 bg-white/3 px-2 py-2 text-[11.5px] font-medium text-zinc-300 transition hover:border-amber-400/30 hover:bg-white/6 hover:text-zinc-100 disabled:opacity-50"
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} className="text-amber-300/70" />}
      {label}
    </button>
  )
}

/**
 * A single case rendered as a self-contained box (replaces the old table row).
 *
 * Exactly four actions, each wired to existing functionality:
 *   Open Investigation → Investigation Workspace
 *   View Evidence      → incident detail (collected detection/investigation evidence)
 *   View Threat Graph  → Intelligence Graph, deep-linked to this case's domain
 *   Generate AI Report → printable investigation report
 */
export default function CaseCard({
  incident,
  meta,
  reportBusy,
  deleteBusy,
  onOpenInvestigation,
  onViewEvidence,
  onViewGraph,
  onGenerateReport,
  onDelete,
}) {
  const [confirming, setConfirming] = useState(false)

  return (
    <article className="flex flex-col rounded-lg border border-white/7 bg-white/2 transition hover:border-white/12">
      {/* identity */}
      <div className="flex items-start justify-between gap-3 border-b border-white/5 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[12.5px] text-zinc-100">{deriveCaseId(incident)}</span>
            <ThreatBadge level={incident.threat_level} />
          </div>
          <p className="mt-1.5 truncate text-[12px] text-zinc-500" title={incident.raw_content}>
            {incident.raw_content}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className={`font-mono text-[19px] font-semibold leading-none tabular-nums ${RISK_TEXT[incident.threat_level] || 'text-zinc-200'}`}>
            {incident.risk_score?.toFixed(0) ?? '—'}
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wide text-zinc-600">Risk</div>
        </div>
      </div>

      {/* meta */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 text-[11.5px]">
        <div>
          <span className="text-zinc-600">Type</span>
          <div className="text-zinc-300">{TYPE_LABEL[incident.incident_type] || incident.incident_type}</div>
        </div>
        <div>
          <span className="text-zinc-600">Status</span>
          <div className="mt-0.5"><CaseStatusBadge status={meta.status} /></div>
        </div>
        <div>
          <span className="text-zinc-600">Officer</span>
          <div className={meta.assignedOfficer ? 'text-zinc-300' : 'text-zinc-600'}>
            {meta.assignedOfficer || 'Unassigned'}
          </div>
        </div>
        <div>
          <span className="text-zinc-600">Detected</span>
          <div className="text-zinc-300">{relativeTime(incident.created_at)}</div>
        </div>
      </div>

      {/* the four actions */}
      <div className="mt-auto grid grid-cols-2 gap-2 border-t border-white/5 px-4 pt-3">
        <Action icon={FolderSearch} label="Open Investigation" onClick={() => onOpenInvestigation(incident)} />
        <Action icon={Paperclip} label="View Evidence" onClick={() => onViewEvidence(incident)} />
        <Action icon={Share2} label="View Threat Graph" onClick={() => onViewGraph(incident)} />
        <Action icon={FileText} label="Generate AI Report" onClick={() => onGenerateReport(incident)} busy={reportBusy} />
      </div>

      {/* delete — kept visually separate from the four main actions, and
          always behind an explicit confirmation since it is irreversible */}
      <div className="px-4 pb-3 pt-2">
        {confirming ? (
          <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/8 px-2.5 py-2">
            <span className="flex-1 text-[11px] text-red-200">Delete permanently?</span>
            <button
              onClick={() => onDelete(incident)}
              disabled={deleteBusy}
              className="inline-flex items-center gap-1 rounded border border-red-500/40 bg-red-500/15 px-2 py-1 text-[11px] font-medium text-red-200 transition hover:bg-red-500/25 disabled:opacity-50"
            >
              {deleteBusy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              Yes, delete
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={deleteBusy}
              className="inline-flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-[11px] text-zinc-400 transition hover:text-zinc-200 disabled:opacity-50"
            >
              <X size={11} /> Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="inline-flex items-center gap-1.5 text-[11px] text-zinc-600 transition hover:text-red-300"
          >
            <Trash2 size={12} /> Delete case
          </button>
        )}
      </div>
    </article>
  )
}
