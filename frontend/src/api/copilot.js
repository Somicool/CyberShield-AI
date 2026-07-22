/**
 * Streaming client for the AI Investigation Copilot.
 *
 * Uses fetch (not axios) so we can read the response as a stream and render
 * tokens as they arrive. Hits the same /api proxy as the rest of the app and
 * forwards the JWT if present.
 */
export async function streamCopilot({ context, messages, signal, onChunk }) {
  const token = localStorage.getItem('access_token')
  const res = await fetch('/api/copilot/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ context, messages }),
    signal,
  })

  if (!res.ok || !res.body) {
    throw new Error(`Copilot request failed (${res.status})`)
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
