import { useState } from 'react'
import { useStore, useActivePool } from '@/store/poolStore'
import { FeeTier } from '@uniswap-v3/core/index.js'

export default function PoolList() {
  const pools = useStore(s => s.poolMeta)
  const activePoolId = useStore(s => s.activePoolId)
  const switchPool = useStore(s => s.switchPool)
  const deletePool = useStore(s => s.deletePool)
  const [showCreate, setShowCreate] = useState(false)

  const poolEntries = Object.values(pools)

  return (
    <div className="px-4 pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-text-primary">资金池</h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="text-sm px-3 py-1.5 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 transition-colors font-medium"
        >
          {showCreate ? '取消' : '+ 新建'}
        </button>
      </div>

      {showCreate && <CreateForm onCreated={() => setShowCreate(false)} />}

      {poolEntries.length === 0 ? (
        <div className="text-center py-8 text-text-muted">
          <div className="text-3xl mb-3">🏊</div>
          <p className="text-sm">还没有资金池</p>
          <p className="text-xs mt-1">点击上方"新建"创建第一个池子</p>
        </div>
      ) : (
        <div className="space-y-2">
          {poolEntries.map(meta => (
            <PoolCard
              key={meta.id}
              meta={meta}
              isActive={meta.id === activePoolId}
              onSelect={() => switchPool(meta.id)}
              onDelete={() => deletePool(meta.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PoolCard({
  meta,
  isActive,
  onSelect,
  onDelete,
}: {
  meta: { id: string; name: string; feeTier: FeeTier; initialTick: number }
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  const price = Math.pow(1.0001, meta.initialTick)

  return (
    <div
      className={`rounded-lg border transition-all cursor-pointer group ${
        isActive
          ? 'bg-accent/10 border-accent/40 shadow-sm'
          : 'bg-bg-tertiary border-border hover:bg-bg-hover'
      }`}
      onClick={onSelect}
    >
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-sm">{meta.name}</div>
            <div className="text-xs text-text-muted mt-0.5">
              费率 {meta.feeTier / 10000}% · 初始 Tick {meta.initialTick} · 价格 {price.toFixed(4)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isActive && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-white font-medium">当前</span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition-all p-1"
              title="删除池子"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CreateForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('ETH/USDC')
  const [feeTier, setFeeTier] = useState(FeeTier.LOW)
  const [initialTick, setInitialTick] = useState('0')
  const [defaultLiquidity, setDefaultLiquidity] = useState('1000')
  const createPool = useStore(s => s.createPool)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const tick = Number(initialTick)
      const liq = Number(defaultLiquidity)
      if (isNaN(tick)) {
        setError('请输入有效的 Tick 值')
        return
      }
      if (isNaN(liq) || liq <= 0) {
        setError('流动性数量必须大于 0')
        return
      }
      if (!name.trim()) {
        setError('请输入池子名称')
        return
      }
      createPool(name.trim(), feeTier, tick, BigInt(Math.floor(liq * 1e18)))
      onCreated()
    } catch (err: any) {
      setError(err.message || '创建失败')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-bg-tertiary rounded-lg border border-border p-4 space-y-3">
      <div>
        <label className="text-sm text-text-secondary mb-1 block">池子名称</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="例如: ETH/USDC"
          className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 placeholder:text-text-muted/50"
        />
      </div>

      <div>
        <label className="text-sm text-text-secondary mb-1 block">费率层级</label>
        <select
          value={feeTier}
          onChange={e => setFeeTier(Number(e.target.value) as FeeTier)}
          className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          <option value={FeeTier.LOWEST}>0.05% — 稳定币对</option>
          <option value={FeeTier.LOW}>0.3% — 主流交易对</option>
          <option value={FeeTier.MEDIUM}>1% — 长尾资产</option>
        </select>
      </div>

      <div>
        <label className="text-sm text-text-secondary mb-1 block">初始 Tick</label>
        <input
          type="number"
          value={initialTick}
          onChange={e => setInitialTick(e.target.value)}
          placeholder="0"
          className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 placeholder:text-text-muted/50"
        />
        <p className="text-xs text-text-muted mt-1.5">
          Tick 0 = 价格 1:1。参考: -1000 ≈ 0.90, 0 = 1.00, 1000 ≈ 1.11, 6931 ≈ 2.00
        </p>
      </div>

      <div>
        <label className="text-sm text-text-secondary mb-1 block">默认流动性数量</label>
        <input
          type="number"
          value={defaultLiquidity}
          onChange={e => setDefaultLiquidity(e.target.value)}
          placeholder="1000"
          className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 placeholder:text-text-muted/50"
        />
        <p className="text-xs text-text-muted mt-1.5">
          创建池子时自动添加超宽范围的流动性，近似 V2 行为
        </p>
      </div>

      {error && (
        <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        className="w-full bg-accent hover:bg-accent-hover text-white py-2 rounded-lg text-sm font-medium transition-all"
      >
        创建资金池
      </button>
    </form>
  )
}
