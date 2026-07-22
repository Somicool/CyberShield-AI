import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageSquareText, ShieldCheck } from 'lucide-react'
import ChatMessage from '../copilot/ChatMessage'
import ChatComposer from '../copilot/ChatComposer'
import { streamLegalAssistant } from '../../api/crimegpt'

const SUGGESTIONS = [
  { label: 'Summarize investigation', prompt: 'Summarize this investigation for a case briefing.' },
  { label: 'Explain accepted sections', prompt: 'Explain the accepted legal sections and why they apply to this case.' },
  { label: 'Suggest next steps', prompt: 'What are the recommended next investigative steps for this case?' },
  { label: 'Draft FIR points', prompt: 'Draft the key points that should go into the FIR for this case.' },
  { label: 'Elements to prove', prompt: 'What are the legal elements we must prove for the applicable offences, and what evidence supports each?' },
]

/**
 * AI Legal Assistant — a context-aware chatbot that explains legal sections,
 * helps draft documents, summarizes the investigation, suggests next steps and
 * answers questions using the current investigation data. Grounded in the same
 * single-source-of-truth context as the rest of CrimeGPT and streamed from the
 * police-guarded backend.
 */
export default function LegalAssistant({ incidentId, caseId, context }) {
  const [messages, setMessages] = useState([])
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, streaming])

  const runStream = useCallback(
    async (history) => {
      setStreaming(true)
      const controller = new AbortController()
      abortRef.current = controller
      try {
        await streamLegalAssistant({
          context,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          incidentId,
          caseId,
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
          c[c.length - 1] = last
          return c
        })
      }
    },
    [context, incidentId, caseId],
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
    [messages, streaming, runStream],
  )

  const regenerate = useCallback(() => {
    if (streaming) return
    let cut = messages.length - 1
    while (cut >= 0 && messages[cut].role !== 'assistant') cut--
    if (cut < 0) return
    const history = messages.slice(0, cut)
    setMessages([...history, { role: 'assistant', content: '', ts: null }])
    runStream(history)
  }, [messages, streaming, runStream])

  const stop = () => abortRef.current?.abort()
  const lastIsAssistant = messages.length > 0 && messages[messages.length - 1].role === 'assistant'

  return (
    <div className="flex h-[70vh] min-h-[520px] flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
      <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-purple-500/40 bg-purple-500/10 text-purple-300">
          <MessageSquareText size={16} />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Legal Assistant</h3>
          <p className="text-[11px] text-slate-500">Grounded in this investigation · {caseId}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-emerald-800/40 bg-emerald-950/20 px-4 py-2 text-[11px] text-emerald-300">
        <ShieldCheck size={13} /> Investigation context active — answers use this case's real data and current Indian law.
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="mx-auto mt-8 max-w-md text-center">
            <MessageSquareText size={28} className="mx-auto text-slate-700" />
            <p className="mt-3 text-sm text-slate-400">Ask about legal sections, draft document points, summarize the case or plan next steps.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s.label} onClick={() => send(s.prompt)} className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-300 transition hover:border-purple-500/40 hover:bg-slate-800">
                  {s.label}
                </button>
              ))}
            </div>
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

        {lastIsAssistant && !streaming && (
          <div className="flex flex-wrap gap-2 pl-11">
            {SUGGESTIONS.map((s) => (
              <button key={s.label} onClick={() => send(s.prompt)} className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-300 transition hover:border-purple-500/40 hover:bg-slate-800">
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <ChatComposer onSend={send} onStop={stop} streaming={streaming} disabled={false} />
    </div>
  )
}
