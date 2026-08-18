import { useState } from 'react'
import { Gavel, Loader2, Plus, Check, X, ShieldAlert, Landmark } from 'lucide-react'
import { suggestCaseLaw } from '../../api/crimegpt'
import { setCaseLaw, addDiaryEntry } from '../../lib/crimegptStore'

function key(c) {
  return `${c.name}::${c.year}`
}

/**
 * Case Law Suggestions — recommends landmark Indian judgments relevant to the
 * investigation, each with court, year, summary and relevance. Officers pin
 * relevant judgments to the case. Always carries the verify-with-officer
 * disclaimer.
 */
export default function CaseLawSuggestions({ incidentId, caseId, context, crimeCase, noteAi }) {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [disclaimer, setDisclaimer] = useState('')

  const pinned = crimeCase.caseLaw || []
  const pinnedKeys = new Set(pinned.map(key))

  const fetchCases = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await suggestCaseLaw({ context, incidentId, caseId })
      setCases(res.cases || [])
      setDisclaimer(res.disclaimer || '')
      noteAi?.(res.source)
      addDiaryEntry(incidentId, { kind: 'event', auto: true, text: `Case-law research returned ${res.cases?.length || 0} judgments.` })
    } catch {
      setError('Could not fetch case-law suggestions. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const pin = (c) => {
    if (pinnedKeys.has(key(c))) return
    setCaseLaw(incidentId, [...pinned, c])
  }
  const unpin = (c) => setCaseLaw(incidentId, pinned.filter((p) => key(p) !== key(c)))

  const Card = ({ c, actionAccepted, onAction }) => (
    <div className="rounded-lg border border-slate-800 bg-slate-900/75 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Landmark size={14} className="shrink-0 text-purple-300" />
            <span className="text-sm font-medium text-slate-100">{c.name}</span>
          </div>
          <div className="mt-0.5 text-[12.5px] text-slate-500">{c.court}{c.year ? ` · ${c.year}` : ''}</div>
        </div>
        <button
          onClick={() => onAction(c)}
          disabled={actionAccepted}
          className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
            actionAccepted ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'bg-purple-600 text-white hover:bg-purple-500'
          }`}
        >
          {actionAccepted ? <><Check size={13} /> Pinned</> : <><Plus size={13} /> Pin</>}
        </button>
      </div>
      {c.summary && <p className="mt-2 text-xs text-slate-400">{c.summary}</p>}
      {c.relevance && <p className="mt-1 text-xs text-slate-500"><span className="text-slate-400">Relevance:</span> {c.relevance}</p>}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/72 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Gavel size={16} className="text-purple-400" /> Case Law Suggestions
        </div>
        <button
          onClick={fetchCases}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-purple-500 disabled:opacity-50"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Gavel size={13} />}
          {cases.length ? 'Regenerate' : 'Find relevant judgments'}
        </button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {pinned.length > 0 && (
        <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/10 p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-300">
            <Check size={15} /> Pinned to case ({pinned.length})
          </h3>
          <div className="space-y-2">
            {pinned.map((c) => (
              <div key={key(c)} className="rounded-lg border border-slate-800 bg-slate-900/72 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Landmark size={14} className="shrink-0 text-purple-300" />
                      <span className="text-sm font-medium text-slate-100">{c.name}</span>
                    </div>
                    <div className="mt-0.5 text-[12.5px] text-slate-500">{c.court}{c.year ? ` · ${c.year}` : ''}</div>
                    {c.relevance && <p className="mt-1 text-xs text-slate-500">{c.relevance}</p>}
                  </div>
                  <button onClick={() => unpin(c)} className="rounded p-1 text-slate-500 hover:bg-slate-800/75 hover:text-red-400" aria-label="Unpin"><X size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {cases.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-300">Suggested judgments</h3>
          {cases.map((c) => (
            <Card key={key(c)} c={c} actionAccepted={pinnedKeys.has(key(c))} onAction={pin} />
          ))}
        </div>
      )}

      {(disclaimer || cases.length > 0 || pinned.length > 0) && (
        <p className="flex items-start gap-1.5 rounded-lg border border-amber-800/40 bg-amber-950/10 px-3 py-2 text-[12.5px] text-amber-300/90">
          <ShieldAlert size={13} className="mt-0.5 shrink-0" />
          {disclaimer || 'AI-recommended judgments are research pointers only. Verify every citation and its current standing before relying on it.'}
        </p>
      )}
    </div>
  )
}
