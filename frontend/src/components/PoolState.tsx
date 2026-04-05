import { useActivePool } from '@/store/poolStore'
import { formatBigInt, sqrtPriceToPrice } from '@/utils/formatters'

export default function PoolState() {
  const { pool } = useActivePool()
  if (!pool) return null

  const price = sqrtPriceToPrice(pool.slot0.sqrtPriceX96)

  return (
    <div className="bg-bg-secondary rounded-2xl border border-border p-8">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
        <span className="w-3 h-3 rounded-full bg-success"></span>
        资金池状态
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <StatCard
          label="sqrtPriceX96"
          value={formatBigInt(pool.slot0.sqrtPriceX96, 0)}
          tip="价格的平方根乘以 2^96，Uniswap V3 内部使用的定点数价格表示。使用 96 位小数精度来避免浮点运算"
        />
        <StatCard
          label="当前 Tick"
          value={pool.slot0.tick.toString()}
          tip="当前价格对应的 Tick 值。Tick 和价格的关系为 P = 1.0001^tick。Tick 每增加 1，价格变化约 0.01%"
        />
        <StatCard
          label="当前价格"
          value={price.toFixed(6)}
          tip="Token0 兑换 Token1 的实际价格，即 1 个 Token0 可以兑换多少 Token1。由 sqrtPriceX96 的平方计算得出"
        />
        <StatCard
          label="流动性"
          value={formatBigInt(pool.liquidity, 0)}
          tip="当前活跃价格范围内的总流动性 L。L = √(x × y)，流动性越大，交易滑点越小。只有价格在当前 Tick 范围内时流动性才生效"
        />
        <StatCard
          label="手续费增长 0"
          value={formatBigInt(pool.feeGrowthGlobal0X128, 0)}
          tip="全局累计的 Token0 手续费增长率，以 Q128 格式存储。用于计算每个仓位应得的手续费"
        />
        <StatCard
          label="手续费增长 1"
          value={formatBigInt(pool.feeGrowthGlobal1X128, 0)}
          tip="全局累计的 Token1 手续费增长率，以 Q128 格式存储。用于计算每个仓位应得的手续费"
        />
        <StatCard
          label="费率"
          value={`${pool.fee / 10000}%`}
          tip="每笔交易收取的手续费比例。例如 0.3% 表示每笔交易的 0.3% 作为手续费分配给该价格范围内的 LP"
        />
        <StatCard
          label="Tick 间距"
          value={pool.tickSpacing.toString()}
          tip="Tick 的粒度，决定了流动性可以部署的最小间隔。0.05% 费率对应 10，0.3% 对应 60，1% 对应 200"
        />
      </div>
    </div>
  )
}

function StatCard({ label, value, tip }: { label: string; value: string; tip: string }) {
  return (
    <div className="tooltip bg-bg-tertiary rounded-xl p-5" data-tip={tip}>
      <div className="text-sm text-text-muted mb-2">{label}</div>
      <div className="text-base font-mono text-text-primary truncate" title={value}>{value}</div>
    </div>
  )
}
