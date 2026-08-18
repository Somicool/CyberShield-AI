import { useState } from 'react'
import { Boxes, Plus, X, Check, Loader2, Sparkles } from 'lucide-react'
import { updateEntityCategory, setEntities, getCase, EMPTY_ENTITIES } from '../../lib/crimegptStore'
import { ENTITY_LABELS } from '../../lib/crimegptContext'
import { extractEntitiesAI } from '../../api/crimegpt'

function CategoryCard({ label, values, onAdd, onRemove }) {
  const [input, setInput] = useState('')
  const add = () => {
    const v = input.trim()
    if (!v) return
    if (!values.includes(v)) onAdd(v)
    setInput('')
  }
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/75 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
        <span className="rounded border border-slate-700 bg-slate-800/75 px-1.5 py-0.5 text-[11.5px] text-slate-400">{values.length}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800/75 px-2 py-0.5 text-xs text-slate-200">
            <span className="max-w-[180px] truncate">{v}</span>
            <button onClick={() => onRemove(v)} className="text-slate-500 hover:text-red-400" aria-label={`Remove ${v}`}>
              <X size={11} />
            </button>
          </span>
        ))}
        {values.length === 0 && <span className="text-[12.5px] text-slate-600">None</span>}
      </div>
      <div className="mt-2 flex items-center gap-1">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder={`Add ${label.toLowerCase()}`}
          className="flex-1 rounded border border-slate-800 bg-slate-950/78 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:border-purple-600 focus:outline-none"
        />
        <button onClick={add} className="rounded border border-slate-700 bg-slate-800/75 p-1 text-slate-300 hover:bg-slate-700" aria-label="Add">
          <Plus size={13} />
        </button>
      </div>
    </div>
  )
}

/**
 * Intelligent Entity Extraction workbench. Shows every entity category,
 * pre-populated from the workspace + AI extraction, and lets officers add or
 * remove values before finalizing. All edits write to the single source of
 * truth so downstream documents stay in sync.
 */
export default function EntityWorkbench({ incidentId, caseId, crimeCase }) {
  const [reextracting, setReextracting] = useState(false)
  const entities = crimeCase.entities || EMPTY_ENTITIES
  const finalized = crimeCase.entitiesFinalized

  const reextract = async () => {
    const narrative = getCase(incidentId).narrative || ''
    if (!narrative.trim()) return
    setReextracting(true)
    try {
      const res = await extractEntitiesAI({ narrative, incidentId, caseId })
      const extracted = res.entities || {}
      const merged = {}
      for (const key of Object.keys(ENTITY_LABELS)) {
        merged[key] = [...new Set([...(entities[key] || []), ...(extracted[key] || [])])]
      }
      setEntities(incidentId, merged)
    } finally {
      setReextracting(false)
    }
  }

  const total = Object.values(entities).reduce((s, a) => s + (a?.length || 0), 0)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/72 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Boxes size={16} className="text-purple-400" /> Extracted Entities
          <span className="text-xs font-normal text-slate-500">· {total} total · {finalized ? 'finalized' : 'draft'}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reextract}
            disabled={reextracting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/75 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          >
            {reextracting ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} className="text-purple-300" />}
            Re-extract from narrative
          </button>
          <button
            onClick={() => setEntities(incidentId, entities, { finalized: !finalized })}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
              finalized ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'bg-purple-600 text-white hover:bg-purple-500'
            }`}
          >
            <Check size={13} /> {finalized ? 'Finalized' : 'Finalize entities'}
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Object.entries(ENTITY_LABELS).map(([key, label]) => (
          <CategoryCard
            key={key}
            label={label}
            values={entities[key] || []}
            onAdd={(v) => updateEntityCategory(incidentId, key, [...(entities[key] || []), v])}
            onRemove={(v) => updateEntityCategory(incidentId, key, (entities[key] || []).filter((x) => x !== v))}
          />
        ))}
      </div>
    </div>
  )
}
