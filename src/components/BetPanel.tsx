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
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
        width: '100%',
        height: '100%',
      }}
    >
      {/* Left: MISE */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#222',
            borderRadius: 8,
            padding: '0 10px',
            height: 36,
          }}
        >
          <input
            type="number"
            min={MIN_BET}
            max={MAX_BET}
            value={amount}
            disabled={!canBet}
            onChange={(e) => setAmount(clamp(Number(e.target.value)))}
            style={{
              flex: 1,
              background: 'transparent',
              color: 'white',
              fontSize: 18,
              border: 'none',
              outline: 'none',
              width: '100%',
              minWidth: 0,
              fontWeight: 600,
              opacity: canBet ? 1 : 0.5,
            }}
          />
          <span style={{ color: '#888', fontSize: 12 }}>CDF</span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 4,
          }}
        >
          {QUICK.map((q) => (
            <button
              key={q}
              disabled={!canBet}
              onClick={() => setAmount(q)}
              style={{
                background: '#333',
                color: '#FFD700',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 6,
                padding: '4px 0',
                border: 'none',
                cursor: canBet ? 'pointer' : 'not-allowed',
                opacity: canBet ? 1 : 0.5,
              }}
            >
              {quickLabel(q)}
            </button>
          ))}
        </div>

        <button
          disabled={!canBet}
          onClick={() => onPlaceBet(clamp(amount))}
          style={{
            background: 'linear-gradient(135deg, #FFD700, #F59E0B)',
            color: '#000000',
            fontWeight: 900,
            fontSize: 16,
            borderRadius: 8,
            border: 'none',
            flex: 1,
            minHeight: 40,
            letterSpacing: '0.08em',
            cursor: canBet ? 'pointer' : 'not-allowed',
            opacity: canBet ? 1 : 0.45,
          }}
        >
          MISER
        </button>
      </div>

      {/* Right: CASH OUT */}
      <button
        disabled={!canCashout}
        onClick={onCashout}
        style={{
          background: canCashout
            ? 'linear-gradient(135deg, #00A86B, #059669)'
            : '#1a1a1a',
          color: canCashout ? 'white' : '#444',
          borderRadius: 8,
          border: 'none',
          fontSize: 14,
          fontWeight: 900,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: canCashout ? 'pointer' : 'default',
          letterSpacing: '0.08em',
        }}
        className={canCashout ? 'animate-pulseStrong' : undefined}
      >
        <span>CASH OUT</span>
        <span style={{ fontSize: 24, marginTop: 4, letterSpacing: '0.04em' }}>
          ×{multiplier.toFixed(2)}
        </span>
      </button>
    </div>
  )
}
