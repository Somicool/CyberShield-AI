/**
 * CrimeGPT API client. All endpoints are police-guarded on the backend and
 * reuse the shared /api proxy + JWT (via the axios client or fetch for
 * streaming, mirroring the Copilot pattern).
 */
import apiClient from './client'

export async function suggestLegalSections({ context, incidentId, caseId }) {
  const { data } = await apiClient.post('/crimegpt/legal', {
    context,
    incident_id: incidentId,
    case_id: caseId,
  })
  return data
}

export async function suggestCaseLaw({ context, incidentId, caseId }) {
  const { data } = await apiClient.post('/crimegpt/caselaw', {
    context,
    incident_id: incidentId,
    case_id: caseId,
  })
  return data
}

export async function extractEntitiesAI({ narrative, incidentId, caseId }) {
  const { data } = await apiClient.post('/crimegpt/entities', {
    narrative,
    incident_id: incidentId,
    case_id: caseId,
  })
  return data
}

export async function generateDocument({ docType, context, incidentId, caseId }) {
  const { data } = await apiClient.post('/crimegpt/document', {
    doc_type: docType,
    context,
    incident_id: incidentId,
    case_id: caseId,
  })
  return data
}

export async function getDocumentTypes() {
  const { data } = await apiClient.get('/crimegpt/document-types')
  return data.types || []
}

export async function recordAudit({ action, incidentId, caseId, summary, detail }) {
  try {
    await apiClient.post('/crimegpt/audit', {
      action,
      incident_id: incidentId,
      case_id: caseId,
      summary,
      detail,
    })
  } catch {
    /* audit is best-effort; never block the UI */
  }
}

export async function listAudit({ incidentId, limit = 100 } = {}) {
  const { data } = await apiClient.get('/crimegpt/audit', {
    params: { incident_id: incidentId || undefined, limit },
  })
  return data.items || []
}

/** Streaming legal-assistant chat (fetch, mirrors streamCopilot). */
export async function streamLegalAssistant({ context, messages, incidentId, caseId, signal, onChunk }) {
  const token = localStorage.getItem('access_token')
  const res = await fetch('/api/crimegpt/assistant/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ context, messages, incident_id: incidentId, case_id: caseId }),
    signal,
  })
  if (!res.ok || !res.body) {
    throw new Error(`Legal assistant request failed (${res.status})`)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    full += chunk
    onChunk?.(full, chunk)
  }
  return full
}
