import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

type GameState = 'waiting' | 'playing' | 'crashed' | 'cashedout'

interface Props {
  state: GameState
  startTime: number | null
  crashPoint: number | null
  cashoutMultiplier: number | null
  onTick?: (m: number) => void
}

function computeMultiplier(elapsedSec: number) {
  const t = elapsedSec
  return 1 + 0.06 * t + Math.pow(0.06 * t, 2)
}

export default function MultiplierDisplay({
  state,
  startTime,
  crashPoint,
  cashoutMultiplier,
  onTick,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const currentRef = useRef<number>(1)
  const [displayM, setDisplayM] = useState<number>(1)

  useEffect(() => {
    if (state !== 'playing' || !startTime) return

    let lastUiUpdate = 0
    const tickerFn = () => {
      const elapsed = (performance.now() - startTime) / 1000
      const m = Math.max(1, computeMultiplier(elapsed))
      currentRef.current = m
      if (ref.current) {
        ref.current.textContent = `×${m.toFixed(2)}`
      }
      // throttle state updates (for size tier) to ~10fps
      const now = performance.now()
      if (now - lastUiUpdate > 100) {
        lastUiUpdate = now
        setDisplayM(m)
      }
      onTick?.(m)
    }

    gsap.ticker.add(tickerFn)
    return () => {
      gsap.ticker.remove(tickerFn)
    }
  }, [state, startTime, onTick])

  // Subtle GSAP scale pulse every 500ms during playing
  useEffect(() => {
    if (state !== 'playing' || !ref.current) return
    const el = ref.current
    gsap.set(el, { scale: 1 })
    const tween = gsap.to(el, {
      scale: 1.06,
      duration: 0.25,
      yoyo: true,
      repeat: -1,
      repeatDelay: 0.25,
      ease: 'sine.inOut',
    })
    return () => {
      tween.kill()
      gsap.set(el, { scale: 1 })
    }
  }, [state])

  // Reset displayed value on state change to non-playing
  useEffect(() => {
    if (!ref.current) return
    if (state === 'waiting') {
      ref.current.textContent = `×1.00`
      currentRef.current = 1
      setDisplayM(1)
    } else if (state === 'crashed' && crashPoint != null) {
      ref.current.textContent = `×${crashPoint.toFixed(2)}`
      setDisplayM(crashPoint)
    } else if (state === 'cashedout' && cashoutMultiplier != null) {
      ref.current.textContent = `×${cashoutMultiplier.toFixed(2)}`
      setDisplayM(cashoutMultiplier)
    }
  }, [state, crashPoint, cashoutMultiplier])

  // Responsive font size progression (mobile-first; scales up on larger screens)
  let fontSize = 'clamp(3.5rem, 14vw, 5rem)'
  if (displayM >= 10) fontSize = 'clamp(5rem, 20vw, 7rem)'
  else if (displayM >= 5) fontSize = 'clamp(4.5rem, 18vw, 6.5rem)'
  else if (displayM >= 2) fontSize = 'clamp(4rem, 16vw, 6rem)'

  // Extra glow when >= 10x
  const extraGlow =
    state !== 'crashed' && displayM >= 10
      ? {
          textShadow:
            '0 0 8px rgba(255,215,0,1), 0 0 18px rgba(255,165,0,0.9), 0 0 40px rgba(255,140,0,0.8), 0 0 80px rgba(255,100,0,0.6)',
        }
      : {}

  const color =
    state === 'crashed'
      ? 'text-red-500'
      : state === 'cashedout'
      ? 'text-green-400'
      : 'text-gold neon-gold'

  return (
    <div className="flex flex-col items-center justify-center select-none">
      <div
        ref={ref}
        className={`font-bebas ${color}`}
        style={{
          fontSize,
          lineHeight: 1,
          letterSpacing: '0.05em',
          transition: 'font-size 250ms ease-out',
          ...extraGlow,
        }}
      >
        ×1.00
      </div>
      {state === 'crashed' && (
        <div className="mt-2 text-red-400 text-xl font-bebas tracking-widest">
          CRASHED
        </div>
      )}
      {state === 'cashedout' && (
        <div className="mt-2 text-green-300 text-xl font-bebas tracking-widest">
          CASHED OUT
        </div>
      )}
    </div>
  )
}
