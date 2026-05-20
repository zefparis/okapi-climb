import { useEffect, useMemo, useState } from 'react'

type GameState = 'waiting' | 'playing' | 'crashed' | 'cashedout'

interface Player {
  name: string
  bet: number
  cashoutAt: number | null // target multiplier (random)
  status: 'betting' | 'cashedout' | 'lost'
  cashedAtValue: number | null
}

interface Props {
  state: GameState
  multiplier: number
  crashPoint: number | null
}

const NAMES = [
  'Kinshasa01',
  'Matadi22',
  'Lubumbashi7',
  'Goma_King',
  'Kisangani_X',
  'Bukavu_Ace',
  'Kananga99',
  'Mbuji_Pro',
]

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export default function PlayersList({ state, multiplier, crashPoint }: Props) {
  const [players, setPlayers] = useState<Player[]>([])

  // Generate new bots each round (when state becomes waiting)
  useEffect(() => {
    if (state === 'waiting') {
      const count = rand(5, 8)
      const shuffled = [...NAMES].sort(() => Math.random() - 0.5).slice(0, count)
      setPlayers(
        shuffled.map((name) => ({
          name,
          bet: [500, 1000, 2000, 5000, 10000][rand(0, 4)],
          cashoutAt: Math.random() < 0.7 ? 1.2 + Math.random() * 5 : null,
          status: 'betting',
          cashedAtValue: null,
        })),
      )
    }
  }, [state])

  // During playing, mark bots that cashed out
  useEffect(() => {
    if (state !== 'playing') return
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.status !== 'betting') return p
        if (p.cashoutAt && multiplier >= p.cashoutAt) {
          return { ...p, status: 'cashedout', cashedAtValue: p.cashoutAt }
        }
        return p
      }),
    )
  }, [multiplier, state])

  // On crash, mark remaining as lost
  useEffect(() => {
    if (state === 'crashed') {
      setPlayers((prev) =>
        prev.map((p) => (p.status === 'betting' ? { ...p, status: 'lost' } : p)),
      )
    }
  }, [state, crashPoint])

  const sorted = useMemo(() => players, [players])

  return (
    <div className="bg-black/40 backdrop-blur-sm rounded-lg p-3 w-56 max-h-[60vh] overflow-y-auto no-scrollbar border border-white/10">
      <div className="text-xs uppercase tracking-widest text-white/60 mb-2">
        Joueurs
      </div>
      <div className="flex flex-col gap-1.5">
        {sorted.map((p) => (
          <div
            key={p.name}
            className="flex items-center justify-between text-xs bg-white/5 rounded px-2 py-1.5"
          >
            <div className="flex flex-col">
              <span className="text-white font-medium">{p.name}</span>
              <span className="text-white/50">
                {p.bet.toLocaleString()} CDF
              </span>
            </div>
            <div className="text-right">
              {p.status === 'betting' && (
                <span className="text-yellow-400">betting</span>
              )}
              {p.status === 'cashedout' && p.cashedAtValue && (
                <span className="text-green-400">
                  ×{p.cashedAtValue.toFixed(2)} ✓
                </span>
              )}
              {p.status === 'lost' && (
                <span className="text-red-400">💥 lost</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
