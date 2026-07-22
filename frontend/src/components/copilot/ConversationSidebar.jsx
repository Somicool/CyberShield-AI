import { Plus, MessageSquare, Trash2 } from 'lucide-react'

/**
 * Conversation history sidebar. Conversations persist in localStorage
 * (see lib/conversations.js).
 */
export default function ConversationSidebar({ conversations, activeId, onNew, onSelect, onDelete }) {
  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <button
          onClick={onNew}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-purple-500"
        >
          <Plus size={15} /> New Conversation
        </button>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-2">
        {conversations.length === 0 ? (
          <p className="px-2 py-3 text-xs text-slate-600">No conversations yet.</p>
        ) : (
          conversations.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition ${
                c.id === activeId ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:bg-slate-900'
              }`}
            >
              <button onClick={() => onSelect(c.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <MessageSquare size={14} className="shrink-0 text-slate-500" />
                <span className="truncate">{c.title}</span>
              </button>
              <button
                onClick={() => onDelete(c.id)}
                aria-label="Delete conversation"
                className="shrink-0 text-slate-600 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
