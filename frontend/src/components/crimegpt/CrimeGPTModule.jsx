import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  LayoutDashboard, PenLine, Boxes, Scale, Gavel, FileText, BookText, MessageSquareText,
} from 'lucide-react'
import { useCrimeGPT, getCase, setEntities, logDiaryOnce } from '../../lib/crimegptStore'
import { buildCrimeContext, seedEntitiesFromWorkspace } from '../../lib/crimegptContext'
import { deriveCaseId } from '../../lib/caseHelpers'
import AiSafetyNote from './AiSafetyNote'
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
        `Threat detected by CyberAid — ${incident.incident_type}, risk ${incident.risk_score != null ? Number(incident.risk_score).toFixed(0) : 'N/A'}/100, level ${incident.threat_level || 'N/A'}.`,
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
    <div className="flex flex-col gap-3">
      {/* Sub navigation — sticky so the AI-safety reminder stays visible */}
      <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-white/10 bg-[#111722]/88 px-2 py-1.5 backdrop-blur-md">
        <div className="flex min-w-0 flex-1 flex-wrap gap-0.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={tab === id}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium transition ${
                tab === id
                  ? 'bg-white/8 text-cyan-200'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
              }`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
        <AiSafetyNote className="shrink-0 pr-1" />
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
