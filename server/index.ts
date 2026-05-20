import 'dotenv/config'
import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import { randomUUID } from 'node:crypto'
import { engine } from './game.js'
import { getSupabase, adjustBalance } from './lib/supabase.js'

const PORT = Number(process.env.PORT) || 3001

const app = Fastify({ logger: true })

await app.register(websocket)

// CORS (basic, dev-friendly)
app.addHook('onSend', async (_req, reply, payload) => {
  reply.header('Access-Control-Allow-Origin', '*')
  reply.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  reply.header('Access-Control-Allow-Headers', 'Content-Type')
  return payload
})
app.options('/*', async (_req, reply) => reply.send())

// --- WebSocket ---
// Minimal duck type so we don't need @types/ws
type WSLike = {
  send: (data: string) => void
  on: (event: string, cb: (...args: any[]) => void) => void
}
const sockets = new Set<WSLike>()

app.get('/ws', { websocket: true }, (socket: any) => {
  // @fastify/websocket v10+: handler receives the WebSocket directly
  const ws = socket as WSLike
  sockets.add(ws)

  // Send current state + history on connect
  ws.send(JSON.stringify({ type: 'HISTORY', history: engine.history }))
  const info = engine.info()
  if (info.state === 'PLAYING' && info.startTime) {
    ws.send(JSON.stringify({ type: 'PLAYING', startTime: info.startTime }))
  }

  ws.on('close', () => sockets.delete(ws))
})

engine.on('broadcast', (msg: unknown) => {
  const data = JSON.stringify(msg)
  for (const ws of sockets) {
    try {
      ws.send(data)
    } catch {
      /* ignore */
    }
  }
})

// --- REST routes ---

interface BetBody {
  user_id: string
  amount_cdf: number
}

app.post<{ Body: BetBody }>('/api/game/bet', async (req, reply) => {
  const { user_id, amount_cdf } = req.body || ({} as BetBody)
  if (!user_id || !amount_cdf || amount_cdf < 500 || amount_cdf > 50_000) {
    return reply.code(400).send({ error: 'Invalid bet' })
  }
  if (engine.state !== 'WAITING') {
    return reply.code(409).send({ error: 'Betting closed' })
  }

  // Deduct balance
  let balance: number | null = null
  try {
    balance = await adjustBalance(user_id, -amount_cdf)
  } catch (e: any) {
    return reply.code(400).send({ error: e.message || 'Balance error' })
  }

  const bet_id = randomUUID()

  // Persist bet (best-effort)
  const sb = getSupabase()
  if (sb) {
    try {
      await sb.from('okapi_bets').insert({
        id: bet_id,
        user_id,
        round_id: engine.info().round_id,
        amount_cdf,
        status: 'pending',
      })
    } catch (e) {
      app.log.error({ e }, 'failed to insert bet')
    }
  }

  engine.registerBet({
    bet_id,
    user_id,
    amount_cdf,
    round_id: engine.info().round_id,
    cashed_out: false,
  })

  return reply.send({ bet_id, balance: balance ?? 0 })
})

interface CashoutBody {
  user_id: string
  bet_id: string
}

app.post<{ Body: CashoutBody }>('/api/game/cashout', async (req, reply) => {
  const { user_id, bet_id } = req.body || ({} as CashoutBody)
  if (!user_id || !bet_id) {
    return reply.code(400).send({ error: 'Invalid request' })
  }
  if (engine.state !== 'PLAYING') {
    return reply.code(409).send({ error: 'Game not running' })
  }

  const bet = engine.getBet(bet_id)
  if (!bet || bet.user_id !== user_id) {
    return reply.code(404).send({ error: 'Bet not found' })
  }
  if (bet.cashed_out) {
    return reply.code(409).send({ error: 'Already cashed out' })
  }

  const multiplier = engine.currentMultiplier()
  if (engine.crashPoint != null && multiplier >= engine.crashPoint) {
    return reply.code(409).send({ error: 'Too late' })
  }

  const win_amount = Math.floor(bet.amount_cdf * multiplier)

  let balance: number | null = null
  try {
    balance = await adjustBalance(user_id, win_amount)
  } catch (e: any) {
    return reply.code(500).send({ error: e.message || 'Balance error' })
  }

  bet.cashed_out = true
  bet.cashout_multiplier = multiplier

  const sb = getSupabase()
  if (sb) {
    try {
      await sb
        .from('okapi_bets')
        .update({
          cashout_multiplier: multiplier,
          win_amount_cdf: win_amount,
          status: 'won',
        })
        .eq('id', bet_id)
    } catch (e) {
      app.log.error({ e }, 'failed to update bet')
    }
  }

  // Notify all clients (so they see player wins)
  for (const ws of sockets) {
    try {
      ws.send(
        JSON.stringify({
          type: 'CASHOUT_CONFIRM',
          multiplier,
          winAmount: win_amount,
        }),
      )
    } catch {
      /* ignore */
    }
  }

  return reply.send({
    win_amount,
    multiplier,
    balance: balance ?? 0,
  })
})

app.get('/api/game/history', async (_req, reply) => {
  const sb = getSupabase()
  if (!sb) {
    return reply.send({ history: engine.history.slice(0, 20) })
  }
  try {
    const { data, error } = await sb
      .from('okapi_rounds')
      .select('crash_point')
      .order('started_at', { ascending: false })
      .limit(20)
    if (error) throw error
    return reply.send({
      history: (data ?? []).map((r: any) => Number(r.crash_point)),
    })
  } catch {
    return reply.send({ history: engine.history.slice(0, 20) })
  }
})

app.get('/api/health', async () => ({ ok: true, state: engine.state }))

// Start
engine.start()
app
  .listen({ port: PORT, host: '0.0.0.0' })
  .then(() => app.log.info(`Okapi Climb server listening on ${PORT}`))
  .catch((err) => {
    app.log.error(err)
    process.exit(1)
  })
