/**
 * useCaseData — loads the full working set for a single case from the existing
 * read-only APIs: the incident detail (detection + Gemini + cached WHOIS/DNS/
 * SSL/GeoIP), the extracted linked entities, and the Neo4j threat-graph
 * correlation (linked entities + related cases). Workflow meta (status/officer/
 * notes/timeline) comes from the caseWorkflow store.
 *
 * This is the same data the Investigation Workspace assembles; extracting it
 * here lets CrimeGPT consume identical, non-duplicated data for any selected
 * case without re-implementing the correlation logic.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getIncident, getGraphConnections } from '../api/incidents'
import { useCaseWorkflow, getCaseMeta } from '../lib/caseWorkflow'
import { deriveCaseId, detectionConfidence, domainForIncident } from '../lib/caseHelpers'
import { extractEntities } from '../lib/entities'

export default function useCaseData(id) {
  useCaseWorkflow() // re-render when workflow meta changes
  const [incident, setIncident] = useState(null)
  const [loading, setLoading] = useState(Boolean(id))
  const [error, setError] = useState('')
  const [graph, setGraph] = useState({ linkedEntities: 0, related: [], loading: Boolean(id), error: false })

  // ---- incident detail ----------------------------------------------------
  const fetchIncident = useCallback(async () => {
    if (!id) {
      setIncident(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await getIncident(id)
      setIncident(data)
      setError('')
    } catch {
      setIncident(null)
      setError('Case not found or the service is unavailable.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchIncident()
  }, [fetchIncident])

  // ---- threat-graph correlation ------------------------------------------
  const loadGraph = useCallback(
    async (dom) => {
      if (!dom) {
        setGraph({ linkedEntities: 0, related: [], loading: false, error: false })
        return
      }
      setGraph((g) => ({ ...g, loading: true, error: false }))
      try {
        const data = await getGraphConnections('Domain', dom)
        const connections = data.connections || []
        const entityKeys = new Set(connections.map((c) => `${c.type}:${c.properties?.value}`))

        const byIncident = new Map()
        for (const c of connections) {
          const iid = c.via_incident_id
          if (!iid || iid === id) continue
          if (!byIncident.has(iid)) byIncident.set(iid, [])
          byIncident.get(iid).push(c)
        }

        const relatedIds = [...byIncident.keys()].slice(0, 6)
        const summaries = await Promise.all(relatedIds.map((iid) => getIncident(iid).catch(() => null)))

        const related = relatedIds.map((iid, idx) => {
          const conns = byIncident.get(iid)
          const shared = { Domain: [dom], Wallet: [], Email: [], TelegramHandle: [], Phone: [] }
          for (const c of conns) {
            if (shared[c.type] && c.properties?.value) shared[c.type].push(c.properties.value)
          }
          const similarity = Math.min(99, 55 + (1 + conns.length) * 12)
          const summary = summaries[idx]
          return {
            incidentId: iid,
            caseId: summary ? deriveCaseId(summary) : `CASE-${String(iid).slice(0, 6)}`,
            threatLevel: summary?.threat_level,
            similarity,
            shared,
          }
        })

        setGraph({ linkedEntities: entityKeys.size, related, loading: false, error: false })
      } catch {
        setGraph({ linkedEntities: 0, related: [], loading: false, error: true })
      }
    },
    [id],
  )

  useEffect(() => {
    if (!incident) {
      setGraph({ linkedEntities: 0, related: [], loading: false, error: false })
      return
    }
    loadGraph(domainForIncident(incident))
  }, [incident, loadGraph])

  // ---- derived ------------------------------------------------------------
  const entities = useMemo(() => (incident ? extractEntities(incident) : {}), [incident])
  const meta = id ? getCaseMeta(id) : null
  const caseId = incident ? deriveCaseId(incident) : ''
  const confidence = detectionConfidence(incident)

  return {
    incident,
    loading,
    error,
    graph,
    entities,
    meta,
    caseId,
    confidence,
    related: graph.related,
    refresh: fetchIncident,
  }
}
