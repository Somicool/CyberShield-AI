import { useState } from 'react'
import { Scale, Loader2, Plus, Check, X, Pencil, ShieldAlert } from 'lucide-react'
import { suggestLegalSections } from '../../api/crimegpt'
import { setLegalSections, addDiaryEntry } from '../../lib/crimegptStore'

const ACT_TONE = {
  BNS: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
  BNSS: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  BSA: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  'IT Act': 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  Other: 'border-slate-600 bg-slate-700/30 text-slate-300',
}

function conf(v) {
  return Math.round((v || 0) * 100)
}

function key(s) {
  return `${s.act}::${s.section}`
}

function ConfidenceBar({ value }) {
  const pct = conf(value)
  const tone = pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-slate-500'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-800/75">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[12.5px] text-slate-500">{pct}%</span>
    </div>
  )
}

/**
 * Legal Recommendation Engine — suggests applicable BNS / BNSS / BSA / IT Act
 * provisions from the investigation context. Officers accept suggestions into
 * the case (stored as the single source of truth, reused by documents) and can
 * modify the title/reason of accepted sections.
 */
export default function LegalRecommendations({ incidentId, caseId, context, crimeCase, noteAi }) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [disclaimer, setDisclaimer] = useState('')
  const [editing, setEditing] = useState(null) // key being edited

  const accepted = crimeCase.legalSections || []
  const acceptedKeys = new Set(accepted.map(key))

  const fetchSuggestions = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await suggestLegalSections({ context, incidentId, caseId })
      setSuggestions(res.sections || [])
      setDisclaimer(res.disclaimer || '')
      noteAi?.(res.source)
      addDiaryEntry(incidentId, { kind: 'event', auto: true, text: `Legal recommendation engine suggested ${res.sections?.length || 0} sections.` })
    } catch {
      setError('Could not fetch legal recommendations. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const accept = (s) => {
    if (acceptedKeys.has(key(s))) return
    setLegalSections(incidentId, [...accepted, { ...s }])
  }

  const remove = (s) => {
    setLegalSections(incidentId, accepted.filter((a) => key(a) !== key(s)))
  }

  const saveEdit = (k, patch) => {
    setLegalSections(incidentId, accepted.map((a) => (key(a) === k ? { ...a, ...patch } : a)))
    setEditing(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/72 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Scale size={16} className="text-purple-400" /> Legal Recommendation Engine
        </div>
        <button
          onClick={fetchSuggestions}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-purple-500 disabled:opacity-50"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Scale size={13} />}
          {suggestions.length ? 'Regenerate suggestions' : 'Suggest applicable sections'}
        </button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Accepted sections */}
      {accepted.length > 0 && (
        <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/10 p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-300">
            <Check size={15} /> Accepted for this case ({accepted.length})
          </h3>
          <div className="space-y-2">
            {accepted.map((s) => (
              <div key={key(s)} className="rounded-lg border border-slate-800 bg-slate-900/72 p-3">
                {editing === key(s) ? (
                  <EditForm section={s} onSave={(patch) => saveEdit(key(s), patch)} onCancel={() => setEditing(null)} />
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`rounded border px-1.5 py-0.5 text-[11.5px] font-medium ${ACT_TONE[s.act] || ACT_TONE.Other}`}>{s.act}</span>
                        <span className="text-sm font-medium text-slate-100">Section {s.section} — {s.title}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{s.reason}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button onClick={() => setEditing(key(s))} className="rounded p-1 text-slate-500 hover:bg-slate-800/75 hover:text-slate-200" aria-label="Modify"><Pencil size={13} /></button>
                      <button onClick={() => remove(s)} className="rounded p-1 text-slate-500 hover:bg-slate-800/75 hover:text-red-400" aria-label="Remove"><X size={13} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-300">Suggestions</h3>
          {suggestions.map((s) => {
            const isAccepted = acceptedKeys.has(key(s))
            return (
              <div key={key(s)} className="flex items-start justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/75 p-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded border px-1.5 py-0.5 text-[11.5px] font-medium ${ACT_TONE[s.act] || ACT_TONE.Other}`}>{s.act}</span>
                    <span className="text-sm font-medium text-slate-100">Section {s.section} — {s.title}</span>
                    <ConfidenceBar value={s.confidence} />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{s.reason}</p>
                </div>
                <button
                  onClick={() => accept(s)}
                  disabled={isAccepted}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                    isAccepted ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'bg-purple-600 text-white hover:bg-purple-500'
                  }`}
                >
                  {isAccepted ? <><Check size={13} /> Accepted</> : <><Plus size={13} /> Accept</>}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {(disclaimer || suggestions.length > 0 || accepted.length > 0) && (
        <p className="flex items-start gap-1.5 rounded-lg border border-amber-800/40 bg-amber-950/10 px-3 py-2 text-[12.5px] text-amber-300/90">
          <ShieldAlert size={13} className="mt-0.5 shrink-0" />
          {disclaimer || 'AI-suggested provisions are decision-support only and must be verified by the investigating officer and legal advisor.'}
        </p>
      )}
    </div>
  )
}

function EditForm({ section, onSave, onCancel }) {
  const [title, setTitle] = useState(section.title || '')
  const [reason, setReason] = useState(section.reason || '')
  return (
    <div className="space-y-2">
      <div className="text-xs text-slate-500">{section.act} · Section {section.section}</div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded border border-slate-800 bg-slate-950/78 px-2 py-1 text-sm text-slate-200 focus:border-purple-600 focus:outline-none" placeholder="Title" />
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="w-full resize-y rounded border border-slate-800 bg-slate-950/78 px-2 py-1 text-xs text-slate-300 focus:border-purple-600 focus:outline-none" placeholder="Reason" />
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="rounded border border-slate-700 bg-slate-800/75 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700">Cancel</button>
        <button onClick={() => onSave({ title, reason })} className="rounded bg-purple-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-purple-500">Save</button>
      </div>
    </div>
  )
}
