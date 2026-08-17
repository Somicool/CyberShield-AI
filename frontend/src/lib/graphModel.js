/**
 * Threat-intelligence graph model + analysis helpers.
 *
 * The backend exposes a single query: /detect/graph/{type}/{value}, returning
 * entities that co-occur (through incidents) with a given entity. We build a
 * larger graph by expanding from real queries (BFS) and merging results.
 * Everything below — paths, clusters, insights — is computed over the REAL
 * loaded data. Nothing is synthesised; if data isn't present, it isn't shown.
 */

// ---- Node type registry (extensible for future entity types) -------------

export const NODE_TYPES = {
  Domain: { label: 'Domain', color: '#60a5fa', glyph: 'D' },
  URL: { label: 'URL', color: '#38bdf8', glyph: 'U' },
  Email: { label: 'Email', color: '#f472b6', glyph: 'E' },
  Phone: { label: 'Phone', color: '#fbbf24', glyph: 'P' },
  Wallet: { label: 'Wallet', color: '#34d399', glyph: 'W' },
  TelegramHandle: { label: 'Telegram', color: '#f87171', glyph: 'T' },
  Incident: { label: 'Incident', color: '#a855f7', glyph: 'I' },
  Case: { label: 'Case', color: '#c084fc', glyph: 'C' },
  IP: { label: 'IP Address', color: '#22d3ee', glyph: 'IP' },
}

export const ENTITY_QUERY_TYPES = ['Domain', 'Email', 'Phone', 'Wallet', 'TelegramHandle']

export function typeColor(type) {
  return NODE_TYPES[type]?.color || '#94a3b8'
}

export function typeLabel(type) {
  return NODE_TYPES[type]?.label || type
}

// ---- Display helpers ------------------------------------------------------

export function displayValue(type, value) {
  if (type === 'Incident') return `#${String(value).slice(0, 8)}`
  if (type === 'TelegramHandle') return `@${value}`
  const s = String(value)
  return s.length > 26 ? `${s.slice(0, 24)}…` : s
}

// ---- Model construction ---------------------------------------------------

export function createModel() {
  return { nodesById: new Map(), edges: [], edgeIds: new Set(), roots: new Set(), version: 0 }
}

function ensureNode(model, id, type, value) {
  if (!model.nodesById.has(id)) {
    model.nodesById.set(id, { id, type, value, label: displayValue(type, value) })
  }
  return model.nodesById.get(id)
}

function addEdge(model, source, target, label) {
  const id = [source, target].sort().join('__')
  if (model.edgeIds.has(id)) return
  model.edgeIds.add(id)
  model.edges.push({ id, source, target, label })
}

/**
 * Merge a /detect/graph response into the model.
 * rootType/rootValue is the queried entity; connections is the API payload.
 */
export function mergeConnections(model, rootType, rootValue, connections) {
  const rootId = `${rootType}:${rootValue}`
  ensureNode(model, rootId, rootType, rootValue)
  model.roots.add(rootId)

  for (const c of connections || []) {
    const iid = c.via_incident_id
    const entType = c.type
    const entVal = c.properties?.value
    if (!entVal) continue

    if (iid) {
      const incId = `Incident:${iid}`
      ensureNode(model, incId, 'Incident', iid)
      addEdge(model, rootId, incId, 'Appears In')
      const entId = `${entType}:${entVal}`
      ensureNode(model, entId, entType, entVal)
      addEdge(model, incId, entId, 'Appears In')
    } else {
      const entId = `${entType}:${entVal}`
      ensureNode(model, entId, entType, entVal)
      addEdge(model, rootId, entId, 'Observed Together')
    }
  }
  model.version += 1
  return model
}

/**
 * Seeds the model directly from ONE case: creates its Incident node and links
 * every entity extracted from that case's content.
 *
 * This is what makes the graph work per-case — the officer sees the case at the
 * centre with all of its own indicators, before any expansion reaches out to
 * other investigations.
 *
 * @param {object} entities  { Domain: [], Email: [], Phone: [], Wallet: [], TelegramHandle: [] }
 */
export function seedIncident(model, incidentId, incidentType, entities = {}) {
  const incId = `Incident:${incidentId}`
  ensureNode(model, incId, 'Incident', incidentId)
  model.roots.add(incId)

  for (const [type, values] of Object.entries(entities)) {
    for (const value of values || []) {
      if (!value) continue
      const entId = `${type}:${value}`
      ensureNode(model, entId, type, value)
      addEdge(model, incId, entId, 'Appears In')
    }
  }
  model.version += 1
  return model
}

/** Fresh graphData object for react-force-graph (stable node refs preserved). */
export function toGraphData(model) {
  return {
    nodes: [...model.nodesById.values()],
    links: model.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, label: e.label })),
  }
}

// ---- Graph algorithms (over real loaded data) -----------------------------

export function buildAdjacency(model) {
  const adj = new Map()
  for (const id of model.nodesById.keys()) adj.set(id, new Set())
  for (const e of model.edges) {
    adj.get(e.source)?.add(e.target)
    adj.get(e.target)?.add(e.source)
  }
  return adj
}

export function degreeOf(model, id) {
  return model.edges.reduce((n, e) => n + (e.source === id || e.target === id ? 1 : 0), 0)
}

export function shortestPath(model, sourceId, targetId) {
  if (sourceId === targetId) return [sourceId]
  const adj = buildAdjacency(model)
  const prev = new Map([[sourceId, null]])
  const queue = [sourceId]
  while (queue.length) {
    const cur = queue.shift()
    for (const nb of adj.get(cur) || []) {
      if (!prev.has(nb)) {
        prev.set(nb, cur)
        if (nb === targetId) {
          const path = [nb]
          let p = cur
          while (p != null) {
            path.unshift(p)
            p = prev.get(p)
          }
          return path
        }
        queue.push(nb)
      }
    }
  }
  return null
}

/** Connected components that contain >= 2 incidents = candidate campaign clusters. */
export function detectClusters(model) {
  const adj = buildAdjacency(model)
  const seen = new Set()
  const clusters = []

  for (const startId of model.nodesById.keys()) {
    if (seen.has(startId)) continue
    const comp = []
    const stack = [startId]
    seen.add(startId)
    while (stack.length) {
      const cur = stack.pop()
      comp.push(cur)
      for (const nb of adj.get(cur) || []) {
        if (!seen.has(nb)) {
          seen.add(nb)
          stack.push(nb)
        }
      }
    }
    const nodes = comp.map((id) => model.nodesById.get(id))
    const incidents = nodes.filter((n) => n.type === 'Incident')
    if (incidents.length < 2) continue

    const sharedTypes = [
      ...new Set(
        nodes
          .filter((n) => n.type !== 'Incident' && degreeOf(model, n.id) >= 2)
          .map((n) => n.type)
      ),
    ]
    const confidence = incidents.length >= 4 ? 'High' : incidents.length >= 3 ? 'Medium' : 'Low'
    clusters.push({
      id: `cluster:${comp[0]}`,
      nodeIds: comp,
      incidentCount: incidents.length,
      entityCount: nodes.length - incidents.length,
      sharedTypes,
      confidence,
    })
  }
  return clusters.sort((a, b) => b.incidentCount - a.incidentCount)
}

const SEVERITY_BY_COUNT = (n) => (n >= 4 ? 'critical' : n >= 3 ? 'high' : 'medium')

/** Natural-language insights derived strictly from the loaded graph. */
export function deriveInsights(model) {
  const adj = buildAdjacency(model)
  const insights = []

  for (const node of model.nodesById.values()) {
    if (node.type === 'Incident') continue
    const incidentNeighbors = [...(adj.get(node.id) || [])].filter(
      (nb) => model.nodesById.get(nb)?.type === 'Incident'
    )
    if (incidentNeighbors.length >= 2) {
      insights.push({
        id: `reuse:${node.id}`,
        severity: SEVERITY_BY_COUNT(incidentNeighbors.length),
        text: `${typeLabel(node.type)} "${displayValue(node.type, node.value)}" appears in ${incidentNeighbors.length} investigations.`,
        focusId: node.id,
      })
    }
  }

  for (const cluster of detectClusters(model)) {
    const shared = cluster.sharedTypes.map(typeLabel).join(', ') || 'shared entities'
    insights.push({
      id: cluster.id,
      severity: cluster.incidentCount >= 4 ? 'critical' : 'high',
      text: `A cluster links ${cluster.incidentCount} investigations through ${shared} — likely a coordinated campaign.`,
      focusId: cluster.nodeIds[0],
    })
  }

  const rank = { critical: 3, high: 2, medium: 1 }
  return insights.sort((a, b) => rank[b.severity] - rank[a.severity]).slice(0, 8)
}

/** Counts of each node type currently in the model. */
export function typeCounts(model) {
  const counts = {}
  for (const n of model.nodesById.values()) counts[n.type] = (counts[n.type] || 0) + 1
  return counts
}

/**
 * Flagship AI Campaign Analysis briefing, composed from the REAL loaded graph
 * plus (optionally) a Gemini explanation already generated for a linked
 * incident. Never invents entities or relationships.
 *
 * @param {object} model
 * @param {object} opts  { geminiSnippet?: string }
 */
export function buildCampaignBriefing(model, { geminiSnippet } = {}) {
  const adj = buildAdjacency(model)
  const counts = typeCounts(model)
  const incidentCount = counts.Incident || 0
  const narrative = []
  const actions = new Set(['Prioritize linked investigations'])

  if (model.nodesById.size === 0) {
    return {
      narrative: ['No entities are loaded. Search an entity to begin campaign analysis.'],
      confidence: 'Not Available',
      actions: [],
    }
  }

  const entityNodes = [...model.nodesById.values()].filter((n) => n.type !== 'Incident')
  const totalEntities = entityNodes.length
  narrative.push(
    `Analysis of the current intelligence graph covers ${incidentCount} incident${incidentCount === 1 ? '' : 's'} and ${totalEntities} connected entit${totalEntities === 1 ? 'y' : 'ies'}.`
  )

  // Entity reuse across incidents, grouped by type.
  const reuseByType = {}
  for (const n of entityNodes) {
    const inc = [...(adj.get(n.id) || [])].filter((id) => model.nodesById.get(id)?.type === 'Incident').length
    if (inc >= 2) {
      if (!reuseByType[n.type] || inc > reuseByType[n.type].count) reuseByType[n.type] = { node: n, count: inc }
    }
  }
  const PHRASE = {
    Wallet: 'share the same cryptocurrency wallet',
    Domain: 'reference the same domain',
    Email: 'share the same email address',
    Phone: 'share the same phone number',
    TelegramHandle: 'reference the same Telegram handle',
  }
  for (const [type, { node, count }] of Object.entries(reuseByType)) {
    narrative.push(`${count} incidents ${PHRASE[type] || 'share the same ' + typeLabel(type)} (${displayValue(type, node.value)}).`)
    if (type === 'Wallet') actions.add('Monitor wallet activity')
    if (type === 'Domain') actions.add('Block associated domains')
    if (type === 'TelegramHandle') actions.add('Track Telegram handle')
  }

  const clusters = detectClusters(model)
  const top = clusters[0]
  if (top) {
    narrative.push(
      `These entities form a connected cluster spanning ${top.incidentCount} investigations, which suggests organised activity rather than isolated attacks.`
    )
    actions.add('Escalate to Cyber Crime Intelligence Unit')
  }

  if (geminiSnippet) {
    narrative.push(`AI assessment from a linked case: “${geminiSnippet}”`)
  }

  const confidence = top ? top.confidence : Object.keys(reuseByType).length ? 'Medium' : 'Low'

  return { narrative, confidence, actions: [...actions] }
}
