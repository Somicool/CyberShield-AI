import { useState } from 'react'
import { SendHorizonal, Square } from 'lucide-react'

/**
 * Message composer. Enter sends, Shift+Enter inserts a newline. Shows a Stop
 * control while a response is streaming.
 */
export default function ChatComposer({ onSend, onStop, streaming, disabled }) {
  const [text, setText] = useState('')

  const send = () => {
    const t = text.trim()
    if (!t || streaming) return
    onSend(t)
    setText('')
  }

  return (
    <div className="flex items-end gap-2 border-t border-slate-800 bg-slate-950 p-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            send()
          }
        }}
        rows={1}
        disabled={disabled}
        placeholder={disabled ? 'Select an investigation or ask a general question…' : 'Ask about this investigation…'}
        className="max-h-40 min-h-[42px] flex-1 resize-y rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 focus:border-purple-600 focus:outline-none"
      />
      {streaming ? (
        <button
          onClick={onStop}
          className="inline-flex h-[42px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-4 text-sm text-slate-200 hover:bg-slate-700"
        >
          <Square size={14} /> Stop
        </button>
      ) : (
        <button
          onClick={send}
          disabled={!text.trim()}
          className="inline-flex h-[42px] items-center gap-1.5 rounded-lg bg-purple-600 px-4 text-sm font-medium text-white transition hover:bg-purple-500 disabled:opacity-50"
        >
          <SendHorizonal size={15} /> Send
        </button>
      )}
    </div>
  )
}
