import { Check, Clock } from 'lucide-react'

const DEFAULT_STEPS = [
  { key: 'submitted', label: 'Complaint Submitted' },
  { key: 'detected', label: 'AI Detection Completed' },
  { key: 'intel', label: 'Threat Intelligence Collected' },
  { key: 'investigation', label: 'Investigation Started' },
  { key: 'evidence', label: 'Evidence Collected' },
  { key: 'review', label: 'Officer Review' },
  { key: 'closed', label: 'Case Closed' },
]

function fmt(ts) {
  return ts ? new Date(ts).toLocaleString() : null
}

/**
 * Section 7 — Investigation timeline.
 *
 * `stamps` maps step keys to ISO timestamps. Complaint + detection come from
 * the incident's real creation time; later steps are stamped by officer
 * actions via the workflow store. Steps without a timestamp render as
 * pending rather than inventing a time.
 */
export default function CaseTimeline({ stamps = {}, steps = DEFAULT_STEPS }) {
  return (
    <ol className="relative ml-1 space-y-4 border-l border-slate-800 pl-5">
      {steps.map((step) => {
        const at = stamps[step.key]
        const done = Boolean(at)
        return (
          <li key={step.key} className="relative">
            <span
              className={`absolute left-[-27px] flex h-4 w-4 items-center justify-center rounded-full border ${
                done
                  ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-400'
                  : 'border-slate-700 bg-slate-900 text-slate-600'
              }`}
            >
              {done ? <Check size={10} /> : <Clock size={10} />}
            </span>
            <div className={`text-sm ${done ? 'text-slate-200' : 'text-slate-500'}`}>{step.label}</div>
            <div className="text-[11px] text-slate-600">{fmt(at) || 'Pending'}</div>
          </li>
        )
      })}
    </ol>
  )
}
