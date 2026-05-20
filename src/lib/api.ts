const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export interface BetResponse {
  bet_id: string
  balance: number
}

export interface CashoutResponse {
  win_amount: number
  multiplier: number
  balance: number
}

export interface HistoryResponse {
  history: number[]
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API error ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  placeBet: (user_id: string, amount_cdf: number) =>
    request<BetResponse>('/api/game/bet', {
      method: 'POST',
      body: JSON.stringify({ user_id, amount_cdf }),
    }),
  cashout: (user_id: string, bet_id: string) =>
    request<CashoutResponse>('/api/game/cashout', {
      method: 'POST',
      body: JSON.stringify({ user_id, bet_id }),
    }),
  history: () => request<HistoryResponse>('/api/game/history'),
}
