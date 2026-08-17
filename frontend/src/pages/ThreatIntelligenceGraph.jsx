import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Share2, Brain, Radar, Route as RouteIcon, Boxes, AlertCircle } from 'lucide-react'
import { getGraphConnections, getIncident } from '../api/incidents'
import {
  createModel,
  mergeConnections,
  seedIncident,
  toGraphData,
  degreeOf,
  shortestPath,
  detectClusters,
  deriveInsights,
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
import InvestigationPath from '../components/graph/InvestigationPath'
import EntityDetailsPanel from '../components/graph/EntityDetailsPanel'
import CampaignBriefingPanel from '../components/graph/CampaignBriefingPanel'
import PlannedModules from '../components/graph/PlannedModules'
import Section from '../components/investigation/Section'

const MAX_EXPAND_QUERIES = 30
const DEFAULT_FILTERS = { hiddenTypes: new Set(), hiddenRels: new Set(), minConnections: 0, hideIsolated: false }

/**
 * Threat Intelligence Graph — the intelligence analysis workspace.
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
  const expandBFS = useCallback(async (type, value, d) => {
    const model = modelRef.current
    const visited = new Set([`${type}:${value}`])
    let frontier = [{ type, value }]
    let queries = 0
    for (let level = 0; level < d && queries < MAX_EXPAND_QUERIES; level++) {
      const next = []
      for (const item of frontier) {
        if (queries >= MAX_EXPAND_QUERIES) break
        queries++
        const data = await getGraphConnections(item.type, item.value)
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
  }, [])

  /**
   * Builds the graph for ONE case: seeds the case node with every entity
   * extracted from its content, then expands each queryable entity through the
   * real /detect/graph endpoint to reveal links to other investigations.
   */
  const loadCaseGraph = useCallback(async (incidentId) => {
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
            const data = await getGraphConnections(type, value)
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
  }, [])

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
    } catch {
      setError('Graph lookup failed. Check the entity type/value and try again.')
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

  const expandNode = useCallback(async (node) => {
    if (!ENTITY_QUERY_TYPES.includes(node.type)) return
    setLoading(true)
    try {
      const data = await getGraphConnections(node.type, node.value)
      mergeConnections(modelRef.current, node.type, node.value, data.connections || [])
      bump()
    } catch {
      setError('Could not expand this entity.')
    } finally {
      setLoading(false)
    }
  }, [])

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

  const focusNode = useCallback((id) => {
    const node = modelRef.current.nodesById.get(id)
    if (node) {
      setHighlightId(id)
      handleNodeClick(node)
      canvasRef.current?.centerNode(id)
    }
  }, [handleNodeClick])

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
    <div className="flex flex-col gap-4 p-8">
      {/* Section 1 — header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-300">
            <Share2 size={20} />
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Threat Intelligence Graph</h2>
            <p className="text-sm text-slate-500">
              Visualize relationships between cybercrime entities and identify organised attack campaigns.
            </p>
          </div>
        </div>
        <button
          onClick={analyzeCampaign}
          disabled={nodeCount === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-purple-500/50 bg-purple-600/20 px-4 py-2.5 text-sm font-semibold text-purple-100 transition hover:bg-purple-600/30 disabled:opacity-50"
        >
          <Brain size={17} /> Analyze Campaign
        </button>
      </header>

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
        <div className="flex items-center gap-2 rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Case context — shown when the graph was opened for a specific case */}
      {caseContext && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-400/25 bg-amber-400/8 px-4 py-2.5">
          <span className="inline-flex items-center gap-2 text-[12.5px] text-amber-200">
            <Boxes size={14} />
            Case graph · <span className="font-mono">{caseContext.caseId}</span>
          </span>
          <span className="text-[11.5px] text-zinc-400">
            {caseContext.entityCount} indicator{caseContext.entityCount === 1 ? '' : 's'} extracted from this case
          </span>
          <Link
            to={`/dashboard/investigate/${caseContext.id}`}
            className="ml-auto text-[11.5px] font-medium text-amber-300/90 hover:text-amber-200"
          >
            Open Investigation →
          </Link>
        </div>
      )}

      {/* Section 6 — insights */}
      {hasSearched && (
        <div className="flex items-center gap-2">
          <Radar size={15} className="text-purple-400" />
          <span className="text-sm font-semibold text-slate-200">Graph Insights</span>
        </div>
      )}
      {hasSearched && <GraphInsights insights={insights} onFocus={focusNode} />}

      {/* Section 8 — clusters */}
      {clusters.length > 0 && <ClusterBadges clusters={clusters} onFocus={focusNode} />}

      {/* Canvas + details panel */}
      <div className={`grid gap-4 ${selectedNode ? 'xl:grid-cols-[1fr_360px]' : 'grid-cols-1'}`}>
        <div className="min-w-0">
          <div className="h-[560px] overflow-hidden rounded-xl border border-slate-800">
            {hasSearched ? (
              <GraphCanvas
                ref={canvasRef}
                graphData={graphData}
                layout={layout}
                selectedId={selectedNode?.id}
                highlightId={highlightId}
                roots={modelRef.current.roots}
                onNodeClick={handleNodeClick}
                onBackgroundClick={() => setSelectedNode(null)}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <Share2 size={30} className="text-slate-700" />
                <p className="text-sm text-slate-400">Search an entity to build the intelligence graph.</p>
                <p className="max-w-md text-xs text-slate-600">
                  Start from a domain, wallet, email, phone number or Telegram handle — or open the graph from a
                  case (Cases → View Threat Graph) to map that investigation and everything connected to it.
                </p>
              </div>
            )}
          </div>
        </div>

        {selectedNode && (
          <div className="xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:self-start">
            <div className="h-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40">
              <EntityDetailsPanel
                node={selectedNode}
                model={modelRef.current}
                incidentDetail={incidentDetail}
                loadingDetail={loadingDetail}
                onClose={() => setSelectedNode(null)}
                onOpenInvestigation={(incidentId) => navigate(`/dashboard/investigate/${incidentId}`)}
                onCenter={(id) => canvasRef.current?.centerNode(id)}
                onSearchRelated={expandNode}
              />
            </div>
          </div>
        )}
      </div>

      {hasSearched && (
        <>
          <GraphFilters value={filters} onChange={setFilters} availableTypes={availableTypes} availableRels={availableRels} />
          <GraphLegend />

          <Section icon={RouteIcon} title="Investigation Path" defaultOpen={false}>
            <InvestigationPath
              nodes={graphData.nodes}
              path={path.nodes}
              computed={path.computed}
              onTrace={tracePath}
              onClear={() => setPath({ computed: false, nodes: [] })}
              onFocus={focusNode}
            />
          </Section>
        </>
      )}

      <Section icon={Boxes} title="Future Modules" defaultOpen={false}>
        <PlannedModules />
      </Section>

      <CampaignBriefingPanel
        open={briefingOpen}
        onClose={() => setBriefingOpen(false)}
        briefing={briefing}
        loading={briefingLoading}
      />
    </div>
  )
}
