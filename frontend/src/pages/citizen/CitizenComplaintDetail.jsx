import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { getComplaint } from '../../api/complaints'
import { StatusPill } from './CitizenComplaints'
import { STATUS_LABEL } from '../../lib/complaintStatus'
import { verdictFor } from '../../lib/citizenThreat'
import { Panel, PanelHead, Row } from '../../components/citizen/Panel'

const STEPS = ['submitted', 'under_review', 'resolved']

/** Only render a field the citizen actually provided. */
function Field({ label, value }) {
  if (!value) return null
  return (
    <Row label={label}>
      <span className="wrap-break-word">{value}</span>
    </Row>
  )
}

/** Complaint detail — full report, AI detection summary and current status. */
export default function CitizenComplaintDetail() {
  const { id } = useParams()
  const [c, setC] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getComplaint(id)
      .then(setC)
      .catch(() => setError('Could not load this complaint.'))
      .finally(() => setLoading(false))
  }, [id])

  const verdict = c?.threat_level ? verdictFor(c.threat_level) : null
  const currentStep = c ? STEPS.indexOf(c.status) : -1

  return (
    <div className="min-h-full"><div className="mx-auto flex max-w-2xl flex-col gap-3 p-6 sm:p-8">
      <Link to="/citizen/complaints" className="inline-flex w-fit items-center gap-1.5 text-[13.5px] text-slate-400 transition hover:text-slate-200">
        <ArrowLeft size={15} /> Back to my complaints
      </Link>

      {loading ? (
        <p className="inline-flex items-center gap-2 text-sm text-slate-400"><Loader2 size={16} className="animate-spin" /> Loading...</p>
      ) : error || !c ? (
        <p className="inline-flex items-center gap-2 rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300"><AlertCircle size={16} /> {error || 'Not found.'}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-mono text-[19px] font-semibold text-cyan-300">{c.reference}</div>
              <div className="text-[13.5px] text-slate-400">{c.category}</div>
            </div>
            <StatusPill status={c.status} />
          </div>

          {/* Status tracker */}
          <Panel>
            <PanelHead title="Current Status" />
            <div className="flex items-center px-4 py-4">
              {STEPS.map((s, i) => (
                <div key={s} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full border text-[12.5px] font-semibold ${
                        i <= currentStep
                          ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-200'
                          : 'border-white/12 bg-black/35 text-slate-600'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className={`mt-1.5 text-[12.5px] ${i <= currentStep ? 'text-slate-300' : 'text-slate-600'}`}>{STATUS_LABEL[s]}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`mx-2 h-0.5 flex-1 ${i < currentStep ? 'bg-cyan-500/70' : 'bg-white/10'}`} />
                  )}
                </div>
              ))}
            </div>
          </Panel>

          {/* AI detection summary */}
          {verdict && (
            <div className={`rounded-xl border p-4 backdrop-blur-md ${verdict.tone}`}>
              <div className="text-[13.5px] font-semibold uppercase tracking-[0.06em]">
                AI Detection Summary · {verdict.label}
              </div>
              <div className="mt-1 text-[13.5px] leading-relaxed opacity-90">
                {c.risk_score != null && <span className="font-mono">Risk score {Math.round(c.risk_score)}/100. </span>}
                {c.ai_summary}
              </div>
            </div>
          )}

          {/* Complaint details */}
          <Panel>
            <PanelHead title="Complaint Details" />
            <div className="divide-y divide-white/6">
              <Field label="Description" value={c.description} />
              <Field label="Suspicious link" value={c.url} />
              <Field label="Email" value={c.email} />
              <Field label="Phone" value={c.phone} />
              <Field label="Attachment" value={c.attachment_name} />
              <Field label="Additional notes" value={c.notes} />
              <Field label="Filed on" value={new Date(c.created_at).toLocaleString()} />
            </div>
          </Panel>
        </>
      )}
      </div>
    </div>
  )
}
