import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { getComplaint } from '../../api/complaints'
import { StatusPill, STATUS_LABEL } from './CitizenComplaints'
import { verdictFor } from '../../lib/citizenThreat'

const STEPS = ['submitted', 'under_review', 'resolved']

function Row({ label, value }) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-800 py-2 last:border-0 sm:flex-row sm:items-center sm:gap-3">
      <div className="w-40 shrink-0 text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="wrap-break-word text-sm text-slate-200">{value}</div>
    </div>
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
    <div className="mx-auto max-w-2xl p-6 sm:p-8">
      <Link to="/citizen/complaints" className="mb-5 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft size={15} /> Back to my complaints
      </Link>

      {loading ? (
        <p className="inline-flex items-center gap-2 text-sm text-slate-400"><Loader2 size={16} className="animate-spin" /> Loading...</p>
      ) : error || !c ? (
        <p className="inline-flex items-center gap-2 rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300"><AlertCircle size={16} /> {error || 'Not found.'}</p>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-mono text-lg font-semibold text-sky-300">{c.reference}</div>
              <div className="text-sm text-slate-400">{c.category}</div>
            </div>
            <StatusPill status={c.status} />
          </div>

          {/* Status tracker */}
          <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="mb-4 text-sm font-semibold text-slate-200">Current Status</div>
            <div className="flex items-center">
              {STEPS.map((s, i) => (
                <div key={s} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${i <= currentStep ? 'border-sky-500 bg-sky-500/20 text-sky-300' : 'border-slate-700 bg-slate-900 text-slate-600'}`}>
                      {i + 1}
                    </span>
                    <span className={`mt-1.5 text-[11px] ${i <= currentStep ? 'text-slate-300' : 'text-slate-600'}`}>{STATUS_LABEL[s]}</span>
                  </div>
                  {i < STEPS.length - 1 && <div className={`mx-2 h-0.5 flex-1 ${i < currentStep ? 'bg-sky-500' : 'bg-slate-800'}`} />}
                </div>
              ))}
            </div>
          </div>

          {/* AI detection summary */}
          {verdict && (
            <div className={`mb-5 rounded-2xl border p-5 ${verdict.tone}`}>
              <div className="text-sm font-semibold">AI Detection Summary: {verdict.label}</div>
              <div className="mt-1 text-sm opacity-90">
                {c.risk_score != null && <span className="font-mono">Risk score {Math.round(c.risk_score)}/100. </span>}
                {c.ai_summary}
              </div>
            </div>
          )}

          {/* Complaint details */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="mb-2 text-sm font-semibold text-slate-200">Complaint Details</div>
            <Row label="Description" value={c.description} />
            <Row label="Suspicious link" value={c.url} />
            <Row label="Email" value={c.email} />
            <Row label="Phone" value={c.phone} />
            <Row label="Attachment" value={c.attachment_name} />
            <Row label="Additional notes" value={c.notes} />
            <Row label="Filed on" value={new Date(c.created_at).toLocaleString()} />
          </div>
        </>
      )}
    </div>
  )
}
