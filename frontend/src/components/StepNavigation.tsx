import { useState } from 'react'
import { useStore, useActivePool } from '@/store/poolStore'
import DiffHighlight from './DiffHighlight'

export default function StepNavigation() {
  const { history, currentStep } = useActivePool()
  const goToStep = useStore(s => s.goToStep)
  const resetPool = useStore(s => s.resetPool)
  const [showDiff, setShowDiff] = useState(false)

  if (history.length === 0) return null

  const currentRecord = currentStep >= 0 ? history[currentStep] : null

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium text-text-secondary flex items-center gap-2">
          操作历史
          <span className="tooltip info-icon" data-tip="记录每次操作的详细信息。点击可回退到任意历史状态，方便对比操作前后的变化">?</span>
        </h3>
        <button
          onClick={resetPool}
          className="text-sm text-danger hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-danger/10"
        >
          删除池子
        </button>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => goToStep(currentStep - 1)}
          disabled={currentStep <= 0}
          className="flex-1 py-3.5 text-base rounded-xl bg-bg-tertiary border border-border hover:bg-bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium"
        >
          ← 上一步
        </button>
        <span className="flex items-center text-base text-text-muted px-4 font-mono">
          {currentStep + 1}/{history.length}
        </span>
        <button
          onClick={() => goToStep(currentStep + 1)}
          disabled={currentStep >= history.length - 1}
          className="flex-1 py-3.5 text-base rounded-xl bg-bg-tertiary border border-border hover:bg-bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium"
        >
          下一步 →
        </button>
      </div>

      {currentRecord && (
        <button
          onClick={() => setShowDiff(!showDiff)}
          className="w-full text-left py-3 px-4 rounded-xl bg-bg-tertiary border border-border hover:bg-bg-hover transition-colors text-sm text-text-secondary flex items-center justify-between"
        >
          <span>{showDiff ? '收起差异对比' : '查看当前步骤差异'}</span>
          <span>{showDiff ? '▲' : '▼'}</span>
        </button>
      )}

      {showDiff && currentRecord && (
        <div className="bg-bg-tertiary rounded-xl border border-border p-5 space-y-2">
          <p className="text-sm text-text-muted mb-4 font-medium">操作: {currentRecord.description}</p>
          <DiffHighlight label="sqrtPriceX96" before={currentRecord.before.sqrtPriceX96} after={currentRecord.after.sqrtPriceX96} />
          <DiffHighlight label="tick" before={currentRecord.before.tick.toString()} after={currentRecord.after.tick.toString()} />
          <DiffHighlight label="liquidity" before={currentRecord.before.liquidity} after={currentRecord.after.liquidity} />
          <DiffHighlight label="feeGrowthGlobal0" before={currentRecord.before.feeGrowthGlobal0X128} after={currentRecord.after.feeGrowthGlobal0X128} />
          <DiffHighlight label="feeGrowthGlobal1" before={currentRecord.before.feeGrowthGlobal1X128} after={currentRecord.after.feeGrowthGlobal1X128} />
        </div>
      )}

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {history.map((record, i) => (
          <button
            key={i}
            onClick={() => goToStep(i)}
            className={`w-full text-left px-5 py-4 rounded-xl text-base transition-all ${
              i === currentStep
                ? 'bg-accent/20 border border-accent/40 text-text-primary shadow-sm'
                : 'bg-bg-tertiary border border-transparent hover:bg-bg-hover text-text-secondary'
            }`}
          >
            <div className="flex items-center gap-4">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                i === currentStep ? 'bg-accent text-white' : 'bg-bg-hover text-text-muted'
              }`}>
                {i + 1}
              </span>
              <span className="truncate">{record.description}</span>
              <span className="text-xs text-text-muted ml-auto flex-shrink-0">{actionTypeLabel(record.type)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function actionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    create: '创建',
    mint: '添加',
    swap: '交换',
    burn: '移除',
    collect: '收取',
  }
  return labels[type] ?? type
}
