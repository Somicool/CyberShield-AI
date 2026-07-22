import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  LayoutDashboard, PenLine, Boxes, Scale, Gavel, FileText, BookText, MessageSquareText,
} from 'lucide-react'
import { useCrimeGPT, getCase, setEntities, logDiaryOnce } from '../../lib/crimegptStore'
import { buildCrimeContext, seedEntitiesFromWorkspace } from '../../lib/crimegptContext'
import { deriveCaseId } from '../../lib/caseHelpers'
import CrimeGPTDashboard from './CrimeGPTDashboard'
import NarrativeEditor from './NarrativeEditor'
import EntityWorkbench from './EntityWorkbench'
import LegalRecommendations from './LegalRecommendations'
import CaseLawSuggestions from './CaseLawSuggestions'
import DocumentGenerator from './DocumentGenerator'
import CaseDiary from './CaseDiary'
import LegalAssistant from './LegalAssistant'

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'narrative', label: 'Narrative', icon: PenLine },
  { id: 'entities', label: 'Entities', icon: Boxes },
  { id: 'legal', label: 'Legal Sections', icon: Scale },
  { id: 'caselaw', label: 'Case Law', icon: Gavel },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'diary', label: 'Case Diary', icon: BookText },
  { id: 'assistant', label: 'Legal Assistant', icon: MessageSquareText },
]

/**
 * CrimeGPT — the integrated legal-intelligence module for the Investigation
 * Workspace. It consumes the SAME data the workspace already loaded (incident,
 * graph entities, related cases, workflow meta) plus its own case record
 * (narrative, reviewed entities, accepted legal, documents, diary) via the
 * crimegptStore. buildCrimeContext is the single source of truth every AI
 * feature reads, so editing the narrative or an entity updates every document
 * and assistant answer without duplicate entry.
 */
export default function CrimeGPTModule({ incident, meta, entities, related, caseId, confidence }) {
  useCrimeGPT() // re-render on store changes
  const [tab, setTab] = useState('dashboard')
  const [aiStatus, setAiStatus] = useState('ready') // ready | online | fallback

  const incidentId = incident.id
  const crimeCase = getCase(incidentId)

  // Seed the entity workbench from the workspace-extracted entities once.
  useEffect(() => {
    const c = getCase(incidentId)
    if (c.entities == null) {
      setEntities(incidentId, seedEntitiesFromWorkspace(entities))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentId])

  // Auto case-diary events derived from the investigation (recorded once).
  useEffect(() => {
    const cid = deriveCaseId(incident)
    logDiaryOnce(incidentId, 'opened', `CrimeGPT opened for ${cid}.`)
    if (incident.created_at) {
      logDiaryOnce(
        incidentId,
        'detected',
        `Threat detected by CyberShield AI — ${incident.incident_type}, risk ${incident.risk_score != null ? Number(incident.risk_score).toFixed(0) : 'N/A'}/100, level ${incident.threat_level || 'N/A'}.`,
        incident.created_at,
      )
    }
    if (incident.investigation_data?.investigation) {
      logDiaryOnce(incidentId, 'intel', 'Threat intelligence (WHOIS/DNS/SSL/GeoIP) collected for the case.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentId, incident.investigation_data])

  const context = useMemo(
    () => buildCrimeContext({ incident, caseId, meta, entities, related, crimeCase }),
    [incident, caseId, meta, entities, related, crimeCase],
  )

  const noteAi = useCallback((source) => {
    if (source === 'ai') setAiStatus('online')
    else if (source === 'fallback') setAiStatus('fallback')
  }, [])

  const shared = { incident, incidentId, caseId, meta, context, crimeCase, noteAi }

  return (
    <div className="space-y-4">
      {/* Module header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-purple-700/40 bg-linear-to-r from-purple-950/40 to-slate-900/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-purple-500/40 bg-purple-500/10 text-purple-300">
            <Scale size={20} />
          </span>
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-100">CrimeGPT</h2>
            <p className="text-xs text-slate-500">
              Legal intelligence · document drafting · case diary — grounded in this investigation
            </p>
          </div>
        </div>
        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[11px] text-amber-300">
          AI decision-support — verify before official use
        </span>
      </div>

      {/* Sub navigation */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-800 bg-slate-900/40 p-1.5">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
              tab === id ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Active panel */}
      {tab === 'dashboard' && (
        <CrimeGPTDashboard {...shared} confidence={confidence} aiStatus={aiStatus} onNavigate={setTab} />
      )}
      {tab === 'narrative' && <NarrativeEditor {...shared} onNavigate={setTab} />}
      {tab === 'entities' && <EntityWorkbench {...shared} />}
      {tab === 'legal' && <LegalRecommendations {...shared} />}
      {tab === 'caselaw' && <CaseLawSuggestions {...shared} />}
      {tab === 'documents' && <DocumentGenerator {...shared} />}
      {tab === 'diary' && <CaseDiary {...shared} />}
      {tab === 'assistant' && <LegalAssistant {...shared} />}
    </div>
  )
}
