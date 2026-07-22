import {
  FileText, Clock, Cpu, BookText, Scale, Boxes, PenLine, Gavel, MessageSquareText, ShieldCheck,
} from 'lucide-react'
import { DOCUMENT_CATALOG } from '../../lib/documents'
import ThreatBadge from '../ThreatBadge'

const AI_STATUS = {
  ready: { label: 'Ready', tone: 'text-sky-300', dot: 'bg-sky-400' },
  online: { label: 'Online (Gemini)', tone: 'text-emerald-300', dot: 'bg-emerald-400' },
  fallback: { label: 'Offline — using fallback', tone: 'text-amber-300', dot: 'bg-amber-400' },
}

function StatCard({ icon: Icon, label, value, sub, accent = 'purple' }) {
  const tones = {
    purple: 'border-purple-500/30 text-purple-300',
    emerald: 'border-emerald-500/30 text-emerald-300',
    amber: 'border-amber-500/30 text-amber-300',
    sky: 'border-sky-500/30 text-sky-300',
    slate: 'border-slate-700 text-slate-300',
  }
  return (
    <div className={`rounded-xl border bg-slate-900/50 p-4 ${tones[accent]}`}>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-500">
        <Icon size={14} /> {label}
      </div>
      <div className="mt-1.5 text-xl font-semibold text-slate-100">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  )
}

/**
 * CrimeGPT Dashboard — at-a-glance view of the active investigation, document
 * progress, AI status, case-diary progress and suggested legal sections, plus
 * quick actions that jump straight into a workflow.
 */
export default function CrimeGPTDashboard({ incident, caseId, crimeCase, confidence, aiStatus, onNavigate }) {
  const docs = crimeCase.documents || []
  const generatedCount = docs.length
  const pendingCount = Math.max(0, DOCUMENT_CATALOG.length - new Set(docs.map((d) => d.docType)).size)
  const diaryCount = (crimeCase.diary || []).length
  const legalCount = (crimeCase.legalSections || []).length
  const entityCount = crimeCase.entities
    ? Object.values(crimeCase.entities).reduce((s, a) => s + (a?.length || 0), 0)
    : 0
  const status = AI_STATUS[aiStatus] || AI_STATUS.ready

  const QUICK = [
    { label: 'Write Narrative', icon: PenLine, to: 'narrative' },
    { label: 'Review Entities', icon: Boxes, to: 'entities' },
    { label: 'Suggest Legal Sections', icon: Scale, to: 'legal' },
    { label: 'Find Case Law', icon: Gavel, to: 'caselaw' },
    { label: 'Generate Documents', icon: FileText, to: 'documents' },
    { label: 'Ask Legal Assistant', icon: MessageSquareText, to: 'assistant' },
  ]

  return (
    <div className="space-y-4">
      {/* Active investigation banner */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-500">
          <ShieldCheck size={14} /> Active Investigation
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div>
            <div className="text-lg font-semibold text-slate-100">{caseId}</div>
            <div className="text-xs text-slate-500">{incident.incident_type} · detected {new Date(incident.created_at).toLocaleString()}</div>
          </div>
          <div className="flex items-center gap-2">
            <ThreatBadge level={incident.threat_level} />
            <span className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-300 font-mono">
              {incident.risk_score != null ? Number(incident.risk_score).toFixed(1) : '-'}/100
            </span>
            <span className="text-xs text-slate-500">{confidence != null ? `${confidence}% confidence` : ''}</span>
          </div>
        </div>
        <p className="mt-3 line-clamp-2 rounded-lg bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
          {incident.raw_content}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={FileText} label="Generated Documents" value={generatedCount} sub={`${DOCUMENT_CATALOG.length} document types available`} accent="emerald" />
        <StatCard icon={Clock} label="Pending Documents" value={pendingCount} sub="Not yet generated" accent="amber" />
        <StatCard icon={Cpu} label="AI Status" value={<span className={`inline-flex items-center gap-2 text-base ${status.tone}`}><span className={`h-2 w-2 rounded-full ${status.dot}`} />{status.label}</span>} sub="Gemini-backed legal reasoning" accent="sky" />
        <StatCard icon={BookText} label="Case Diary Progress" value={diaryCount} sub={`${diaryCount} recorded event${diaryCount !== 1 ? 's' : ''}`} accent="purple" />
        <StatCard icon={Scale} label="Suggested Legal Sections" value={legalCount} sub={legalCount ? 'Accepted for this case' : 'None accepted yet'} accent="purple" />
        <StatCard icon={Boxes} label="Reviewed Entities" value={entityCount} sub={crimeCase.entitiesFinalized ? 'Finalized' : 'Draft'} accent="slate" />
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-200">Quick Actions</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK.map(({ label, icon: Icon, to }) => (
            <button
              key={to}
              onClick={() => onNavigate(to)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-200 transition hover:border-purple-500/40 hover:bg-slate-700"
            >
              <Icon size={15} className="text-purple-300" /> {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
