import { useEffect, useRef, useState } from 'react'
import { PenLine, Sparkles, Loader2, ArrowRight, Save, Check } from 'lucide-react'
import { setNarrative, setEntities, getCase, addDiaryEntry } from '../../lib/crimegptStore'
import { extractEntitiesAI } from '../../api/crimegpt'
import { ENTITY_LABELS } from '../../lib/crimegptContext'

/**
 * Investigation Narrative editor. Officers write/update the case narrative;
 * it is saved (debounced) to the single-source-of-truth store so every
 * document and the assistant immediately see the latest text. "Analyze"
 * runs AI entity extraction over the narrative and merges results into the
 * entity workbench.
 */
export default function NarrativeEditor({ incidentId, caseId, crimeCase, onNavigate }) {
  const [text, setText] = useState(crimeCase.narrative || '')
  const [saved, setSaved] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [lastExtract, setLastExtract] = useState(null)
  const [error, setError] = useState('')
  const timer = useRef(null)

  // Debounced persistence to the store.
  useEffect(() => {
    setSaved(false)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setNarrative(incidentId, text)
      setSaved(true)
    }, 600)
    return () => clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const chars = text.length

  const analyze = async () => {
    if (!text.trim()) {
      setError('Write some narrative text before analyzing.')
      return
    }
    setAnalyzing(true)
    setError('')
    try {
      // Persist immediately so the analysis matches what is stored.
      setNarrative(incidentId, text)
      const res = await extractEntitiesAI({ narrative: text, incidentId, caseId })
      const extracted = res.entities || {}
      // Merge extracted entities into any existing reviewed entities (union).
      const current = getCase(incidentId).entities || {}
      const merged = {}
      for (const key of Object.keys(ENTITY_LABELS)) {
        const a = current[key] || []
        const b = extracted[key] || []
        merged[key] = [...new Set([...a, ...b])]
      }
      setEntities(incidentId, merged)
      const total = Object.values(extracted).reduce((s, arr) => s + (arr?.length || 0), 0)
      setLastExtract({ total, source: res.source })
      addDiaryEntry(incidentId, { kind: 'event', auto: true, text: `Narrative analyzed — ${total} entit${total === 1 ? 'y' : 'ies'} extracted.` })
    } catch {
      setError('Entity analysis failed. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <PenLine size={16} className="text-purple-400" /> Investigation Narrative
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
            {saved ? <><Check size={12} className="text-emerald-400" /> Saved</> : <><Save size={12} /> Saving…</>}
          </span>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={14}
          placeholder="Record the investigation narrative — what happened, how the offence was committed, actions taken, victims and suspects, evidence collected, and observations. CrimeGPT reads this text (plus the detection and threat-intelligence data already on the case) to extract entities, suggest legal sections and draft documents."
          className="w-full resize-y rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-3 text-sm leading-relaxed text-slate-200 placeholder:text-slate-600 focus:border-purple-600 focus:outline-none"
        />

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] text-slate-500">{words} words · {chars} characters</div>
          <div className="flex items-center gap-2">
            {lastExtract && (
              <span className="text-[11px] text-slate-400">
                Last analysis: {lastExtract.total} entities
                {lastExtract.source !== 'ai' ? ' (AI unavailable)' : ''}
              </span>
            )}
            <button
              onClick={analyze}
              disabled={analyzing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
            >
              {analyzing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} className="text-purple-300" />}
              Analyze narrative
            </button>
            <button
              onClick={() => onNavigate('entities')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-purple-500"
            >
              Review entities <ArrowRight size={13} />
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-[11px] text-red-400">{error}</p>}
      </div>

      <p className="px-1 text-xs text-slate-600">
        The narrative is the single source of truth: edits here flow into extracted entities, legal
        recommendations, every generated document and the legal assistant.
      </p>
    </div>
  )
}
