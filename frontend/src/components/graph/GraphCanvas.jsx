import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { ZoomIn, ZoomOut, Maximize2, Minimize2, Crosshair, Locate } from 'lucide-react'
import { typeColor } from '../../lib/graphModel'

function MiniMap({ nodesRef }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    let raf
    let last = 0
    const draw = (t) => {
      raf = requestAnimationFrame(draw)
      if (t - last < 180) return // ~5fps, cheap
      last = t
      const cv = canvasRef.current
      const nodes = nodesRef.current || []
      if (!cv || nodes.length === 0) return
      const ctx = cv.getContext('2d')
      const W = cv.width
      const H = cv.height
      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = 'rgba(2,6,23,0.85)'
      ctx.fillRect(0, 0, W, H)
      const xs = nodes.map((n) => n.x).filter((v) => Number.isFinite(v))
      const ys = nodes.map((n) => n.y).filter((v) => Number.isFinite(v))
      if (!xs.length) return
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)
      const pad = 8
      const sx = (W - pad * 2) / (maxX - minX || 1)
      const sy = (H - pad * 2) / (maxY - minY || 1)
      const s = Math.min(sx, sy)
      for (const n of nodes) {
        if (!Number.isFinite(n.x)) continue
        ctx.beginPath()
        ctx.arc(pad + (n.x - minX) * s, pad + (n.y - minY) * s, 1.6, 0, Math.PI * 2)
        ctx.fillStyle = typeColor(n.type)
        ctx.fill()
      }
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [nodesRef])

  return (
    <div className="absolute bottom-3 right-3 overflow-hidden rounded-md border border-slate-700 bg-slate-950/80">
      <canvas ref={canvasRef} width={150} height={100} />
    </div>
  )
}

/**
 * Graph canvas: force-directed rendering with zoom / pan / drag / center /
 * fit / fullscreen and a live minimap. Node colour comes from the type
 * registry; edge relationship labels appear on hover. Imperative methods are
 * exposed to the page via ref (centerNode, fit, getCanvas...).
 */
const GraphCanvas = forwardRef(function GraphCanvas(
  { graphData, selectedId, highlightId, roots, layout = 'force', onNodeClick, onBackgroundClick },
  ref
) {
  const wrapperRef = useRef(null)
  const fgRef = useRef(null)
  const nodesRef = useRef([])
  const [size, setSize] = useState({ w: 800, h: 520 })
  const [fullscreen, setFullscreen] = useState(false)

  nodesRef.current = graphData.nodes

  // Layout presets adjust force strengths (works on cyclic graphs, unlike DAG modes).
  useEffect(() => {
    const fg = fgRef.current
    if (!fg) return
    const charge = fg.d3Force('charge')
    if (charge) charge.strength(layout === 'spread' ? -260 : layout === 'compact' ? -55 : -140)
    const link = fg.d3Force('link')
    if (link) link.distance(layout === 'spread' ? 90 : layout === 'compact' ? 32 : 55)
    fg.d3ReheatSimulation()
  }, [layout, graphData])

  // Responsive sizing.
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect
      setSize({ w: Math.max(320, r.width), h: Math.max(360, r.height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  const centerNode = (id) => {
    const node = graphData.nodes.find((n) => n.id === id)
    if (node && fgRef.current && Number.isFinite(node.x)) {
      fgRef.current.centerAt(node.x, node.y, 600)
      fgRef.current.zoom(4, 600)
    }
  }

  useImperativeHandle(ref, () => ({
    centerNode,
    fit: () => fgRef.current?.zoomToFit(600, 60),
    zoomIn: () => fgRef.current?.zoom((fgRef.current.zoom() || 1) * 1.4, 300),
    zoomOut: () => fgRef.current?.zoom((fgRef.current.zoom() || 1) / 1.4, 300),
    getCanvas: () => wrapperRef.current?.querySelector('canvas') || null,
  }))

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else wrapperRef.current?.requestFullscreen?.()
  }

  const CtrlBtn = ({ title, onClick, children }) => (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      className="rounded-md border border-slate-700 bg-slate-900/90 p-1.5 text-slate-300 transition hover:bg-slate-800 hover:text-white"
    >
      {children}
    </button>
  )

  return (
    <div ref={wrapperRef} className="relative h-full w-full bg-slate-950">
      {/* controls */}
      <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
        <CtrlBtn title="Zoom in" onClick={() => fgRef.current?.zoom((fgRef.current.zoom() || 1) * 1.4, 300)}>
          <ZoomIn size={15} />
        </CtrlBtn>
        <CtrlBtn title="Zoom out" onClick={() => fgRef.current?.zoom((fgRef.current.zoom() || 1) / 1.4, 300)}>
          <ZoomOut size={15} />
        </CtrlBtn>
        <CtrlBtn title="Fit to screen" onClick={() => fgRef.current?.zoomToFit(600, 60)}>
          <Crosshair size={15} />
        </CtrlBtn>
        <CtrlBtn title="Center graph" onClick={() => fgRef.current?.centerAt(0, 0, 600)}>
          <Locate size={15} />
        </CtrlBtn>
        <CtrlBtn title={fullscreen ? 'Exit full screen' : 'Full screen'} onClick={toggleFullscreen}>
          {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </CtrlBtn>
      </div>

      <ForceGraph2D
        ref={fgRef}
        width={size.w}
        height={size.h}
        graphData={graphData}
        backgroundColor="#020617"
        cooldownTicks={120}
        onEngineStop={() => fgRef.current?.zoomToFit(500, 60)}
        linkColor={() => 'rgba(148,163,184,0.25)'}
        linkWidth={1}
        linkLabel={(l) => l.label}
        linkDirectionalArrowLength={3}
        linkDirectionalArrowRelPos={0.85}
        onNodeClick={onNodeClick}
        onBackgroundClick={onBackgroundClick}
        onNodeDragEnd={(node) => {
          node.fx = node.x
          node.fy = node.y
        }}
        nodeLabel={(n) => `${n.type}: ${n.value}`}
        nodePointerAreaPaint={(node, color, ctx) => {
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.arc(node.x, node.y, 8, 0, Math.PI * 2)
          ctx.fill()
        }}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const isSel = node.id === selectedId
          const isHi = node.id === highlightId
          const isRoot = roots?.has(node.id)
          const r = node.type === 'Incident' ? 6 : 5.5
          // highlight ring
          if (isSel || isHi || isRoot) {
            ctx.beginPath()
            ctx.arc(node.x, node.y, r + 3, 0, Math.PI * 2)
            ctx.strokeStyle = isSel || isHi ? '#e2e8f0' : 'rgba(226,232,240,0.5)'
            ctx.lineWidth = isSel || isHi ? 2 : 1
            ctx.stroke()
          }
          ctx.beginPath()
          ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
          ctx.fillStyle = typeColor(node.type)
          ctx.fill()
          // label when zoomed in enough
          if (globalScale >= 1.4) {
            const label = node.label
            ctx.font = `${11 / globalScale}px sans-serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'top'
            ctx.fillStyle = '#cbd5e1'
            ctx.fillText(label, node.x, node.y + r + 1)
          }
        }}
      />

      <MiniMap nodesRef={nodesRef} />
    </div>
  )
})

export default GraphCanvas
