import { useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { FileWarning, Loader2, CheckCircle2, Paperclip, ArrowRight } from 'lucide-react'
import { createComplaint } from '../../api/complaints'
import { PageHeader, Panel, PanelHead } from '../../components/citizen/Panel'

const CATEGORIES = [
  'Suspicious Website',
  'Phishing Email',
  'SMS Scam',
  'QR Scam',
  'Social Media Scam',
  'Financial Fraud',
  'Other Cyber Crime',
]

const STATUS_LABEL = { submitted: 'Submitted', under_review: 'Under Review', resolved: 'Resolved' }

const field =
  'w-full rounded-md border border-white/10 bg-black/35 px-3 py-2.5 text-[14.5px] text-slate-100 placeholder:text-slate-600 focus:border-cyan-400/50 focus:outline-none'

/**
 * Report Cyber Crime — a simple complaint form for citizens. On submit it calls
 * the complaints backend, which reuses the detection pipeline to attach an AI
 * summary, and returns a Complaint ID + status the citizen can track.
 */
export default function CitizenReport() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    category: params.get('category') || CATEGORIES[0],
    description: '',
    url: '',
    email: '',
    phone: '',
    notes: '',
    attachment_name: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.description.trim()) {
      setError('Please describe what happened.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const payload = {
        category: form.category,
        description: form.description.trim(),
        url: form.url.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        notes: form.notes.trim() || null,
        attachment_name: form.attachment_name || null,
      }
      const complaint = await createComplaint(payload)
      setDone(complaint)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not submit your report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ---- success view ------------------------------------------------------
  if (done) {
    const scannable = Boolean(done.url) || ['Phishing Email', 'SMS Scam'].includes(done.category)
    return (
      <div className="min-h-full">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 p-6 sm:p-8">
        <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-6 text-center backdrop-blur-md">
          <CheckCircle2 size={40} className="mx-auto text-emerald-400" />
          <h1 className="mt-3 text-xl font-semibold text-slate-100">Your report has been submitted</h1>
          <p className="mt-1 text-[14px] text-slate-300">Thank you for helping keep others safe.</p>
          <div className="mt-4 inline-block rounded-lg border border-white/12 bg-black/35 px-5 py-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">Your Complaint ID</div>
            <div className="mt-0.5 font-mono text-lg font-semibold text-cyan-300">{done.reference}</div>
          </div>
          <div className="mt-3 text-sm text-slate-400">
            Status: <span className="font-medium text-amber-300">{STATUS_LABEL[done.status] || done.status}</span>
          </div>
        </div>

        {scannable && (
          <div className="rounded-xl border border-white/10 bg-slate-900/80 p-4 text-[13.5px] leading-relaxed text-slate-300 backdrop-blur-md">
            Our AI is checking the details you reported now. The result will appear on your complaint in a few moments —
            open it from <span className="text-cyan-300">My Complaints</span> to see it.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Link to="/citizen/complaints" className="btn-primary px-4 py-2.5 text-[13.5px]">
            View my complaints <ArrowRight size={15} />
          </Link>
          <button onClick={() => { setDone(null); navigate('/citizen/report') }} className="rounded-md border border-white/10 bg-white/5 px-4 py-2.5 text-[13.5px] text-slate-200 transition hover:border-white/20 hover:text-white">
            Report something else
          </button>
        </div>
        </div>
      </div>
    )
  }

  // ---- form view ---------------------------------------------------------
  return (
    <div className="min-h-full">
      <div className="mx-auto flex max-w-2xl flex-col gap-3 p-6 sm:p-8">
        <PageHeader
          title="Report a Cyber Crime"
          subtitle="Tell us what happened. It only takes a minute."
        />

        <Panel>
          <PanelHead title="Complaint Details" hint="* required" />
          <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <div>
          <label className="mb-1 block text-[13.5px] text-slate-300">What type of problem is it?</label>
          <select value={form.category} onChange={(e) => set('category', e.target.value)} className={field}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[13.5px] text-slate-300">Describe what happened <span className="text-red-400">*</span></label>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={5}
            placeholder="For example: I received an SMS saying my bank account is blocked and asking me to click a link..."
            className={`${field} resize-y`}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[13.5px] text-slate-300">Suspicious link (optional)</label>
            <input value={form.url} onChange={(e) => set('url', e.target.value)} placeholder="https://..." className={field} />
            <p className="mt-1 text-[12.5px] text-slate-500">If you add a link, we will run an instant AI check on it.</p>
          </div>
          <div>
            <label className="mb-1 block text-[13.5px] text-slate-300">Suspicious email (optional)</label>
            <input value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="sender@example.com" className={field} />
          </div>
          <div>
            <label className="mb-1 block text-[13.5px] text-slate-300">Phone number involved (optional)</label>
            <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91..." className={field} />
          </div>
          <div>
            <label className="mb-1 block text-[13.5px] text-slate-300">Attach a screenshot (optional)</label>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-black/35 px-3 py-2.5 text-[14px] text-slate-400 transition hover:border-white/20">
              <Paperclip size={15} />
              <span className="truncate">{form.attachment_name || 'Choose a file'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => set('attachment_name', e.target.files?.[0]?.name || '')} />
            </label>
            <p className="mt-1 text-[12.5px] text-slate-500">Only the file name is recorded for now.</p>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[13.5px] text-slate-300">Anything else you want to add? (optional)</label>
          <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} placeholder="Additional notes..." className={`${field} resize-y`} />
        </div>

            {error && (
              <p className="rounded-md border border-red-500/25 bg-red-500/8 px-3 py-2 text-[13px] text-red-200">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-[14.5px]">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <FileWarning size={16} />}
              {loading ? 'Submitting…' : 'Submit report'}
            </button>
          </form>
        </Panel>
      </div>
    </div>
  )
}
