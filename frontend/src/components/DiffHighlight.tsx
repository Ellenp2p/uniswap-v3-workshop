import { formatBigInt } from '@/utils/formatters'

export default function DiffHighlight({
  label,
  before,
  after,
  decimals = 0,
}: {
  label: string
  before: string
  after: string
  decimals?: number
}) {
  if (before === after) {
    return (
      <div className="flex items-center justify-between py-2.5 text-sm">
        <span className="text-text-secondary">{label}</span>
        <span className="font-mono text-text-muted ml-6 truncate max-w-56" title={after}>
          {formatBigInt(BigInt(after || '0'), decimals)}
        </span>
      </div>
    )
  }

  const beforeNum = BigInt(before || '0')
  const afterNum = BigInt(after || '0')
  const diff = afterNum - beforeNum
  const isPositive = diff > 0n
  const absDiff = isPositive ? diff : -diff

  return (
    <div className="flex items-center justify-between py-2.5 text-sm">
      <span className="text-text-secondary">{label}</span>
      <div className="ml-6 text-right">
        <div className="font-mono text-text-primary truncate max-w-56" title={after}>
          {formatBigInt(afterNum, decimals)}
        </div>
        <div className={`font-mono text-sm ${isPositive ? 'text-success' : 'text-danger'}`}>
          {isPositive ? '+' : '-'}{formatBigInt(absDiff, decimals)}
        </div>
      </div>
    </div>
  )
}
