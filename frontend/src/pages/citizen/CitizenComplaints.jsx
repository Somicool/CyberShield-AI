import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, ChevronRight, FileWarning, Loader2 } from 'lucide-react'
import { listMyComplaints } from '../../api/complaints'
import { PageHeader, Panel, PanelHead } from '../../components/citizen/Panel'
import { STATUS_STYLE, STATUS_LABEL } from '../../lib/complaintStatus'

export function StatusPill({ status }) {
  return (
    <span
      className={`inline-block rounded border px-1.5 py-0.5 text-[11.5px] font-medium ${
        STATUS_STYLE[status] || STATUS_STYLE.submitted
      }`}
    >
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
    <div className="min-h-full">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 p-6 sm:p-8">
        <PageHeader
          title="My Complaints"
          subtitle="Track the reports you have submitted."
          action={
            <Link
              to="/citizen/report"
              className="btn-primary h-9 px-3 text-[13px]"
            >
              <FileWarning size={14} /> New report
            </Link>
          }
        />

        <Panel>
          <PanelHead
            title="Reports"
            hint={loading ? 'Loading…' : `${items.length} filed`}
          />

          {loading ? (
            <p className="flex items-center justify-center gap-2 px-4 py-8 text-[13.5px] text-slate-400">
              <Loader2 size={15} className="animate-spin" /> Loading…
            </p>
          ) : error ? (
            <p className="m-3 rounded-lg border border-red-500/25 bg-red-500/8 px-3 py-2 text-[13px] text-red-200">
              {error}
            </p>
          ) : items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <ClipboardList size={26} className="mx-auto mb-2 text-slate-700" />
              <p className="text-[13.5px] text-slate-400">You have not filed any complaints yet.</p>
              <Link to="/citizen/report" className="btn-primary mt-4 px-4 py-2 text-[13.5px]">
                <FileWarning size={14} /> Report a cyber crime
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-white/6">
              {items.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/citizen/complaints/${c.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-white/4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[13.5px] text-cyan-300">{c.reference}</span>
                        <StatusPill status={c.status} />
                        <span className="text-[12.5px] text-slate-500">
                          {new Date(c.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[14px] text-slate-200">{c.category}</div>
                      <div className="truncate text-[12.5px] text-slate-500">{c.description}</div>
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-slate-600" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
