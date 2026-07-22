import { Link } from 'react-router-dom'
import { Brain, Radar, FileText, Share2, Download, ArrowLeft, Loader2 } from 'lucide-react'
import ThreatBadge from '../ThreatBadge'
import CaseStatusBadge from '../cases/CaseStatusBadge'
import CasePriorityRibbon from '../cases/CasePriorityRibbon'

function Meta({ label, children }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="truncate text-sm text-slate-200">{children}</div>
    </div>
  )
}

const QuickBtn =
  'inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700 disabled:opacity-50'

/**
 * Section 1 — sticky case header with identity, priority ribbon, the
 * flagship AI Investigation Briefing button (Section 2 trigger) and quick
 * actions. Presentational; all handlers/data come from the page.
 */
export default function InvestigationHeader({
  incident,
  meta,
  caseId,
  confidence,
  linkedCases,
  canInvestigate,
  investigating,
  onRunInvestigation,
  onGenerateReport,
  onViewGraph,
  onExportPdf,
  onOpenBriefing,
}) {
  return (
    <div className="sticky top-0 z-20 -mx-8 border-b border-slate-800 bg-slate-950/95 px-8 py-4 backdrop-blur">
      <Link to="/dashboard/cases" className="mb-3 inline-flex items-center gap-1 text-xs text-purple-400 hover:underline">
        <ArrowLeft size={13} /> Back to Cases
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-lg font-semibold text-white">{caseId}</h1>
            <ThreatBadge level={incident.threat_level} />
            <CaseStatusBadge status={meta.status} />
          </div>
          <p className="mt-1 truncate text-sm text-slate-400" title={incident.raw_content}>
            {incident.raw_content}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-6">
            <Meta label="Threat Type">{incident.incident_type}</Meta>
            <Meta label="Risk Score">
              <span className="font-mono">{incident.risk_score?.toFixed(1) ?? '-'}/100</span>
            </Meta>
            <Meta label="AI Confidence">{confidence != null ? `${confidence}%` : 'N/A'}</Meta>
            <Meta label="Status">{meta.status.replace('_', ' ')}</Meta>
            <Meta label="Assigned Officer">{meta.assignedOfficer || 'Unassigned'}</Meta>
            <Meta label="Detection Time">{new Date(incident.created_at).toLocaleString()}</Meta>
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-2">
          <button
            onClick={onOpenBriefing}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-purple-500/50 bg-purple-600/20 px-4 py-2.5 text-sm font-semibold text-purple-100 transition hover:bg-purple-600/30"
          >
            <Brain size={17} /> AI Investigation Briefing
          </button>
          <div className="flex flex-wrap gap-2">
            <button className={QuickBtn} onClick={onRunInvestigation} disabled={!canInvestigate || investigating}>
              {investigating ? <Loader2 size={14} className="animate-spin" /> : <Radar size={14} />}
              Run Investigation
            </button>
            <button className={QuickBtn} onClick={onGenerateReport}>
              <FileText size={14} /> Generate AI Report
            </button>
            <button className={QuickBtn} onClick={onViewGraph}>
              <Share2 size={14} /> View Threat Graph
            </button>
            <button className={QuickBtn} onClick={onExportPdf}>
              <Download size={14} /> Export PDF
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <CasePriorityRibbon
          caseId={caseId}
          threatLevel={incident.threat_level}
          confidence={confidence}
          linkedCases={linkedCases}
        />
      </div>
    </div>
  )
}
