/**
 * Conversation history for the Copilot, persisted in localStorage.
 *
 * Chat transcripts are a client-side concern (not backend data), so they live
 * here until/if a conversation-persistence API is added. Modular by design:
 * swap these functions for network calls without touching the UI.
 */
const KEY = 'cybershield.copilot.conversations.v1'

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || []
  } catch {
    return []
  }
}

function persist(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* storage unavailable — session-only */
  }
}

export function listConversations() {
  return load().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
}

export function getConversation(id) {
  return load().find((c) => c.id === id) || null
}

export function createConversation(investigationId = null) {
  const conv = {
    id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: 'New conversation',
    investigationId,
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  persist([conv, ...load()])
  return conv
}

export function saveConversation(conv) {
  const list = load()
  const idx = list.findIndex((c) => c.id === conv.id)
  const updated = { ...conv, updatedAt: new Date().toISOString() }
  if (idx >= 0) list[idx] = updated
  else list.unshift(updated)
  persist(list)
  return updated
}

export function deleteConversation(id) {
  persist(load().filter((c) => c.id !== id))
}

/** Derive a short title from the first officer message. */
export function titleFrom(messages) {
  const first = messages.find((m) => m.role === 'officer')
  if (!first) return 'New conversation'
  return first.content.slice(0, 40) + (first.content.length > 40 ? '…' : '')
}
