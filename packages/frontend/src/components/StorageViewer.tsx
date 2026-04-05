import { useState } from 'react'
import { useActivePool } from '@/store/poolStore'
import { formatBigInt } from '@/utils/formatters'

const STORAGE_TIPS: Record<string, string> = {
  sqrtPriceX96: '当前价格的平方根定点数表示，乘以 2^96 存储',
  tick: '当前价格对应的 tick 值，P = 1.0001^tick',
  observationIndex: '当前观察点的索引，用于时间加权平均价格 (TWAP) 计算',
  observationCardinality: '当前已初始化的观察点数量',
  observationCardinalityNext: '观察点数组的下一个扩展目标大小',
  feeProtocol: '协议手续费分成比例（当前未启用）',
  unlocked: '重入锁，防止合约重入攻击',
  liquidityGross: '该 tick 上的总流动性（不考虑方向）',
  liquidityNet: '穿越此 tick 时流动性的变化量，正=增加，负=减少',
  feeGrowthOutside0X128: '该 tick 外部的 Token0 手续费增长率',
  feeGrowthOutside1X128: '该 tick 外部的 Token1 手续费增长率',
  initialized: '该 tick 是否已被初始化（有流动性部署）',
  tokensOwed0: '该仓位累计可领取的 Token0 手续费',
  tokensOwed1: '该仓位累计可领取的 Token1 手续费',
  feeGrowthGlobal0X128: '全局累计的 Token0 手续费增长率',
  feeGrowthGlobal1X128: '全局累计的 Token1 手续费增长率',
  liquidity: '当前活跃价格范围内的总流动性',
  protocolFee: '协议收取的手续费总额',
}

export default function StorageViewer() {
  const { pool } = useActivePool()
  if (!pool) return null

  return (
    <div className="bg-bg-secondary rounded-2xl border border-border p-8">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
        <span className="w-3 h-3 rounded-full bg-warning"></span>
        存储视图
        <span className="tooltip info-icon" data-tip="展示 Uniswap V3 合约中所有核心存储变量的当前值。这些值直接对应链上合约的实际存储槽位">?</span>
      </h2>
      <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2">
        <StorageSection title="slot0" defaultOpen>
          <StorageItem label="sqrtPriceX96" value={pool.slot0.sqrtPriceX96.toString()} tip={STORAGE_TIPS.sqrtPriceX96} />
          <StorageItem label="tick" value={pool.slot0.tick.toString()} tip={STORAGE_TIPS.tick} />
          <StorageItem label="observationIndex" value={pool.slot0.observationIndex.toString()} tip={STORAGE_TIPS.observationIndex} />
          <StorageItem label="observationCardinality" value={pool.slot0.observationCardinality.toString()} tip={STORAGE_TIPS.observationCardinality} />
          <StorageItem label="observationCardinalityNext" value={pool.slot0.observationCardinalityNext.toString()} tip={STORAGE_TIPS.observationCardinalityNext} />
          <StorageItem label="feeProtocol" value={pool.slot0.feeProtocol.toString()} tip={STORAGE_TIPS.feeProtocol} />
          <StorageItem label="unlocked" value={pool.slot0.unlocked.toString()} tip={STORAGE_TIPS.unlocked} />
        </StorageSection>

        <StorageSection title={`ticks (${pool.ticks.size})`}>
          {Array.from(pool.ticks.entries()).map(([tick, info]) => (
            <StorageSection key={tick} title={`tick ${tick}`} indent>
              <StorageItem label="liquidityGross" value={formatBigInt(info.liquidityGross, 0)} tip={STORAGE_TIPS.liquidityGross} />
              <StorageItem label="liquidityNet" value={formatBigInt(info.liquidityNet, 0)} tip={STORAGE_TIPS.liquidityNet} />
              <StorageItem label="feeGrowthOutside0X128" value={formatBigInt(info.feeGrowthOutside0X128, 0)} tip={STORAGE_TIPS.feeGrowthOutside0X128} />
              <StorageItem label="feeGrowthOutside1X128" value={formatBigInt(info.feeGrowthOutside1X128, 0)} tip={STORAGE_TIPS.feeGrowthOutside1X128} />
              <StorageItem label="initialized" value={info.initialized.toString()} tip={STORAGE_TIPS.initialized} />
            </StorageSection>
          ))}
        </StorageSection>

        <StorageSection title={`positions (${pool.positions.size})`}>
          {Array.from(pool.positions.entries()).map(([key, pos]) => (
            <StorageSection key={key} title={`pos ${key.slice(0, 12)}...`} indent>
              <StorageItem label="liquidity" value={formatBigInt(pos.liquidity, 0)} tip={STORAGE_TIPS.liquidityGross} />
              <StorageItem label="tokensOwed0" value={formatBigInt(pos.tokensOwed0)} tip={STORAGE_TIPS.tokensOwed0} />
              <StorageItem label="tokensOwed1" value={formatBigInt(pos.tokensOwed1)} tip={STORAGE_TIPS.tokensOwed1} />
            </StorageSection>
          ))}
        </StorageSection>

        <StorageSection title={`tickBitmap (${pool.tickBitmap.size})`}>
          {Array.from(pool.tickBitmap.entries()).map(([word, value]) => (
            <StorageItem key={word} label={`word ${word}`} value={value.toString()} tip="tickBitmap 的每个 word 存储 256 个 tick 的初始化状态，用于快速查找已初始化的 tick" />
          ))}
        </StorageSection>

        <StorageSection title="全局变量">
          <StorageItem label="feeGrowthGlobal0X128" value={formatBigInt(pool.feeGrowthGlobal0X128, 0)} tip={STORAGE_TIPS.feeGrowthGlobal0X128} />
          <StorageItem label="feeGrowthGlobal1X128" value={formatBigInt(pool.feeGrowthGlobal1X128, 0)} tip={STORAGE_TIPS.feeGrowthGlobal1X128} />
          <StorageItem label="liquidity" value={formatBigInt(pool.liquidity, 0)} tip={STORAGE_TIPS.liquidity} />
          <StorageItem label="protocolFee" value={pool.protocolFee.toString()} tip={STORAGE_TIPS.protocolFee} />
        </StorageSection>
      </div>
    </div>
  )
}

function StorageSection({
  title,
  children,
  defaultOpen = false,
  indent = false,
}: {
  title: string
  children?: React.ReactNode
  defaultOpen?: boolean
  indent?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const hasChildren = children !== undefined

  return (
    <div className={indent ? 'ml-5' : ''}>
      <button
        onClick={() => hasChildren && setOpen(!open)}
        className={`flex items-center gap-3 w-full text-left py-3 rounded-xl hover:bg-bg-hover transition-colors ${hasChildren ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {hasChildren && (
          <span className="text-text-muted text-sm w-4">{open ? '▼' : '▶'}</span>
        )}
        <span className="text-base font-medium text-accent">{title}</span>
      </button>
      {open && hasChildren && (
        <div className="ml-5 border-l-2 border-border pl-4 space-y-1">
          {children}
        </div>
      )}
    </div>
  )
}

function StorageItem({ label, value, tip }: { label: string; value: string; tip?: string }) {
  return (
    <div className={`flex items-center justify-between py-2.5 text-sm ${tip ? 'tooltip cursor-help' : ''}`} data-tip={tip}>
      <span className="text-text-secondary">{label}</span>
      <span className="font-mono text-text-primary ml-6 truncate max-w-72" title={value}>
        {value}
      </span>
    </div>
  )
}
