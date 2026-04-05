import { useActivePool } from '@/store/poolStore'
import { formatBigInt } from '@/utils/formatters'

export default function TickMap() {
  const { pool } = useActivePool()
  if (!pool) return null

  const ticks = Array.from(pool.ticks.entries()).sort((a, b) => a[0] - b[0])
  if (ticks.length === 0) {
    return (
      <div className="bg-bg-secondary rounded-2xl border border-border p-8">
        <h2 className="text-xl font-semibold mb-4">Tick 映射</h2>
        <p className="text-text-muted text-base">暂无 Tick 数据，请先添加流动性</p>
      </div>
    )
  }

  const maxLiquidity = Math.max(...ticks.map(([, t]) => Number(t.liquidityGross)), 1)
  const currentTick = pool.slot0.tick

  return (
    <div className="bg-bg-secondary rounded-2xl border border-border p-8">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
        <span className="w-3 h-3 rounded-full bg-warning"></span>
        Tick 映射
        <span className="tooltip info-icon" data-tip="每个 Tick 代表一个价格点。liquidityGross 是该 Tick 上的总流动性，liquidityNet 的正负表示进入/离开该 Tick 时流动性的增减">?</span>
      </h2>
      <div className="space-y-3">
        {ticks.map(([tick, info]) => {
          const height = (Number(info.liquidityGross) / maxLiquidity) * 100
          const inRange = tick <= currentTick
          return (
            <div key={tick} className="flex items-center gap-4">
              <div className="w-24 text-right text-sm font-mono text-text-secondary tooltip" data-tip={`Tick ${tick}，对应价格 ${Math.pow(1.0001, tick).toFixed(6)}`}>
                {tick > 0 ? '+' : ''}{tick}
              </div>
              <div className="flex-1 bg-bg-tertiary rounded-xl h-9 relative overflow-hidden">
                <div
                  className={`h-full rounded-xl transition-all ${info.liquidityNet > 0n ? 'bg-accent/70' : 'bg-warning/70'}`}
                  style={{ width: `${Math.max(height, 8)}%` }}
                />
                <div className="absolute inset-0 flex items-center px-4 text-sm font-mono">
                  {formatBigInt(info.liquidityGross, 0)}
                </div>
              </div>
              <div className={`w-3 h-3 rounded-full ${inRange ? 'bg-success' : 'bg-text-muted'}`} title={inRange ? '在当前价格范围内' : '在当前价格范围外'} />
            </div>
          )
        })}
      </div>
      <div className="mt-5 pt-5 border-t border-border flex gap-6 text-sm text-text-muted">
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-accent/70"></span>
          <span className="tooltip" data-tip="liquidityNet > 0: 价格从低到高穿越此 Tick 时，流动性增加（范围起始点）">净流入 (+)</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-warning/70"></span>
          <span className="tooltip" data-tip="liquidityNet < 0: 价格从低到高穿越此 Tick 时，流动性减少（范围结束点）">净流出 (-)</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-success"></span>
          <span className="tooltip" data-tip="绿色圆点表示该 Tick 在当前价格左侧（已被穿越），灰色表示在右侧">范围内</span>
        </span>
        <span className="flex items-center gap-2 ml-auto">
          <span className="text-sm">当前 Tick: <span className="text-text-primary font-mono">{currentTick}</span></span>
        </span>
      </div>
    </div>
  )
}
