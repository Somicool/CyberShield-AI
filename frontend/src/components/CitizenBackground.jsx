import { useEffect, useRef } from 'react'

/**
 * Citizen portal backdrop — "protective shield".
 *
 * Deliberately NOT the police threat mesh. A member of the public reporting a
 * scam shouldn't be looking at a surveillance graph, so this reads as
 * protection rather than analysis:
 *
 *  - Shield pulses: soft rings expanding from below the fold, like cover being
 *    swept over the page.
 *  - Drifting motes: slow upward particles with gentle horizontal sway.
 *  - Calm currents: two long sine ribbons across the lower half.
 *
 * Layered over CSS aurora blooms (see .aurora in index.css) for colour depth.
 *
 * Performance mirrors NetworkBackground: one canvas, one rAF loop capped at
 * ~30fps, DPR capped at 2, paused on hidden tabs, and a single static frame
 * under prefers-reduced-motion.
 */

const PERI = '129, 140, 248' // #818CF8
const AQUA = '56, 189, 248' // #38BDF8
const FRAME_MS = 1000 / 30

const RING_COUNT = 4
const RING_ALPHA = 0.22
const MAX_MOTES = 60
const MOTE_ALPHA = 0.6
const MOTE_HALO_ALPHA = 0.22
const WAVE_ALPHA = 0.12

export default function CitizenBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    let width = 0
    let height = 0
    let motes = []
    let rings = []
    let raf = 0
    let last = 0
    let t = 0

    const rand = (min, max) => min + Math.random() * (max - min)

    function seed() {
      const target = Math.min(MAX_MOTES, Math.round((width * height) / 30000))
      motes = Array.from({ length: Math.max(20, target) }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vy: rand(-0.16, -0.05), // always drifting gently upward
        r: rand(1, 2.8),
        sway: rand(0.3, 1.1),
        phase: Math.random() * Math.PI * 2,
        aqua: Math.random() < 0.3,
      }))
      // Staggered so pulses never arrive together.
      rings = Array.from({ length: RING_COUNT }, (_, i) => ({ life: i / RING_COUNT }))
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
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

    function draw(dt) {
      ctx.clearRect(0, 0, width, height)

      const originX = width * 0.5
      const originY = height * 1.04
      const maxR = Math.hypot(width * 0.6, height) * 1.05

      // --- shield pulses ---------------------------------------------------
      for (const ring of rings) {
        const r = ring.life * maxR
        if (r < 8) continue
        // Fade in quickly, then out across the sweep.
        const fade = Math.sin(Math.min(1, ring.life) * Math.PI)
        ctx.strokeStyle = `rgba(${PERI}, ${(fade * RING_ALPHA).toFixed(3)})`
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.arc(originX, originY, r, Math.PI * 1.06, Math.PI * 1.94)
        ctx.stroke()
      }

      // --- calm currents ---------------------------------------------------
      for (let w = 0; w < 2; w++) {
        const baseY = height * (w === 0 ? 0.62 : 0.8)
        const amp = height * (w === 0 ? 0.045 : 0.03)
        const speed = w === 0 ? 0.00022 : -0.00016
        ctx.strokeStyle = `rgba(${w === 0 ? PERI : AQUA}, ${WAVE_ALPHA})`
        ctx.lineWidth = 1.2
        ctx.beginPath()
        for (let x = 0; x <= width; x += 14) {
          const y =
            baseY +
            Math.sin(x * 0.004 + t * speed * 1000 + w) * amp +
            Math.sin(x * 0.0013 - t * speed * 620) * amp * 0.5
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }

      // --- drifting motes --------------------------------------------------
      for (const m of motes) {
        const x = m.x + Math.sin(t * 0.0004 + m.phase) * m.sway * 14
        const tone = m.aqua ? AQUA : PERI

        const halo = ctx.createRadialGradient(x, m.y, 0, x, m.y, m.r * 6)
        halo.addColorStop(0, `rgba(${tone}, ${MOTE_HALO_ALPHA})`)
        halo.addColorStop(1, `rgba(${tone}, 0)`)
        ctx.fillStyle = halo
        ctx.beginPath()
        ctx.arc(x, m.y, m.r * 6, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = `rgba(${tone}, ${MOTE_ALPHA})`
        ctx.beginPath()
        ctx.arc(x, m.y, m.r, 0, Math.PI * 2)
        ctx.fill()
      }

      if (reduceMotion || dt === 0) return

      // --- advance ---------------------------------------------------------
      const step = dt / 16.67
      t += dt
      for (const m of motes) {
        m.y += m.vy * step
        if (m.y < -30) {
          m.y = height + 30
          m.x = Math.random() * width
        }
      }
      for (const ring of rings) {
        ring.life += 0.0013 * step
        if (ring.life > 1) ring.life -= 1
      }
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
      <div className="absolute inset-0 bg-[#0a1020]" />

      {/* Soft colour blooms under the canvas for depth. */}
      <div className="aurora aurora-1 absolute -left-40 -top-40 h-152 w-152 rounded-full bg-[radial-gradient(circle,rgba(129,140,248,0.22),transparent_65%)] blur-3xl" />
      <div className="aurora aurora-2 absolute -right-52 top-1/4 h-168 w-2xl rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.16),transparent_65%)] blur-3xl" />
      <div className="aurora aurora-3 absolute -bottom-56 left-1/4 h-136 w-136 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.18),transparent_65%)] blur-3xl" />

      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Horizon lift so the page has a floor as well as a sky. */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(to_top,rgba(129,140,248,0.09),transparent)]" />
    </div>
  )
}
