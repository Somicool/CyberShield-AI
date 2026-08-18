import { useState } from 'react'
import { Bot, User, Copy, Check, RefreshCw, Database } from 'lucide-react'
import Markdown from './Markdown'
import { SOURCE_LABELS } from '../../lib/copilotContext'

const CONF_STYLE = {
  High: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  Medium: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  Low: 'bg-slate-500/15 text-slate-400 border-slate-500/40',
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1 py-1" aria-label="Copilot is typing">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500" style={{ animationDelay: `${i * 150}ms` }} />
      ))}
    </span>
  )
}

/**
 * A single chat message. Officer messages are simple right-aligned bubbles;
 * Copilot messages render Markdown plus a metadata footer (data sources used,
 * grounding confidence, timestamp) with copy + regenerate controls.
 */
export default function ChatMessage({ message, streaming, canRegenerate, onRegenerate }) {
  const [copied, setCopied] = useState(false)
  const isOfficer = message.role === 'officer'

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  if (isOfficer) {
    return (
      <div className="flex justify-end gap-3">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm border border-purple-700/40 bg-purple-600/20 px-4 py-2.5 text-sm text-slate-100">
          {message.content}
        </div>
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800/75 text-slate-300">
          <User size={15} />
        </span>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-purple-500/40 bg-purple-500/10 text-purple-300">
        <Bot size={15} />
      </span>
      <div className="min-w-0 max-w-[85%] flex-1">
        <div className="rounded-2xl rounded-tl-sm border border-slate-800 bg-slate-900/80 px-4 py-3">
          {message.content ? <Markdown>{message.content}</Markdown> : <TypingDots />}
          {streaming && message.content && (
            <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-purple-400 align-middle" />
          )}
        </div>

        {!streaming && message.content && (
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12.5px] text-slate-500">
            {message.sources?.length > 0 && (
              <span className="inline-flex flex-wrap items-center gap-1">
                <Database size={11} />
                {message.sources.map((s) => (
                  <span key={s} className="rounded border border-slate-700 bg-slate-800/75 px-1.5 py-0.5 text-slate-400">
                    {SOURCE_LABELS[s] || s}
                  </span>
                ))}
              </span>
            )}
            {message.confidence && (
              <span className={`rounded border px-1.5 py-0.5 font-medium ${CONF_STYLE[message.confidence] || CONF_STYLE.Low}`}>
                {message.confidence} grounding
              </span>
            )}
            {message.ts && <span>{new Date(message.ts).toLocaleTimeString()}</span>}
            <button onClick={copy} className="inline-flex items-center gap-1 hover:text-slate-300">
              {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            {canRegenerate && (
              <button onClick={onRegenerate} className="inline-flex items-center gap-1 hover:text-slate-300">
                <RefreshCw size={11} /> Regenerate
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
