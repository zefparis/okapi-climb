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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-3xl mx-auto">
      {/* Section A: Place bet */}
      <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-4">
        <div className="text-xs uppercase tracking-widest text-white/60 mb-2">
          Mise
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="number"
            min={MIN_BET}
            max={MAX_BET}
            value={amount}
            disabled={!canBet}
            onChange={(e) => setAmount(clamp(Number(e.target.value)))}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-lg font-semibold focus:outline-none focus:border-gold disabled:opacity-50"
          />
          <span className="text-white/60 text-sm">CDF</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {QUICK.map((q) => (
            <button
              key={q}
              disabled={!canBet}
              onClick={() => setAmount(q)}
              className="bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10 rounded-md py-1.5 text-xs text-white"
            >
              {q.toLocaleString()}
            </button>
          ))}
        </div>
        <button
          disabled={!canBet}
          onClick={() => onPlaceBet(clamp(amount))}
          className="w-full py-3 rounded-lg font-bebas tracking-widest text-xl bg-gradient-to-b from-yellow-300 to-yellow-600 text-black disabled:opacity-40 disabled:cursor-not-allowed shadow-lg hover:brightness-110 transition"
        >
          MISER
        </button>
      </div>

      {/* Section B: Cashout */}
      <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-4 flex flex-col">
        <div className="text-xs uppercase tracking-widest text-white/60 mb-2">
          Retrait
        </div>
        <button
          disabled={!canCashout}
          onClick={onCashout}
          className={`flex-1 min-h-[120px] w-full rounded-lg font-bebas tracking-widest text-3xl text-white shadow-lg transition ${
            canCashout
              ? 'bg-green-600 hover:bg-green-500 animate-pulseStrong'
              : 'bg-green-900/40 cursor-not-allowed opacity-50'
          }`}
        >
          CASH OUT ×{multiplier.toFixed(2)}
        </button>
      </div>
    </div>
  )
}
