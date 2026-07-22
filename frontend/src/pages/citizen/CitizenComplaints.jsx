import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, ChevronRight, FileWarning, Loader2 } from 'lucide-react'
import { listMyComplaints } from '../../api/complaints'

export const STATUS_STYLE = {
  submitted: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  under_review: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  resolved: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
}
export const STATUS_LABEL = { submitted: 'Submitted', under_review: 'Under Review', resolved: 'Resolved' }

export function StatusPill({ status }) {
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[status] || STATUS_STYLE.submitted}`}>
      {STATUS_LABEL[status] || status}
    </span>
  )
}

/** My Complaints — lists every report the signed-in citizen has filed. */
export default function CitizenComplaints() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    listMyComplaints()
      .then(setItems)
      .catch(() => setError('Could not load your complaints. Please try again.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-sky-500/40 bg-sky-500/15 text-sky-300">
            <ClipboardList size={24} />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-slate-100">My Complaints</h1>
            <p className="text-sm text-slate-400">Track the reports you have submitted.</p>
          </div>
        </div>
        <Link to="/citizen/report" className="hidden shrink-0 items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500 sm:inline-flex">
          <FileWarning size={15} /> New report
        </Link>
      </div>

      {loading ? (
        <p className="inline-flex items-center gap-2 text-sm text-slate-400"><Loader2 size={16} className="animate-spin" /> Loading...</p>
      ) : error ? (
        <p className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-12 text-center">
          <ClipboardList size={30} className="mx-auto mb-2 text-slate-700" />
          <p className="text-sm text-slate-400">You have not filed any complaints yet.</p>
          <Link to="/citizen/report" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500">
            <FileWarning size={15} /> Report a cyber crime
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <Link
              key={c.id}
              to={`/citizen/complaints/${c.id}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 transition hover:border-sky-500/40 hover:bg-slate-900"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm text-sky-300">{c.reference}</span>
                  <StatusPill status={c.status} />
                </div>
                <div className="mt-1 text-sm text-slate-200">{c.category}</div>
                <div className="mt-0.5 truncate text-xs text-slate-500">{c.description}</div>
                <div className="mt-1 text-xs text-slate-600">{new Date(c.created_at).toLocaleString()}</div>
              </div>
              <ChevronRight size={18} className="shrink-0 text-slate-600" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
