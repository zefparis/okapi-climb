import { useState } from 'react'

type GameState = 'waiting' | 'playing' | 'crashed' | 'cashedout'

interface Props {
  state: GameState
  multiplier: number
  hasBet: boolean
  onPlaceBet: (amount: number) => void
  onCashout: () => void
}

const QUICK = [500, 1000, 5000, 10000]
const MIN_BET = 500
const MAX_BET = 50000

export default function BetPanel({
  state,
  multiplier,
  hasBet,
  onPlaceBet,
  onCashout,
}: Props) {
  const [amount, setAmount] = useState<number>(1000)

  const canBet = state === 'waiting' && !hasBet
  const canCashout = state === 'playing' && hasBet

  const clamp = (n: number) =>
    Math.max(MIN_BET, Math.min(MAX_BET, Math.floor(n) || 0))

  const quickLabel = (n: number) =>
    n >= 1000 ? `${n / 1000}k` : `${n}`

  return (
    <div
      className="grid grid-cols-2 gap-2 w-full h-full"
      style={{ maxWidth: 720, margin: '0 auto' }}
    >
      {/* Left column: bet input + quick chips + MISER */}
      <div className="flex flex-col gap-1.5 h-full">
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={MIN_BET}
            max={MAX_BET}
            value={amount}
            disabled={!canBet}
            onChange={(e) => setAmount(clamp(Number(e.target.value)))}
            className="flex-1 bg-white/10 border border-white/15 rounded-md px-2 text-white font-semibold focus:outline-none focus:border-gold disabled:opacity-50"
            style={{ height: 36, fontSize: 14 }}
          />
          <span className="text-white/60" style={{ fontSize: 11 }}>CDF</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {QUICK.map((q) => (
            <button
              key={q}
              disabled={!canBet}
              onClick={() => setAmount(q)}
              className="bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10 rounded-md text-white leading-none"
              style={{ fontSize: 11, height: 26 }}
            >
              {quickLabel(q)}
            </button>
          ))}
        </div>
        <button
          disabled={!canBet}
          onClick={() => onPlaceBet(clamp(amount))}
          className="w-full rounded-lg text-black disabled:opacity-40 disabled:cursor-not-allowed shadow-lg hover:brightness-110 transition"
          style={{
            height: 40,
            background: 'linear-gradient(135deg, #FFD700, #F59E0B)',
            color: '#000000',
            fontWeight: 900,
            fontSize: 14,
            letterSpacing: '0.08em',
          }}
        >
          MISER
        </button>
      </div>

      {/* Right column: single large CASH OUT button */}
      <button
        disabled={!canCashout}
        onClick={onCashout}
        className={`w-full h-full rounded-lg text-white shadow-lg transition flex flex-col items-center justify-center leading-none ${
          canCashout ? 'animate-pulseStrong' : 'cursor-not-allowed'
        }`}
        style={{
          background: canCashout ? '#00A86B' : '#4b5563',
          opacity: canCashout ? 1 : 0.55,
        }}
      >
        <span
          className="font-bebas tracking-widest"
          style={{ fontSize: 18 }}
        >
          CASH OUT
        </span>
        <span
          className="font-bebas mt-1"
          style={{ fontSize: 36, letterSpacing: '0.04em' }}
        >
          ×{multiplier.toFixed(2)}
        </span>
      </button>
    </div>
  )
}
