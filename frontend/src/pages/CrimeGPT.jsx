import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { listIncidents } from '../api/incidents'
import { deriveCaseId } from '../lib/caseHelpers'
import { relativeTime } from '../lib/intel'
import useCaseData from '../hooks/useCaseData'
import { Skeleton } from '../components/cases/Skeleton'
import AiSafetyNote from '../components/crimegpt/AiSafetyNote'
import CaseSelector from '../components/crimegpt/CaseSelector'
import CrimeGPTModule from '../components/crimegpt/CrimeGPTModule'

const WORKING_SET_SIZE = 100

const THREAT_TEXT = {
  critical: 'text-red-300',
  high: 'text-amber-300',
  medium: 'text-zinc-200',
  low: 'text-emerald-300',
}

function HeaderFact({ label, value, className = '' }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-[0.08em] text-cyan-300/85">{label}</div>
      <div className={`truncate text-[14px] font-medium ${className || 'text-zinc-100'}`}>{value}</div>
    </div>
  )
}

/**
 * CrimeGPT page — the police-only entry point.
 *
 * The officer picks a case, then CrimeGPT loads that case's real investigation
 * data (useCaseData) and renders the legal-intelligence workspace. Nothing is
 * re-entered: everything flows from the existing detection/investigation APIs.
 */
export default function CrimeGPT() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [incidents, setIncidents] = useState([])

  const caseData = useCaseData(id)

  // Case switcher list — only needed once a case is open.
  useEffect(() => {
    if (!id) return
    listIncidents({ page: 1, pageSize: WORKING_SET_SIZE })
      .then((d) => setIncidents(d.items || []))
      .catch(() => setIncidents([]))
  }, [id])

  const open = (incidentId) => navigate(`/dashboard/crimegpt/${incidentId}`)

  // ---- no case selected: pick one ----------------------------------------
  if (!id) {
    return (
      <div className="min-h-full">
        <div className="mx-auto flex max-w-375 flex-col gap-3 p-6">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[19px] font-semibold tracking-tight text-zinc-50">CrimeGPT</h1>
              <p className="text-[13px] text-zinc-500">
                AI-assisted legal intelligence, case documentation and investigation support.
              </p>
            </div>
            <AiSafetyNote />
          </header>

          <CaseSelector onOpen={open} />
        </div>
      </div>
    )
  }

  // ---- case selected: compact case header + module ------------------------
  const { incident, meta, confidence, caseId } = caseData
  const updated = meta?.updatedAt || incident?.created_at

  return (
    <div className="min-h-full">
      <div className="mx-auto flex max-w-375 flex-col gap-3 p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard/crimegpt')}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/10 bg-black/35 px-2.5 text-[13px] text-zinc-300 transition hover:border-cyan-400/40 hover:text-cyan-200"
            >
              <ArrowLeft size={14} /> All Cases
            </button>
            <h1 className="text-[17px] font-semibold tracking-tight text-zinc-50">CrimeGPT</h1>
          </div>

          <div className="flex items-center gap-3">
            {incidents.length > 0 && (
              <select
                aria-label="Switch case"
                value={id}
                onChange={(e) => open(e.target.value)}
                className="h-9 max-w-70 rounded-md border border-white/10 bg-black/35 px-2.5 text-[13px] text-zinc-200 outline-none transition focus:border-cyan-400/40"
              >
                {incidents.map((i) => (
                  <option key={i.id} value={i.id}>
                    {deriveCaseId(i)} · {i.incident_type} · {(i.raw_content || '').slice(0, 30)}
                  </option>
                ))}
              </select>
            )}
          </div>
        </header>

        {caseData.loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : caseData.error || !incident ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/8 px-3 py-2 text-[13px] text-red-200">
            <AlertCircle size={14} /> {caseData.error || 'Case not found.'}
          </div>
        ) : (
          <>
            {/* Section 2 — compact case header */}
            <section className="overflow-hidden rounded-lg border border-white/10 bg-[#111722]/82 backdrop-blur-md">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3 sm:grid-cols-3 lg:grid-cols-6">
                <HeaderFact label="Case ID" value={<span className="font-mono">{caseId}</span>} />
                <HeaderFact
                  label="Threat Level"
                  value={(incident.threat_level || 'unknown').toUpperCase()}
                  className={THREAT_TEXT[incident.threat_level] || 'text-zinc-300'}
                />
                <HeaderFact
                  label="Risk Score"
                  value={
                    <span className="font-mono tabular-nums">
                      {incident.risk_score != null ? `${Number(incident.risk_score).toFixed(1)}/100` : '—'}
                    </span>
                  }
                />
                <HeaderFact
                  label="Confidence"
                  value={confidence != null ? `${confidence}%` : 'Not Available'}
                  className={confidence != null ? '' : 'text-zinc-500'}
                />
                <HeaderFact label="Threat Type" value={(incident.incident_type || '').toUpperCase()} />
                <HeaderFact
                  label="Last Updated"
                  value={<span title={new Date(updated).toLocaleString()}>{relativeTime(updated)}</span>}
                />
              </div>
              <p
                className="truncate border-t border-white/5 px-4 py-2 font-mono text-[12.5px] text-zinc-500"
                title={incident.raw_content}
              >
                {incident.raw_content}
              </p>
            </section>

            <CrimeGPTModule
              incident={incident}
              meta={meta}
              entities={caseData.entities}
              related={caseData.related}
              caseId={caseId}
              confidence={confidence}
            />
          </>
        )}
      </div>
    </div>
  )
}
