import { useActivePool } from '@/store/poolStore'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function LiquidityChart() {
  const { pool } = useActivePool()
  if (!pool) return null

  const ticks = Array.from(pool.ticks.entries()).sort((a, b) => a[0] - b[0])
  if (ticks.length < 2) {
    return (
      <div className="bg-bg-secondary rounded-2xl border border-border p-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-accent"></span>
          流动性分布
          <span className="tooltip info-icon" data-tip="展示每个 Tick 区间内的流动性大小。柱子越高表示该价格区间的流动性越充足，交易滑点越小">?</span>
        </h2>
        <p className="text-text-muted text-base">需要至少两个 Tick 才能显示分布图</p>
      </div>
    )
  }

  const data = ticks.map(([tick, info], i) => {
    const nextTick = ticks[i + 1]?.[0] ?? tick + pool.tickSpacing
    return {
      tick,
      nextTick,
      range: `${tick} ~ ${nextTick}`,
      liquidity: Number(info.liquidityGross),
      net: Number(info.liquidityNet),
    }
  })

  return (
    <div className="bg-bg-secondary rounded-2xl border border-border p-8">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
        <span className="w-3 h-3 rounded-full bg-accent"></span>
        流动性分布
        <span className="tooltip info-icon" data-tip="展示每个 Tick 区间内的流动性大小。柱子越高表示该价格区间的流动性越充足，交易滑点越小">?</span>
      </h2>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data}>
          <XAxis
            dataKey="range"
            tick={{ fill: '#9aa0b0', fontSize: 13 }}
            axisLine={{ stroke: '#333852' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#9aa0b0', fontSize: 13 }}
            axisLine={{ stroke: '#333852' }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1d29',
              border: '1px solid #333852',
              borderRadius: '10px',
              fontSize: '14px',
            }}
            labelStyle={{ color: '#9aa0b0', fontSize: '13px' }}
            itemStyle={{ color: '#e8eaed', fontSize: '13px' }}
            formatter={(value) => {
              const num = typeof value === 'number' ? value.toLocaleString() : String(value)
              return [num, '流动性']
            }}
          />
          <Bar dataKey="liquidity" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.net > 0 ? '#6366f1' : '#f59e0b'}
                fillOpacity={0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
