import {
  FileText, Boxes, PenLine, Gavel, MessageSquareText, Scale, BookText, Activity, Cpu, ArrowRight,
} from 'lucide-react'
import { DOCUMENT_CATALOG } from '../../lib/documents'
import { statusLabel } from '../../lib/caseHelpers'
import { ENTITY_LABELS } from '../../lib/crimegptContext'

const AI_STATUS = {
  ready: { label: 'Ready', tone: 'text-zinc-300', dot: 'bg-zinc-400' },
  online: { label: 'Online (Gemini)', tone: 'text-emerald-300', dot: 'bg-emerald-400' },
  fallback: { label: 'Offline — fallback', tone: 'text-amber-300', dot: 'bg-amber-400' },
}

const THREAT_TEXT = {
  critical: 'text-red-300',
  high: 'text-amber-300',
  medium: 'text-zinc-200',
  low: 'text-emerald-300',
}

/** Primary actions produce case output; the rest are supporting steps. */
const QUICK_ACTIONS = [
  { label: 'Write Narrative', icon: PenLine, to: 'narrative', primary: true },
  { label: 'Suggest Legal Sections', icon: Scale, to: 'legal', primary: true },
  { label: 'Generate Documents', icon: FileText, to: 'documents', primary: true },
  { label: 'Review Entities', icon: Boxes, to: 'entities' },
  { label: 'Find Case Law', icon: Gavel, to: 'caselaw' },
  { label: 'Ask Legal Assistant', icon: MessageSquareText, to: 'assistant' },
]

function Metric({ icon: Icon, label, value, sub, valueClass = '' }) {
  return (
    <div className="min-w-0 px-4 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-zinc-500">
        <Icon size={12} /> {label}
      </div>
      <div className={`mt-0.5 truncate text-[17px] font-semibold tabular-nums ${valueClass || 'text-zinc-100'}`}>
        {value}
      </div>
      {sub && <div className="truncate text-[12px] text-zinc-500">{sub}</div>}
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex gap-3 px-4 py-2">
      <span className="w-40 shrink-0 text-[12px] uppercase tracking-[0.08em] text-zinc-500">{label}</span>
      <span className="min-w-0 flex-1 text-[13.5px] text-zinc-200">{children}</span>
    </div>
  )
}

const NONE = <span className="text-zinc-500">Not recorded yet</span>

/**
 * CrimeGPT Dashboard — what is open, what is done, what needs attention.
 *
 * Every figure is counted from real case data: the incident record, the
 * workflow store's status, and this case's CrimeGPT record (documents, diary,
 * accepted legal sections, reviewed entities). Empty means empty — nothing is
 * filled in on the officer's behalf.
 */
export default function CrimeGPTDashboard({ incident, meta, crimeCase, aiStatus, onNavigate }) {
  const docs = crimeCase.documents || []
  const docTypesDone = new Set(docs.map((d) => d.docType)).size
  const diaryCount = (crimeCase.diary || []).length
  const legal = crimeCase.legalSections || []
  const entityCounts = crimeCase.entities || null
  const entityCount = entityCounts
    ? Object.values(entityCounts).reduce((s, a) => s + (a?.length || 0), 0)
    : 0
  const status = AI_STATUS[aiStatus] || AI_STATUS.ready
  const investigationStatus = statusLabel(meta?.status || 'open')

  const filledCategories = entityCounts
    ? Object.entries(ENTITY_LABELS)
        .filter(([key]) => (entityCounts[key] || []).length)
        .map(([key, label]) => `${label} (${entityCounts[key].length})`)
    : []

  return (
    <div className="flex flex-col gap-3">
      {/* Section 4 — case status */}
      <section className="overflow-hidden rounded-lg border border-white/10 bg-[#111722]/82 backdrop-blur-md">
        <div className="border-b border-white/5 px-4 py-2">
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-zinc-300">Case Status</h3>
        </div>
        <div className="grid grid-cols-2 divide-white/5 sm:grid-cols-3 sm:divide-x lg:grid-cols-6">
          <Metric icon={Activity} label="Investigation" value={investigationStatus} />
          <Metric
            icon={FileText}
            label="Documents"
            value={docs.length}
            sub={`${docTypesDone}/${DOCUMENT_CATALOG.length} types drafted`}
          />
          <Metric
            icon={BookText}
            label="Case Diary"
            value={diaryCount}
            sub={`${diaryCount === 1 ? 'entry' : 'entries'} recorded`}
          />
          <Metric
            icon={Scale}
            label="Legal Sections"
            value={legal.length}
            sub={legal.length ? 'accepted' : 'none accepted'}
          />
          <Metric
            icon={Boxes}
            label="Entities"
            value={entityCount}
            sub={crimeCase.entitiesFinalized ? 'finalized' : 'draft'}
          />
          <Metric
            icon={Cpu}
            label="AI Status"
            value={
              <span className={`inline-flex items-center gap-1.5 text-[15px] ${status.tone}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
            }
          />
        </div>
      </section>

      {/* Section 5 — quick actions */}
      <section className="overflow-hidden rounded-lg border border-white/10 bg-[#111722]/82 backdrop-blur-md">
        <div className="border-b border-white/5 px-4 py-2">
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-zinc-300">Quick Actions</h3>
        </div>
        <div className="flex flex-wrap gap-2 p-3">
          {QUICK_ACTIONS.map(({ label, icon: Icon, to, primary }) => (
            <button
              key={to}
              onClick={() => onNavigate(to)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-[13px] transition ${
                primary
                  ? 'btn-primary'
                  : 'border-white/10 bg-black/35 text-zinc-300 hover:border-white/20 hover:text-zinc-100'
              }`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </section>

      {/* Section 6 — case intelligence */}
      <section className="overflow-hidden rounded-lg border border-white/10 bg-[#111722]/82 backdrop-blur-md">
        <div className="border-b border-white/5 px-4 py-2">
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-zinc-300">Case Intelligence</h3>
        </div>
        <div className="divide-y divide-white/5">
          <Row label="Threat">
            <span className={THREAT_TEXT[incident.threat_level] || 'text-zinc-300'}>
              {(incident.threat_level || 'unknown').toUpperCase()}
            </span>
            <span className="text-zinc-500"> · {incident.incident_type}</span>
          </Row>
          <Row label="Risk">
            <span className="font-mono tabular-nums">
              {incident.risk_score != null ? `${Number(incident.risk_score).toFixed(1)}/100` : '—'}
            </span>
          </Row>
          <Row label="AI Summary">
            {incident.ai_explanation ? (
              <span className="block leading-relaxed text-zinc-300">{incident.ai_explanation}</span>
            ) : (
              <span className="text-zinc-500">No AI explanation stored for this case.</span>
            )}
          </Row>
          <Row label="Entities">
            {filledCategories.length ? (
              <span className="text-zinc-300">{filledCategories.join(' · ')}</span>
            ) : (
              NONE
            )}
            {filledCategories.length > 0 && (
              <button
                onClick={() => onNavigate('entities')}
                className="ml-2 inline-flex items-center gap-1 text-[12.5px] text-cyan-300/80 hover:text-cyan-200"
              >
                Review <ArrowRight size={11} />
              </button>
            )}
          </Row>
          <Row label="Suggested Legal Sections">
            {legal.length ? (
              <span className="flex flex-wrap gap-1.5">
                {legal.map((s, idx) => (
                  <span
                    key={`${s.act}-${s.section}-${idx}`}
                    className="rounded border border-white/12 px-1.5 py-0.5 text-[12.5px] text-zinc-200"
                    title={s.title}
                  >
                    {s.act} {s.section}
                  </span>
                ))}
              </span>
            ) : (
              <>
                <span className="text-zinc-500">None accepted yet.</span>
                <button
                  onClick={() => onNavigate('legal')}
                  className="ml-2 inline-flex items-center gap-1 text-[12.5px] text-cyan-300/80 hover:text-cyan-200"
                >
                  Suggest sections <ArrowRight size={11} />
                </button>
              </>
            )}
          </Row>
          <Row label="Investigation Status">
            {investigationStatus}
            {meta?.assignedOfficer ? (
              <span className="text-zinc-500"> · {meta.assignedOfficer}</span>
            ) : (
              <span className="text-zinc-500"> · Unassigned</span>
            )}
          </Row>
        </div>
      </section>
    </div>
  )
}
