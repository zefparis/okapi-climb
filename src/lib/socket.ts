export type GameMessage =
  | { type: 'WAITING'; countdown: number }
  | { type: 'PLAYING'; startTime: number }
  | { type: 'TICK'; multiplier: number }
  | { type: 'CRASHED'; crashPoint: number }
  | { type: 'CASHOUT_CONFIRM'; multiplier: number; winAmount: number }
  | { type: 'HISTORY'; history: number[] }

export type Listener = (msg: GameMessage) => void

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001'

export class GameSocket {
  private ws: WebSocket | null = null
  private listeners = new Set<Listener>()
  private reconnectTimer: number | null = null

  connect() {
    if (this.ws && this.ws.readyState <= 1) return
    try {
      this.ws = new WebSocket(`${WS_URL}/ws`)
    } catch {
      this.scheduleReconnect()
      return
    }

    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as GameMessage
        this.listeners.forEach((l) => l(msg))
      } catch {
        /* ignore */
      }
    }
    this.ws.onclose = () => this.scheduleReconnect()
    this.ws.onerror = () => this.ws?.close()
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, 1500)
  }

  on(listener: Listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  send(data: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  close() {
    this.ws?.close()
    this.ws = null
  }
}

export const gameSocket = new GameSocket()
