import { useEffect, useState } from 'react'
import GameScreen from './components/GameScreen'
import { gameSocket } from './lib/socket'

export default function App() {
  const [balance, setBalance] = useState<number>(25000)
  const [userId] = useState<string>(() => {
    const stored = localStorage.getItem('okapi_user_id')
    if (stored) return stored
    const newId = crypto.randomUUID()
    localStorage.setItem('okapi_user_id', newId)
    return newId
  })

  useEffect(() => {
    gameSocket.connect()
    return () => gameSocket.close()
  }, [])

  return (
    <GameScreen
      userId={userId}
      balance={balance}
      setBalance={setBalance}
    />
  )
}
