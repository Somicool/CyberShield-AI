import { useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { FileWarning, Loader2, CheckCircle2, Paperclip, ArrowRight } from 'lucide-react'
import { createComplaint } from '../../api/complaints'

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

const field = 'w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none'

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
      <div className="mx-auto max-w-2xl p-6 sm:p-8">
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center">
          <CheckCircle2 size={44} className="mx-auto text-emerald-400" />
          <h1 className="mt-3 text-xl font-semibold text-slate-100">Your report has been submitted</h1>
          <p className="mt-1 text-sm text-slate-300">Thank you for helping keep others safe.</p>
          <div className="mt-4 inline-block rounded-xl border border-slate-700 bg-slate-900/70 px-5 py-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">Your Complaint ID</div>
            <div className="mt-0.5 font-mono text-lg font-semibold text-sky-300">{done.reference}</div>
          </div>
          <div className="mt-3 text-sm text-slate-400">
            Status: <span className="font-medium text-amber-300">{STATUS_LABEL[done.status] || done.status}</span>
          </div>
        </div>

        {scannable && (
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
            Our AI is checking the details you reported now. The result will appear on your complaint in a few moments —
            open it from <span className="text-sky-300">My Complaints</span> to see it.
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/citizen/complaints" className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-500">
            View my complaints <ArrowRight size={15} />
          </Link>
          <button onClick={() => { setDone(null); navigate('/citizen/report') }} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800">
            Report something else
          </button>
        </div>
      </div>
    )
  }

  // ---- form view ---------------------------------------------------------
  return (
    <div className="mx-auto max-w-2xl p-6 sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/40 bg-red-500/15 text-red-300">
          <FileWarning size={24} />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Report a Cyber Crime</h1>
          <p className="text-sm text-slate-400">Tell us what happened. It only takes a minute.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-slate-300">What type of problem is it?</label>
          <select value={form.category} onChange={(e) => set('category', e.target.value)} className={field}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300">Describe what happened <span className="text-red-400">*</span></label>
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
            <label className="mb-1 block text-sm text-slate-300">Suspicious link (optional)</label>
            <input value={form.url} onChange={(e) => set('url', e.target.value)} placeholder="https://..." className={field} />
            <p className="mt-1 text-xs text-slate-500">If you add a link, we will run an instant AI check on it.</p>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Suspicious email (optional)</label>
            <input value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="sender@example.com" className={field} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Phone number involved (optional)</label>
            <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91..." className={field} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Attach a screenshot (optional)</label>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-800">
              <Paperclip size={15} />
              <span className="truncate">{form.attachment_name || 'Choose a file'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => set('attachment_name', e.target.files?.[0]?.name || '')} />
            </label>
            <p className="mt-1 text-xs text-slate-500">Only the file name is recorded for now.</p>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300">Anything else you want to add? (optional)</label>
          <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} placeholder="Additional notes..." className={`${field} resize-y`} />
        </div>

        {error && <p className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3.5 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
        >
          {loading ? <Loader2 size={17} className="animate-spin" /> : <FileWarning size={17} />}
          {loading ? 'Submitting...' : 'Submit report'}
        </button>
      </form>
    </div>
  )
}
