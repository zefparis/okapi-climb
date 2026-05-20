import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { gameSocket } from '../lib/socket'
import type { GameMessage } from '../lib/socket'
import { api } from '../lib/api'
import MultiplierDisplay from './MultiplierDisplay'
import CrashHistory from './CrashHistory'
import PlayersList from './PlayersList'
import BetPanel from './BetPanel'
import ClimbCurve from './ClimbCurve'

type GameState = 'waiting' | 'playing' | 'crashed' | 'cashedout'

interface Props {
  userId: string
  balance: number
  setBalance: (n: number) => void
}

type BgKey = 'climb' | 'slip' | 'crash' | 'win'

const BG_MAP: Record<BgKey, string> = {
  climb: '/images/okapi-climb.png',
  slip: '/images/okapi-slip.png',
  crash: '/images/okapi-crash.png',
  win: '/images/okapi-win.png',
}

export default function GameScreen({ userId, balance, setBalance }: Props) {
  const [state, setState] = useState<GameState>('waiting')
  const [countdown, setCountdown] = useState<number>(5)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [crashPoint, setCrashPoint] = useState<number | null>(null)
  const [cashoutMultiplier, setCashoutMultiplier] = useState<number | null>(null)
  const [history, setHistory] = useState<number[]>([])
  const [multiplier, setMultiplier] = useState<number>(1)

  const [betId, setBetId] = useState<string | null>(null)
  const hasBetRef = useRef(false)

  // Load history initially
  useEffect(() => {
    api.history().then((r) => setHistory(r.history)).catch(() => {})
  }, [])

  // Subscribe to socket events
  useEffect(() => {
    const off = gameSocket.on((msg: GameMessage) => {
      switch (msg.type) {
        case 'WAITING':
          setState('waiting')
          setCountdown(msg.countdown)
          setCrashPoint(null)
          setCashoutMultiplier(null)
          setMultiplier(1)
          setBetId(null)
          hasBetRef.current = false
          break
        case 'PLAYING':
          setState('playing')
          setStartTime(msg.startTime)
          break
        case 'CRASHED':
          setState((prev) => (prev === 'cashedout' ? 'cashedout' : 'crashed'))
          setCrashPoint(msg.crashPoint)
          setHistory((h) => [msg.crashPoint, ...h].slice(0, 20))
          break
        case 'HISTORY':
          setHistory(msg.history)
          break
      }
    })
    return () => {
      off()
    }
  }, [])

  // Local fallback state machine if no server is connected
  // (keeps UI alive in dev with no backend)
  useEffect(() => {
    let raf = 0
    let timer: number | null = null
    let localCrash = 0

    function startWaiting() {
      setState('waiting')
      setMultiplier(1)
      setCrashPoint(null)
      setCashoutMultiplier(null)
      setBetId(null)
      hasBetRef.current = false
      let c = 5
      setCountdown(c)
      timer = window.setInterval(() => {
        c -= 1
        setCountdown(c)
        if (c <= 0) {
          if (timer) window.clearInterval(timer)
          startPlaying()
        }
      }, 1000)
    }

    function startPlaying() {
      // Generate local crash point (same algorithm style)
      const r = Math.random()
      localCrash = r < 0.05 ? 1.0 : Math.max(1.0, (1 / (1 - r)) * 0.95)
      const t0 = performance.now()
      setStartTime(t0)
      setState('playing')
      const loop = () => {
        const elapsed = (performance.now() - t0) / 1000
        const m = 1 + 0.06 * elapsed + Math.pow(0.06 * elapsed, 2)
        setMultiplier(m)
        if (m >= localCrash) {
          setCrashPoint(localCrash)
          setHistory((h) => [localCrash, ...h].slice(0, 20))
          setState((prev) => (prev === 'cashedout' ? 'cashedout' : 'crashed'))
          timer = window.setTimeout(() => startWaiting(), 3000)
          return
        }
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    }

    // Only run fallback if no server message received within 2s
    const fallback = window.setTimeout(() => {
      startWaiting()
    }, 2000)

    return () => {
      window.clearTimeout(fallback)
      if (timer) {
        window.clearInterval(timer)
        window.clearTimeout(timer)
      }
      cancelAnimationFrame(raf)
    }
  }, [])

  // Background selection
  const bgKey: BgKey = useMemo(() => {
    if (state === 'cashedout') return 'win'
    if (state === 'crashed') return 'crash'
    if (state === 'playing') {
      if (multiplier >= 6) return 'slip'
      if (multiplier >= 3) return 'slip'
      return 'climb'
    }
    return 'climb'
  }, [state, multiplier])

  const onTick = useCallback((m: number) => {
    setMultiplier(m)
  }, [])

  const handlePlaceBet = async (amount: number) => {
    // Optimistic local
    setBalance(balance - amount)
    hasBetRef.current = true
    try {
      const res = await api.placeBet(userId, amount)
      setBetId(res.bet_id)
      setBalance(res.balance)
    } catch {
      // Offline / no server: fake bet id
      setBetId(`local-${Date.now()}`)
    }
  }

  const handleCashout = async () => {
    if (!hasBetRef.current) return
    const localM = multiplier
    setState('cashedout')
    setCashoutMultiplier(localM)
    try {
      if (betId && !betId.startsWith('local-')) {
        const res = await api.cashout(userId, betId)
        setCashoutMultiplier(res.multiplier)
        setBalance(res.balance)
      } else {
        // local credit
        // we don't know original bet amount here; skip
      }
    } catch {
      /* ignore */
    }
  }

  const okapiAnimClass =
    state === 'playing'
      ? 'okapi-climbing'
      : state === 'crashed'
      ? 'okapi-crashed'
      : ''

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white">
      {/* Fullscreen background with crossfade */}
      <AnimatePresence>
        <motion.div
          key={bgKey}
          className="bg-fixed-fullscreen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
          <img
            src={BG_MAP[bgKey]}
            alt="okapi"
            className={okapiAnimClass}
            draggable={false}
          />
        </motion.div>
      </AnimatePresence>

      {/* Dark gradient overlay for readability */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/80 pointer-events-none" style={{ zIndex: 1 }} />

      {/* Climbing curve canvas (above background, below UI) */}
      <ClimbCurve state={state} startTime={startTime} />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-3">
        <div className="text-sm text-white/80 font-semibold tracking-widest">
          CONGO <span className="text-gold">GAMING</span>
        </div>
        <div className="font-bebas text-3xl neon-gold tracking-widest">
          OKAPI CLIMB
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase text-white/60 tracking-widest">
            Solde
          </div>
          <div className="text-gold font-bebas text-xl tracking-wider">
            {balance.toLocaleString()} CDF
          </div>
        </div>
      </div>

      {/* Crash history */}
      <div className="relative z-10 px-4">
        <CrashHistory history={history} />
      </div>

      {/* Players list (left) — desktop only */}
      <div className="absolute left-4 top-32 z-10 hidden md:block">
        <PlayersList
          state={state}
          multiplier={multiplier}
          crashPoint={crashPoint}
        />
      </div>

      {/* Center multiplier */}
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          {state === 'waiting' && (
            <div className="mb-3 text-white/70 font-bebas text-2xl tracking-widest">
              PROCHAIN TOUR DANS {countdown}s
            </div>
          )}
          <MultiplierDisplay
            state={state}
            startTime={startTime}
            crashPoint={crashPoint}
            cashoutMultiplier={cashoutMultiplier}
            onTick={onTick}
          />
        </div>
      </div>

      {/* Bottom bet panel: fixed, full width on mobile, max 500px centered on desktop */}
      <div className="fixed bottom-0 left-0 right-0 z-10 p-3 sm:p-4">
        <div className="w-full md:max-w-[500px] mx-auto">
          <BetPanel
            state={state}
            multiplier={multiplier}
            hasBet={hasBetRef.current}
            onPlaceBet={handlePlaceBet}
            onCashout={handleCashout}
          />
        </div>
      </div>
    </div>
  )
}
