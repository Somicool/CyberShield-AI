import { useState, useMemo, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import ForceGraph2D from 'react-force-graph-2d'
import { getGraphConnections } from '../api/incidents'

const ENTITY_TYPES = ['Domain', 'Email', 'Phone', 'Wallet', 'TelegramHandle']

const TYPE_COLORS = {
  root: '#a855f7',
  Domain: '#60a5fa',
  Email: '#f472b6',
  Phone: '#fbbf24',
  Wallet: '#34d399',
  TelegramHandle: '#f87171',
  Incident: '#94a3b8',
}

export default function ThreatGraph() {
  const [searchParams] = useSearchParams()
  const [entityType, setEntityType] = useState(searchParams.get('type') || 'Wallet')
  const [entityValue, setEntityValue] = useState(searchParams.get('value') || '')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const runSearch = useCallback(async (type, value) => {
    if (!value.trim()) return
    setLoading(true)
    setError('')
    try {
      const data = await getGraphConnections(type, value.trim())
      setResult(data)
    } catch {
      setError('Lookup failed. Check the entity type/value and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Deep-link support: /dashboard/graph?type=Domain&value=example.com auto-runs
  // the lookup so the Investigation Workspace can pivot straight to an entity.
  useEffect(() => {
    const type = searchParams.get('type')
    const value = searchParams.get('value')
    if (type && value) {
      setEntityType(type)
      setEntityValue(value)
      runSearch(type, value)
    }
  }, [searchParams, runSearch])

  async function handleSearch(e) {
    e.preventDefault()
    runSearch(entityType, entityValue)
  }

  const graphData = useMemo(() => {
    if (!result) return { nodes: [], links: [] }

    const rootId = `${result.entity_type}:${result.entity_value}`
    const nodes = [{ id: rootId, label: result.entity_value, type: 'root' }]
    const links = []
    const seen = new Set([rootId])

    result.connections.forEach((conn, i) => {
      const value = conn.properties.value || conn.properties.chain || `node-${i}`
      const nodeId = `${conn.type}:${value}:${i}`
      if (!seen.has(nodeId)) {
        nodes.push({ id: nodeId, label: value, type: conn.type })
        seen.add(nodeId)
      }
      links.push({ source: rootId, target: nodeId, via: conn.via_incident_id })
    })

    return { nodes, links }
  }, [result])

  return (
    <div className="p-8">
      <h2 className="text-xl font-semibold mb-1">Threat Intelligence Graph</h2>
      <p className="text-sm text-slate-500 mb-6">
        Look up any entity to discover everything connected to it through shared incidents —
        domains, emails, phone numbers, wallet addresses, and Telegram handles that appeared
        together in scam attempts.
      </p>

      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm"
        >
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Enter a value, e.g. a wallet address or email"
          value={entityValue}
          onChange={(e) => setEntityValue(e.target.value)}
          className="flex-1 bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-600"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 px-4 py-2 rounded text-sm"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {result && (
        <>
          <p className="text-sm text-slate-500 mb-3">
            {result.connections.length} connection{result.connections.length !== 1 ? 's' : ''} found
          </p>
          <div className="border border-slate-800 rounded-lg bg-slate-950" style={{ height: 500 }}>
            {graphData.nodes.length > 1 ? (
              <ForceGraph2D
                graphData={graphData}
                nodeLabel={(n) => `${n.type}: ${n.label}`}
                nodeColor={(n) => TYPE_COLORS[n.type] || '#94a3b8'}
                nodeRelSize={6}
                linkColor={() => '#334155'}
                linkDirectionalParticles={1}
                backgroundColor="#020617"
              />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                No connections found for this entity.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
