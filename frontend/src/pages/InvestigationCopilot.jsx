import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Bot, PanelRight, Eraser, Download, ShieldCheck, Boxes } from 'lucide-react'
import { getIncident, getGraphConnections, listIncidents } from '../api/incidents'
import { streamCopilot } from '../api/copilot'
import { getCaseMeta } from '../lib/caseWorkflow'
import { deriveCaseId, domainForIncident } from '../lib/caseHelpers'
import { extractEntities } from '../lib/entities'
import {
  buildContextString,
  investigationSources,
  groundingConfidence,
  suggestionsFor,
} from '../lib/copilotContext'
import {
  listConversations,
  getConversation,
  createConversation,
  saveConversation,
  deleteConversation,
  titleFrom,
} from '../lib/conversations'
import ConversationSidebar from '../components/copilot/ConversationSidebar'
import ChatMessage from '../components/copilot/ChatMessage'
import ChatComposer from '../components/copilot/ChatComposer'
import ContextPanel from '../components/copilot/ContextPanel'
import QuickActions from '../components/copilot/QuickActions'
import PlannedModules from '../components/copilot/PlannedModules'
import Section from '../components/investigation/Section'

const GENERAL_SUGGESTIONS = [
  { label: 'What can you help with?', prompt: 'What can you help me with as an investigation copilot?' },
  { label: 'Select an investigation', prompt: 'How do I load an investigation into context?' },
]

/**
 * AI Investigation Copilot — a context-aware assistant over real CyberShield
 * data. Investigation context is assembled from existing APIs and streamed to
 * the shared Gemini backend; the model is instructed to use only that data.
 */
export default function InvestigationCopilot() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [convs, setConvs] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])
  const [investigationId, setInvestigationId] = useState(null)

  const [context, setContext] = useState(null)
  const [loadingContext, setLoadingContext] = useState(false)
  const [incidents, setIncidents] = useState([])

  const [streaming, setStreaming] = useState(false)
  const [contextOpen, setContextOpen] = useState(true)
  const abortRef = useRef(null)
  const scrollRef = useRef(null)
  const createdAtRef = useRef(new Date().toISOString())

  const refreshConvs = useCallback(() => setConvs(listConversations()), [])

  // ---- bootstrap ----------------------------------------------------------
  useEffect(() => {
    listIncidents({ page: 1, pageSize: 100 }).then((d) => setIncidents(d.items || [])).catch(() => {})
    const existing = listConversations()
    if (existing.length) {
      const first = existing[0]
      setActiveId(first.id)
      setMessages(first.messages || [])
      setInvestigationId(first.investigationId || null)
      createdAtRef.current = first.createdAt
    } else {
      const conv = createConversation(searchParams.get('investigation') || null)
      setActiveId(conv.id)
      setInvestigationId(conv.investigationId)
      createdAtRef.current = conv.createdAt
    }
    refreshConvs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- load investigation context ----------------------------------------
  const loadContext = useCallback(async (incidentId) => {
    if (!incidentId) {
      setContext(null)
      return
    }
    setLoadingContext(true)
    try {
      const det = await getIncident(incidentId)
      const entities = extractEntities(det)
      const linkedCount = Object.values(entities).reduce((s, a) => s + a.length, 0)

      let related = []
      const dom = domainForIncident(det)
      if (dom) {
        try {
          const data = await getGraphConnections('Domain', dom)
          const byInc = new Map()
          for (const c of data.connections || []) {
            const iid = c.via_incident_id
            if (!iid || iid === incidentId) continue
            if (!byInc.has(iid)) byInc.set(iid, [])
            byInc.get(iid).push(c)
          }
          const ids = [...byInc.keys()].slice(0, 6)
          const sums = await Promise.all(ids.map((i) => getIncident(i).catch(() => null)))
          related = ids.map((iid, idx) => {
            const conns = byInc.get(iid)
            const shared = { Domain: [dom], Wallet: [], Email: [], TelegramHandle: [], Phone: [] }
            for (const c of conns) if (shared[c.type] && c.properties?.value) shared[c.type].push(c.properties.value)
            const s = sums[idx]
            return {
              incidentId: iid,
              caseId: s ? deriveCaseId(s) : `CASE-${String(iid).slice(0, 6)}`,
              similarity: Math.min(99, 55 + (1 + conns.length) * 12),
              shared,
            }
          })
        } catch {
          /* graph optional */
        }
      }

      const meta = getCaseMeta(incidentId)
      const sources = investigationSources(det, related, meta)
      const caseId = deriveCaseId(det)
      setContext({
        incident: det,
        caseId,
        meta,
        entities,
        related,
        linkedCount,
        sources,
        contextString: buildContextString({ incident: det, caseId, meta, entities, related }),
      })
    } catch {
      setContext(null)
    } finally {
      setLoadingContext(false)
    }
  }, [])

  useEffect(() => {
    loadContext(investigationId)
  }, [investigationId, loadContext])

  // ---- persistence --------------------------------------------------------
  useEffect(() => {
    if (!activeId || messages.length === 0) return
    saveConversation({
      id: activeId,
      title: titleFrom(messages),
      investigationId,
      messages,
      createdAt: createdAtRef.current,
    })
    setConvs(listConversations())
  }, [messages, activeId, investigationId])

  // ---- auto-scroll --------------------------------------------------------
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, streaming])

  // ---- send / stream ------------------------------------------------------
  const runStream = useCallback(
    async (history) => {
      setStreaming(true)
      const controller = new AbortController()
      abortRef.current = controller
      try {
        await streamCopilot({
          context: context?.contextString || null,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          signal: controller.signal,
          onChunk: (full) => {
            setMessages((prev) => {
              const c = [...prev]
              c[c.length - 1] = { ...c[c.length - 1], content: full }
              return c
            })
          },
        })
      } catch (e) {
        if (e.name !== 'AbortError') {
          setMessages((prev) => {
            const c = [...prev]
            c[c.length - 1] = { ...c[c.length - 1], content: 'I could not complete that response. Please try again.' }
            return c
          })
        }
      } finally {
        setStreaming(false)
        setMessages((prev) => {
          const c = [...prev]
          const last = { ...c[c.length - 1] }
          last.ts = new Date().toISOString()
          last.sources = context ? Object.keys(context.sources).filter((k) => context.sources[k]) : []
          last.confidence = context ? groundingConfidence(context.sources) : 'Low'
          c[c.length - 1] = last
          return c
        })
      }
    },
    [context]
  )

  const send = useCallback(
    (prompt) => {
      if (streaming) return
      const officer = { role: 'officer', content: prompt, ts: new Date().toISOString() }
      const assistant = { role: 'assistant', content: '', ts: null }
      const history = [...messages, officer]
      setMessages([...history, assistant])
      runStream(history)
    },
    [messages, streaming, runStream]
  )

  const regenerate = useCallback(() => {
    if (streaming) return
    // Drop the last assistant message and re-run the previous officer prompt.
    let cut = messages.length - 1
    while (cut >= 0 && messages[cut].role !== 'assistant') cut--
    if (cut < 0) return
    const history = messages.slice(0, cut)
    setMessages([...history, { role: 'assistant', content: '', ts: null }])
    runStream(history)
  }, [messages, streaming, runStream])

  const stop = () => abortRef.current?.abort()

  // ---- conversation management -------------------------------------------
  const newConversation = () => {
    const conv = createConversation(investigationId)
    createdAtRef.current = conv.createdAt
    setActiveId(conv.id)
    setMessages([])
    refreshConvs()
  }

  const selectConversation = (id) => {
    const conv = getConversation(id)
    if (!conv) return
    setActiveId(id)
    setMessages(conv.messages || [])
    setInvestigationId(conv.investigationId || null)
    createdAtRef.current = conv.createdAt
  }

  const removeConversation = (id) => {
    deleteConversation(id)
    const remaining = listConversations()
    setConvs(remaining)
    if (id === activeId) {
      if (remaining.length) selectConversation(remaining[0].id)
      else newConversation()
    }
  }

  const changeInvestigation = (id) => {
    const next = id || null
    if (messages.length > 0 && next !== investigationId) {
      const ok = window.confirm('Switching investigations will start a new conversation. Continue?')
      if (!ok) return
      const conv = createConversation(next)
      createdAtRef.current = conv.createdAt
      setActiveId(conv.id)
      setMessages([])
      refreshConvs()
    }
    setInvestigationId(next)
  }

  const clearContext = () => {
    if (!investigationId) return
    if (messages.length > 0 && !window.confirm('Clear the investigation context for this conversation?')) return
    setInvestigationId(null)
  }

  const exportConversation = () => {
    if (messages.length === 0) return
    const md = messages
      .map((m) => `## ${m.role === 'officer' ? 'Officer' : 'AI Copilot'}${m.ts ? ` (${new Date(m.ts).toLocaleString()})` : ''}\n\n${m.content}`)
      .join('\n\n---\n\n')
    const blob = new Blob([`# CyberShield AI — Copilot Conversation\n\n${md}`], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `copilot-conversation-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  // ---- derived ------------------------------------------------------------
  const suggestions = useMemo(() => (context ? suggestionsFor(context.sources) : GENERAL_SUGGESTIONS), [context])
  const lastIsAssistant = messages.length > 0 && messages[messages.length - 1].role === 'assistant'

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-300">
            <Bot size={20} />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">AI Investigation Copilot</h2>
            <p className="text-xs text-slate-500">Your intelligent cybercrime investigation assistant.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Investigation context"
            value={investigationId || ''}
            onChange={(e) => changeInvestigation(e.target.value)}
            className="max-w-[240px] rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-purple-600 focus:outline-none"
          >
            <option value="">No investigation</option>
            {incidents.map((i) => (
              <option key={i.id} value={i.id}>
                {deriveCaseId(i)} · {i.incident_type} · {i.raw_content.slice(0, 30)}
              </option>
            ))}
          </select>
          <button onClick={clearContext} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">
            <Eraser size={14} /> Clear Context
          </button>
          <button onClick={exportConversation} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">
            <Download size={14} /> Export
          </button>
          <button onClick={() => setContextOpen((o) => !o)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">
            <PanelRight size={14} /> Context
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[220px_1fr] xl:grid-cols-[220px_1fr_320px]">
        {/* conversation history */}
        <div className="hidden border-r border-slate-800 lg:block">
          <ConversationSidebar
            conversations={convs}
            activeId={activeId}
            onNew={newConversation}
            onSelect={selectConversation}
            onDelete={removeConversation}
          />
        </div>

        {/* chat column */}
        <div className="flex min-h-0 flex-col">
          {investigationId && (
            <div className="flex items-center gap-2 border-b border-emerald-800/40 bg-emerald-950/20 px-6 py-2 text-xs text-emerald-300">
              <ShieldCheck size={14} />
              Investigation Context Active{context ? ` · ${context.caseId}` : loadingContext ? ' · loading…' : ''}
            </div>
          )}

          <div className="border-b border-slate-800 px-6 py-3">
            <QuickActions onAction={send} disabled={!investigationId || streaming} />
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {messages.length === 0 ? (
              <div className="mx-auto mt-10 max-w-md text-center">
                <Bot size={30} className="mx-auto text-slate-700" />
                <p className="mt-3 text-sm text-slate-400">
                  Select an investigation to activate Investigation Mode, then ask a question or use a quick action.
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  The Copilot answers only from real CyberShield data and states when information is unavailable.
                </p>
              </div>
            ) : (
              messages.map((m, i) => (
                <ChatMessage
                  key={i}
                  message={m}
                  streaming={streaming && i === messages.length - 1}
                  canRegenerate={!streaming && i === messages.length - 1 && m.role === 'assistant'}
                  onRegenerate={regenerate}
                />
              ))
            )}

            {/* smart suggestions */}
            {lastIsAssistant && !streaming && (
              <div className="flex flex-wrap gap-2 pl-11">
                {suggestions.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => send(s.prompt)}
                    className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-300 transition hover:border-purple-500/40 hover:bg-slate-800"
                  >
                    {s.label}
                  </button>
                ))}
                <button
                  onClick={() => investigationId && navigate(`/dashboard/investigate/${investigationId}`)}
                  disabled={!investigationId}
                  className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-300 transition hover:border-purple-500/40 hover:bg-slate-800 disabled:opacity-40"
                >
                  Open Investigation
                </button>
              </div>
            )}
          </div>

          <ChatComposer onSend={send} onStop={stop} streaming={streaming} disabled={false} />
        </div>

        {/* context panel */}
        {contextOpen && (
          <div className="hidden border-l border-slate-800 xl:block">
            <ContextPanel
              incident={context?.incident}
              caseId={context?.caseId}
              meta={context?.meta}
              sources={context?.sources || {}}
              relatedCount={context?.related?.length || 0}
              linkedCount={context?.linkedCount || 0}
              onCollapse={() => setContextOpen(false)}
            />
            <div className="border-t border-slate-800 p-4">
              <Section icon={Boxes} title="Future Modules" defaultOpen={false}>
                <PlannedModules />
              </Section>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
