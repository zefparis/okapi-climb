interface Props {
  history: number[]
}

export default function CrashHistory({ history }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 px-2">
      {history.slice(0, 10).map((m, i) => {
        const good = m >= 2
        return (
          <div
            key={i}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
              good
                ? 'bg-green-600/80 text-white'
                : 'bg-red-600/80 text-white'
            }`}
          >
            ×{m.toFixed(2)}
          </div>
        )
      })}
      {history.length === 0 && (
        <div className="text-xs text-white/50 px-2 py-1">No history yet</div>
      )}
    </div>
  )
}
