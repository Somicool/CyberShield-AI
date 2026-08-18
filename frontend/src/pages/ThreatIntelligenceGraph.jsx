import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Share2, Brain, Route as RouteIcon, Boxes, AlertCircle } from 'lucide-react'
import { getGraphConnections, getIncident } from '../api/incidents'
import {
  createModel,
  mergeConnections,
  seedIncident,
  shortestPath,
  detectClusters,
  deriveInsights,
  graphStats,
  hotEntityIds,
  buildCampaignBriefing,
  ENTITY_QUERY_TYPES,
} from '../lib/graphModel'
import { extractEntities } from '../lib/entities'
import { deriveCaseId } from '../lib/caseHelpers'
import GraphToolbar from '../components/graph/GraphToolbar'
import GraphCanvas from '../components/graph/GraphCanvas'
import GraphInsights from '../components/graph/GraphInsights'
import ClusterBadges from '../components/graph/ClusterBadges'
import GraphFilters from '../components/graph/GraphFilters'
import GraphLegend from '../components/graph/GraphLegend'
import GraphSection from '../components/graph/GraphSection'
import InvestigationPath from '../components/graph/InvestigationPath'
import EntityDetailsPanel from '../components/graph/EntityDetailsPanel'
import CampaignBriefingPanel from '../components/graph/CampaignBriefingPanel'

const MAX_EXPAND_QUERIES = 30
const DEFAULT_FILTERS = { hiddenTypes: new Set(), hiddenRels: new Set(), minConnections: 0, hideIsolated: false }

/** Graph-service connectivity, shown honestly — never faked, never hidden. */
function ServiceStatus({ status }) {
  const map = {
    connected: ['bg-emerald-400', 'text-emerald-300/90', 'CONNECTED'],
    unavailable: ['bg-red-400', 'text-red-300', 'GRAPH SERVICE UNAVAILABLE'],
    unknown: ['bg-zinc-500', 'text-zinc-500', 'NOT QUERIED'],
  }
  const [dot, text, label] = map[status] || map.unknown
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-black/35 px-2 py-1">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span className={`text-[11.5px] font-semibold uppercase tracking-[0.08em] ${text}`}>{label}</span>
    </span>
  )
}

/**
 * Threat Intelligence Graph — the relationship analysis workspace.
 *
 * Built entirely on the real /detect/graph endpoint: the graph grows by
 * expanding from genuine queries (BFS by relationship depth). Paths, clusters,
 * insights and the campaign briefing are all computed over the loaded real
 * data — no fabricated entities or relationships.
 */
export default function ThreatIntelligenceGraph() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const modelRef = useRef(createModel())
  const canvasRef = useRef(null)

  const [version, setVersion] = useState(0)
  const [searchType, setSearchType] = useState(searchParams.get('type') || 'Domain')
  const [searchValue, setSearchValue] = useState(searchParams.get('value') || '')
  const [depth, setDepth] = useState(1)
  const [layout, setLayout] = useState('force')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [serviceStatus, setServiceStatus] = useState('unknown')

  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [caseContext, setCaseContext] = useState(null) // { id, caseId, entityCount }
  const [selectedNode, setSelectedNode] = useState(null)
  const [incidentDetail, setIncidentDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [highlightId, setHighlightId] = useState(null)

  const [path, setPath] = useState({ computed: false, nodes: [] })
  const [briefingOpen, setBriefingOpen] = useState(false)
  const [briefing, setBriefing] = useState(null)
  const [briefingLoading, setBriefingLoading] = useState(false)

  const bump = () => setVersion((v) => v + 1)

  // ---- data loading -------------------------------------------------------

  /**
   * Every graph lookup goes through here so the service status pill always
   * reflects what the backend actually did.
   */
  const fetchConnections = useCallback(async (type, value) => {
    try {
      const data = await getGraphConnections(type, value)
      setServiceStatus('connected')
      return data
    } catch (e) {
      if (e?.response?.status === 503) setServiceStatus('unavailable')
      throw e
    }
  }, [])

  const expandBFS = useCallback(
    async (type, value, d) => {
      const model = modelRef.current
      const visited = new Set([`${type}:${value}`])
      let frontier = [{ type, value }]
      let queries = 0
      for (let level = 0; level < d && queries < MAX_EXPAND_QUERIES; level++) {
        const next = []
        for (const item of frontier) {
          if (queries >= MAX_EXPAND_QUERIES) break
          queries++
          const data = await fetchConnections(item.type, item.value)
          mergeConnections(model, item.type, item.value, data.connections || [])
          for (const c of data.connections || []) {
            const v = c.properties?.value
            const key = `${c.type}:${v}`
            if (v && ENTITY_QUERY_TYPES.includes(c.type) && !visited.has(key)) {
              visited.add(key)
              next.push({ type: c.type, value: v })
            }
          }
        }
        frontier = next
      }
    },
    [fetchConnections]
  )

  /**
   * Builds the graph for ONE case: seeds the case node with every entity
   * extracted from its content, then expands each queryable entity through the
   * real /detect/graph endpoint to reveal links to other investigations.
   */
  const loadCaseGraph = useCallback(
    async (incidentId) => {
      setLoading(true)
      setError('')
      try {
        const incident = await getIncident(incidentId)
        const entities = extractEntities(incident)
        const entityCount = Object.values(entities).reduce((s, a) => s + a.length, 0)

        seedIncident(modelRef.current, incidentId, incident.incident_type, entities)

        // Expand outward from each of the case's own indicators.
        let queries = 0
        let graphUnavailable = false
        for (const [type, values] of Object.entries(entities)) {
          if (!ENTITY_QUERY_TYPES.includes(type)) continue
          for (const value of values) {
            if (queries >= MAX_EXPAND_QUERIES) break
            queries++
            try {
              const data = await fetchConnections(type, value)
              mergeConnections(modelRef.current, type, value, data.connections || [])
            } catch (e) {
              // One failed lookup must not abort the case graph; remember if the
              // graph service itself is down so we can explain it.
              if (e?.response?.status === 503) graphUnavailable = true
            }
          }
        }

        setCaseContext({ id: incidentId, caseId: deriveCaseId(incident), entityCount })
        setHasSearched(true)
        setHighlightId(`Incident:${incidentId}`)
        bump()
        setTimeout(() => canvasRef.current?.fit(), 400)

        // The case + its own indicators always render; only cross-case links
        // need the graph service, so say so rather than failing silently.
        if (graphUnavailable) {
          setError(
            'Showing this case and its own indicators. Cross-case relationships are unavailable because the threat graph service could not be reached.'
          )
        }
      } catch {
        setError('Could not load this case.')
      } finally {
        setLoading(false)
      }
    },
    [fetchConnections]
  )

  const runSearch = useCallback(async () => {
    const value = searchValue.trim()
    if (!value) return
    setLoading(true)
    setError('')
    try {
      await expandBFS(searchType, value, depth)
      setHasSearched(true)
      setHighlightId(`${searchType}:${value}`)
      bump()
      setTimeout(() => {
        canvasRef.current?.fit()
        canvasRef.current?.centerNode(`${searchType}:${value}`)
      }, 400)
    } catch (e) {
      setError(
        e?.response?.status === 503
          ? 'The threat graph service is unavailable, so relationships cannot be retrieved right now.'
          : 'Graph lookup failed. Check the entity type/value and try again.'
      )
    } finally {
      setLoading(false)
    }
  }, [searchType, searchValue, depth, expandBFS])

  /**
   * Deep links:
   *   ?incident=<id>          → build the graph for that one case
   *   ?type=Domain&value=x    → start from a single entity
   */
  useEffect(() => {
    const incidentId = searchParams.get('incident')
    if (incidentId) {
      loadCaseGraph(incidentId)
      return
    }

    const t = searchParams.get('type')
    const v = searchParams.get('value')
    if (t && v) {
      setSearchType(t)
      setSearchValue(v)
      ;(async () => {
        setLoading(true)
        try {
          await expandBFS(t, v, 1)
          setHasSearched(true)
          setHighlightId(`${t}:${v}`)
          bump()
          setTimeout(() => canvasRef.current?.fit(), 400)
        } catch {
          setError('Graph lookup failed.')
        } finally {
          setLoading(false)
        }
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const expandNode = useCallback(
    async (node) => {
      if (!ENTITY_QUERY_TYPES.includes(node.type)) return
      setLoading(true)
      try {
        const data = await fetchConnections(node.type, node.value)
        mergeConnections(modelRef.current, node.type, node.value, data.connections || [])
        bump()
      } catch {
        setError('Could not expand this entity.')
      } finally {
        setLoading(false)
      }
    },
    [fetchConnections]
  )

  // ---- filtered graph data ------------------------------------------------
  const graphData = useMemo(() => {
    const model = modelRef.current
    const hidden = new Set()
    for (const n of model.nodesById.values()) if (filters.hiddenTypes.has(n.type)) hidden.add(n.id)

    let edges = model.edges.filter(
      (e) => !filters.hiddenRels.has(e.label) && !hidden.has(e.source) && !hidden.has(e.target)
    )
    const deg = new Map()
    for (const e of edges) {
      deg.set(e.source, (deg.get(e.source) || 0) + 1)
      deg.set(e.target, (deg.get(e.target) || 0) + 1)
    }
    const nodes = [...model.nodesById.values()].filter((n) => {
      if (hidden.has(n.id)) return false
      const d = deg.get(n.id) || 0
      if (filters.hideIsolated && d === 0) return false
      if (d < filters.minConnections) return false
      return true
    })
    const visibleIds = new Set(nodes.map((n) => n.id))
    edges = edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
    return { nodes, links: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, label: e.label })) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, filters])

  const insights = useMemo(() => deriveInsights(modelRef.current), [version])
  const stats = useMemo(() => graphStats(modelRef.current), [version])
  const hotIds = useMemo(() => hotEntityIds(modelRef.current), [version])
  const clusters = useMemo(() => detectClusters(modelRef.current), [version])
  const availableTypes = useMemo(
    () => [...new Set([...modelRef.current.nodesById.values()].map((n) => n.type))],
    [version]
  )
  const availableRels = useMemo(() => [...new Set(modelRef.current.edges.map((e) => e.label))], [version])

  // ---- selection ----------------------------------------------------------
  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node)
    setIncidentDetail(null)
    if (node.type === 'Incident') {
      setLoadingDetail(true)
      getIncident(node.value)
        .then(setIncidentDetail)
        .catch(() => setIncidentDetail(null))
        .finally(() => setLoadingDetail(false))
    }
  }, [])

  const focusNode = useCallback(
    (id) => {
      const node = modelRef.current.nodesById.get(id)
      if (node) {
        setHighlightId(id)
        handleNodeClick(node)
        canvasRef.current?.centerNode(id)
      }
    },
    [handleNodeClick]
  )

  // ---- path ---------------------------------------------------------------
  const tracePath = useCallback((sourceId, targetId) => {
    const ids = shortestPath(modelRef.current, sourceId, targetId)
    setPath({ computed: true, nodes: ids ? ids.map((id) => modelRef.current.nodesById.get(id)) : [] })
  }, [])

  // ---- export -------------------------------------------------------------
  const exportPng = () => {
    const canvas = canvasRef.current?.getCanvas()
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `threat-graph-${Date.now()}.png`
    a.click()
  }

  const printGraph = () => {
    const canvas = canvasRef.current?.getCanvas()
    if (!canvas) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<img src="${canvas.toDataURL('image/png')}" style="max-width:100%"/>`)
    win.document.close()
    win.onload = () => setTimeout(() => win.print(), 200)
  }

  const saveSnapshot = () => {
    const snap = {
      exportedAt: new Date().toISOString(),
      nodes: graphData.nodes.map((n) => ({ id: n.id, type: n.type, value: n.value })),
      links: graphData.links.map((l) => ({
        source: l.source.id || l.source,
        target: l.target.id || l.target,
        label: l.label,
      })),
    }
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `investigation-snapshot-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const resetView = () => {
    modelRef.current = createModel()
    setSelectedNode(null)
    setIncidentDetail(null)
    setHighlightId(null)
    setPath({ computed: false, nodes: [] })
    setFilters(DEFAULT_FILTERS)
    setHasSearched(false)
    setCaseContext(null)
    setError('')
    bump()
  }

  // ---- campaign analysis --------------------------------------------------
  const analyzeCampaign = useCallback(async () => {
    setBriefingOpen(true)
    setBriefingLoading(true)
    let snippet = null
    const anyIncident = [...modelRef.current.nodesById.values()].find((n) => n.type === 'Incident')
    if (anyIncident) {
      try {
        const det = await getIncident(anyIncident.value)
        if (det?.ai_explanation) snippet = det.ai_explanation.slice(0, 200)
      } catch {
        /* snippet optional */
      }
    }
    setBriefing(buildCampaignBriefing(modelRef.current, { geminiSnippet: snippet }))
    setBriefingLoading(false)
  }, [])

  const nodeCount = graphData.nodes.length

  return (
    <div className="flex min-h-full flex-col gap-3 p-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[19px] font-semibold tracking-tight text-zinc-100">Threat Intelligence Graph</h2>
          <p className="text-[13px] text-zinc-500">
            Trace relationships between domains, URLs, emails, wallets, phone numbers and incidents.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ServiceStatus status={serviceStatus} />
          <button
            onClick={analyzeCampaign}
            disabled={nodeCount === 0}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/10 bg-black/35 px-3 text-[13px] font-medium text-zinc-200 transition hover:border-cyan-400/40 hover:text-cyan-200 disabled:opacity-40"
          >
            <Brain size={14} /> Analyze Campaign
          </button>
        </div>
      </header>

      {/* Control bar */}
      <GraphToolbar
        searchType={searchType}
        searchValue={searchValue}
        onSearchType={setSearchType}
        onSearchValue={setSearchValue}
        onSearch={runSearch}
        depth={depth}
        onDepth={setDepth}
        layout={layout}
        onLayout={setLayout}
        onExportPng={exportPng}
        onPrint={printGraph}
        onSnapshot={saveSnapshot}
        onReset={resetView}
        loading={loading}
      />

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/8 px-3 py-2 text-[13px] text-red-200">
          <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {/* Case context — shown when the graph was opened for a specific case */}
      {caseContext && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-cyan-400/20 bg-cyan-400/6 px-3 py-2">
          <span className="inline-flex items-center gap-2 text-[13px] text-cyan-200">
            <Boxes size={13} />
            Case graph · <span className="font-mono">{caseContext.caseId}</span>
          </span>
          <span className="text-[12.5px] text-zinc-400">
            {caseContext.entityCount} indicator{caseContext.entityCount === 1 ? '' : 's'} extracted
          </span>
          <Link
            to={`/dashboard/investigate/${caseContext.id}`}
            className="ml-auto text-[12.5px] font-medium text-cyan-300/90 hover:text-cyan-200"
          >
            Open Investigation →
          </Link>
        </div>
      )}

      {/* Graph Insights — compact strip directly above the canvas */}
      {hasSearched && <GraphInsights stats={stats} insights={insights} onFocus={focusNode} />}

      {clusters.length > 0 && <ClusterBadges clusters={clusters} onFocus={focusNode} />}

      {/* Canvas (dominant) + details panel */}
      <div className={`grid min-h-0 gap-3 ${selectedNode ? 'xl:grid-cols-[1fr_340px]' : 'grid-cols-1'}`}>
        <div className="min-w-0">
          <div className="h-[calc(100vh-340px)] min-h-125 overflow-hidden rounded-lg border border-white/10">
            {hasSearched ? (
              <GraphCanvas
                ref={canvasRef}
                graphData={graphData}
                layout={layout}
                selectedId={selectedNode?.id}
                highlightId={highlightId}
                roots={modelRef.current.roots}
                hotIds={hotIds}
                onNodeClick={handleNodeClick}
                onBackgroundClick={() => setSelectedNode(null)}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 bg-[#0a0f18]/85 text-center">
                <Share2 size={26} className="text-zinc-700" />
                <p className="text-[13.5px] text-zinc-400">Search an entity to build the intelligence graph.</p>
                <p className="max-w-md text-[12.5px] text-zinc-600">
                  Start from a domain, wallet, email, phone number or Telegram handle — or open the graph from a case
                  (Cases → View Threat Graph) to map that investigation and everything connected to it.
                </p>
              </div>
            )}
          </div>
        </div>

        {selectedNode && (
          <div className="xl:sticky xl:top-6 xl:self-start">
            <div className="h-[calc(100vh-340px)] min-h-125 overflow-hidden rounded-lg border border-white/10 bg-[#111722]/82 backdrop-blur-md">
              <EntityDetailsPanel
                node={selectedNode}
                model={modelRef.current}
                incidentDetail={incidentDetail}
                loadingDetail={loadingDetail}
                onClose={() => setSelectedNode(null)}
                onOpenInvestigation={(incidentId) => navigate(`/dashboard/investigate/${incidentId}`)}
                onViewCase={(incidentId) => navigate(`/dashboard/incidents/${incidentId}`)}
                onCenter={(id) => canvasRef.current?.centerNode(id)}
                onSearchRelated={expandNode}
              />
            </div>
          </div>
        )}
      </div>

      {/* Collapsed by default — the officer reaches the graph first */}
      {hasSearched && (
        <>
          <GraphFilters
            value={filters}
            onChange={setFilters}
            availableTypes={availableTypes}
            availableRels={availableRels}
          />
          <GraphLegend />
          <GraphSection icon={RouteIcon} title="Investigation Path">
            <InvestigationPath
              nodes={graphData.nodes}
              path={path.nodes}
              computed={path.computed}
              onTrace={tracePath}
              onClear={() => setPath({ computed: false, nodes: [] })}
              onFocus={focusNode}
            />
          </GraphSection>
        </>
      )}

      <CampaignBriefingPanel
        open={briefingOpen}
        onClose={() => setBriefingOpen(false)}
        briefing={briefing}
        loading={briefingLoading}
      />
    </div>
  )
}
