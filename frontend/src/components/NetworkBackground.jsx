import { useEffect, useRef } from 'react'

/**
 * Ambient cyber-intelligence network.
 *
 * A single fixed canvas rendered once behind the whole application: faint
 * nodes drifting on slow vectors, hairline links between near neighbours,
 * occasional light pulses travelling along a link, and a very slow scan sweep.
 * The metaphor is threat → entity → connection → intelligence, not a hacker
 * movie: no falling glyphs, no neon, no fast motion.
 *
 * Performance notes:
 * - One canvas, one requestAnimationFrame loop, capped at ~30fps.
 * - Node count scales with viewport area and is hard-capped.
 * - Link search is O(n²) over a small n (≤ 70), which is cheaper than
 *   maintaining a spatial index at this scale.
 * - Rendering pauses when the tab is hidden.
 * - prefers-reduced-motion draws one static frame and stops.
 */

const ACCENT = '34, 211, 238' // #22D3EE
const MAX_NODES = 90
const LINK_DISTANCE = 210
const FRAME_MS = 1000 / 30

/**
 * Ink levels. These are the *final* on-screen alphas — the wrapper is not
 * dimmed further, because compounding a 0.11 layer opacity with already-faint
 * strokes made the network invisible on the #080B12 base.
 */
const LINK_ALPHA = 0.5 // multiplied by distance falloff
const NODE_ALPHA = 0.9
const NODE_HALO_ALPHA = 0.3
const PULSE_ALPHA = 1
const SCAN_ALPHA = 0.09

export default function NetworkBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    let width = 0
    let height = 0
    let dpr = 1
    let nodes = []
    let pulses = []
    let raf = 0
    let last = 0
    let scan = 0

    const rand = (min, max) => min + Math.random() * (max - min)

    function seed() {
      const target = Math.min(MAX_NODES, Math.round((width * height) / 20000))
      nodes = Array.from({ length: Math.max(24, target) }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        // Deliberately slow: a node crosses the screen in minutes, not seconds.
        vx: rand(-0.09, 0.09),
        vy: rand(-0.09, 0.09),
        r: rand(1.1, 2.6),
      }))
      pulses = []
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
      if (reduceMotion) draw(0)
    }

    /** Starts a light pulse along one currently-visible link. */
    function spawnPulse() {
      if (nodes.length < 2) return
      const a = Math.floor(Math.random() * nodes.length)
      let b = -1
      let bestDist = LINK_DISTANCE
      for (let i = 0; i < nodes.length; i++) {
        if (i === a) continue
        const d = Math.hypot(nodes[i].x - nodes[a].x, nodes[i].y - nodes[a].y)
        if (d < bestDist) {
          bestDist = d
          b = i
        }
      }
      if (b === -1) return
      pulses.push({ a, b, t: 0, speed: rand(0.004, 0.009) })
    }

    function draw(dt) {
      ctx.clearRect(0, 0, width, height)

      // --- links -----------------------------------------------------------
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.hypot(dx, dy)
          if (dist > LINK_DISTANCE) continue
          const fade = 1 - dist / LINK_DISTANCE
          ctx.strokeStyle = `rgba(${ACCENT}, ${(fade * LINK_ALPHA).toFixed(3)})`
          ctx.lineWidth = 0.9
          ctx.beginPath()
          ctx.moveTo(nodes[i].x, nodes[i].y)
          ctx.lineTo(nodes[j].x, nodes[j].y)
          ctx.stroke()
        }
      }

      // --- nodes -----------------------------------------------------------
      for (const n of nodes) {
        // Soft halo gives each entity presence without a neon bloom.
        const halo = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 5)
        halo.addColorStop(0, `rgba(${ACCENT}, ${NODE_HALO_ALPHA})`)
        halo.addColorStop(1, `rgba(${ACCENT}, 0)`)
        ctx.fillStyle = halo
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r * 5, 0, Math.PI * 2)
        ctx.fill()

        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${ACCENT}, ${NODE_ALPHA})`
        ctx.fill()
      }

      // --- pulses ----------------------------------------------------------
      for (const p of pulses) {
        const a = nodes[p.a]
        const b = nodes[p.b]
        if (!a || !b) continue
        const x = a.x + (b.x - a.x) * p.t
        const y = a.y + (b.y - a.y) * p.t
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 11)
        glow.addColorStop(0, `rgba(${ACCENT}, ${PULSE_ALPHA})`)
        glow.addColorStop(1, `rgba(${ACCENT}, 0)`)
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(x, y, 11, 0, Math.PI * 2)
        ctx.fill()
      }

      // --- scan sweep ------------------------------------------------------
      if (!reduceMotion) {
        const y = scan * height
        const band = ctx.createLinearGradient(0, y - 120, 0, y + 120)
        band.addColorStop(0, `rgba(${ACCENT}, 0)`)
        band.addColorStop(0.5, `rgba(${ACCENT}, ${SCAN_ALPHA})`)
        band.addColorStop(1, `rgba(${ACCENT}, 0)`)
        ctx.fillStyle = band
        ctx.fillRect(0, y - 120, width, 240)
      }

      if (reduceMotion || dt === 0) return

      // --- advance ---------------------------------------------------------
      const step = dt / 16.67
      for (const n of nodes) {
        n.x += n.vx * step
        n.y += n.vy * step
        if (n.x < -20) n.x = width + 20
        if (n.x > width + 20) n.x = -20
        if (n.y < -20) n.y = height + 20
        if (n.y > height + 20) n.y = -20
      }
      for (const p of pulses) p.t += p.speed * step
      pulses = pulses.filter((p) => p.t <= 1)
      if (pulses.length < 3 && Math.random() < 0.012 * step) spawnPulse()
      scan = (scan + 0.00035 * step) % 1.2
    }

    function frame(now) {
      raf = requestAnimationFrame(frame)
      if (now - last < FRAME_MS) return
      const dt = Math.min(now - last, 80)
      last = now
      draw(dt)
    }

    function start() {
      if (reduceMotion || raf) return
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }

    function stop() {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }

    const onVisibility = () => (document.hidden ? stop() : start())

    resize()
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)
    start()

    return () => {
      stop()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base wash keeps the canvas from ever lifting text contrast. */}
      <div className="absolute inset-0 bg-slate-950/95" />
      {/* Alphas are controlled while drawing, so no extra layer opacity here. */}
      <canvas ref={canvasRef} className="absolute inset-0" />
      {/* Soft vignette so the network reads as depth rather than pattern. */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.16),transparent_70%)]" />
    </div>
  )
}
