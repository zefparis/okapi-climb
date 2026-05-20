import { useEffect, useRef } from 'react'

type GameState = 'waiting' | 'playing' | 'crashed' | 'cashedout'

// Load the okapi sprite once at module scope so it is reused across renders.
const okapiImg = new Image()
okapiImg.src = '/images/okapi-sprite.png'

interface Props {
  state: GameState
  startTime: number | null
}

interface Point {
  x: number
  y: number
}

function multiplierAt(elapsedSec: number) {
  return 1 + 0.06 * elapsedSec + Math.pow(0.06 * elapsedSec, 2)
}

export default function ClimbCurve({ state, startTime }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointsRef = useRef<Point[]>([])
  const rafRef = useRef<number>(0)
  const fadeAlphaRef = useRef<number>(1)
  const startRef = useRef<number | null>(null)
  const crashStartRef = useRef<number | null>(null)
  const crashAnchorRef = useRef<Point | null>(null)

  // Resize canvas to its container in device pixels
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const W = () => canvas.width / dpr
    const H = () => canvas.height / dpr

    // Reset on entering waiting / playing
    if (state === 'waiting') {
      pointsRef.current = []
      fadeAlphaRef.current = 1
      startRef.current = null
      crashStartRef.current = null
      crashAnchorRef.current = null
      ctx.clearRect(0, 0, W(), H())
      return
    }
    if (state === 'playing') {
      pointsRef.current = []
      startRef.current = startTime ?? performance.now()
      fadeAlphaRef.current = 1
      crashStartRef.current = null
      crashAnchorRef.current = null
    }

    let shakeT0 = state === 'crashed' ? performance.now() : 0
    if (state === 'crashed' && crashStartRef.current == null) {
      crashStartRef.current = performance.now()
      const pts = pointsRef.current
      crashAnchorRef.current = pts.length ? { ...pts[pts.length - 1] } : null
    }

    const draw = () => {
      const w = W()
      const h = H()
      ctx.clearRect(0, 0, w, h)

      // Compute new points while playing
      if (state === 'playing' && startRef.current != null) {
        const elapsed = (performance.now() - startRef.current) / 1000
        const m = multiplierAt(elapsed)

        // Map elapsed time -> X. Curve sweeps over ~20s of game time
        const SWEEP_SEC = 20
        const x = Math.min(w, (elapsed / SWEEP_SEC) * w)
        // Map multiplier -> Y (higher m = higher Y on screen = lower y px)
        // Use log-ish compression so high multipliers still fit
        const Y_PAD = 20
        const yNorm = Math.min(1, Math.log10(m) / Math.log10(20)) // 1x->0, 20x->1
        const y = h - Y_PAD - yNorm * (h - Y_PAD * 2)
        pointsRef.current.push({ x, y })
      }

      const pts = pointsRef.current
      if (pts.length > 1) {
        // Shake offset on crash
        let dx = 0
        let dy = 0
        if (state === 'crashed') {
          const t = performance.now() - shakeT0
          if (t < 500) {
            const amp = 6 * (1 - t / 500)
            dx = (Math.random() - 0.5) * amp * 2
            dy = (Math.random() - 0.5) * amp * 2
          }
        }

        const isCrashed = state === 'crashed'
        const stroke = isCrashed ? '#ef4444' : '#FFD700'
        const glow = isCrashed ? 'rgba(239,68,68,0.9)' : 'rgba(255,215,0,0.9)'

        ctx.save()
        ctx.translate(dx, dy)
        ctx.globalAlpha = fadeAlphaRef.current

        // Filled gradient under the curve for depth
        const grad = ctx.createLinearGradient(0, 0, 0, h)
        grad.addColorStop(0, isCrashed ? 'rgba(239,68,68,0.25)' : 'rgba(255,215,0,0.25)')
        grad.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.beginPath()
        ctx.moveTo(pts[0].x, h)
        for (const p of pts) ctx.lineTo(p.x, p.y)
        ctx.lineTo(pts[pts.length - 1].x, h)
        ctx.closePath()
        ctx.fillStyle = grad
        ctx.fill()

        // Glow line
        ctx.beginPath()
        ctx.moveTo(pts[0].x, pts[0].y)
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
        ctx.lineWidth = 3
        ctx.strokeStyle = stroke
        ctx.shadowBlur = 15
        ctx.shadowColor = glow
        ctx.lineJoin = 'round'
        ctx.lineCap = 'round'
        ctx.stroke()

        // Pulsing dot at tip (only while playing)
        if (state === 'playing') {
          const tip = pts[pts.length - 1]
          const pulse = 4 + Math.sin(performance.now() / 120) * 2
          ctx.beginPath()
          ctx.arc(tip.x, tip.y, pulse, 0, Math.PI * 2)
          ctx.fillStyle = '#FFD700'
          ctx.shadowBlur = 25
          ctx.shadowColor = 'rgba(255,215,0,1)'
          ctx.fill()
        }

        ctx.restore()

        // --- Okapi sprite at the tip of the curve ---
        if (okapiImg.complete && okapiImg.naturalWidth > 0) {
          const SIZE = 80
          const tip = pts[pts.length - 1]
          const prev = pts[Math.max(0, pts.length - 6)] // a few points back for stable angle

          if (state === 'playing' || state === 'cashedout') {
            const angle = Math.atan2(tip.y - prev.y, tip.x - prev.x)
            ctx.save()
            ctx.translate(tip.x + dx, tip.y + dy)
            ctx.rotate(angle)
            // Flip horizontally so the okapi faces the direction of climb
            ctx.scale(-1, 1)
            // Center horizontally; offset upward so feet (bottom of sprite) touch the curve
            ctx.drawImage(okapiImg, -SIZE / 2, -SIZE, SIZE, SIZE)
            ctx.restore()
          } else if (state === 'crashed') {
            const anchor = crashAnchorRef.current ?? tip
            const t0 = crashStartRef.current ?? performance.now()
            const t = Math.min(1, (performance.now() - t0) / 1000)
            const fallDist = h - anchor.y + SIZE
            const yOff = t * fallDist
            const rot = (t * Math.PI) / 2 // up to 90deg
            const alpha = 1 - t

            ctx.save()
            ctx.globalAlpha = alpha
            ctx.translate(anchor.x + dx, anchor.y + dy + yOff)
            ctx.rotate(rot)
            ctx.scale(-1, 1)
            ctx.drawImage(okapiImg, -SIZE / 2, -SIZE, SIZE, SIZE)
            ctx.restore()
          }
        }
      }

      // Fade out after crash so it smoothly disappears before next round
      if (state === 'crashed' || state === 'cashedout') {
        fadeAlphaRef.current = Math.max(0, fadeAlphaRef.current - 0.005)
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [state, startTime])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none${
        state === 'playing' ? ' okapi-run' : ''
      }`}
      style={{
        width: '100%',
        height: '100%',
        zIndex: 5,
      }}
    />
  )
}
