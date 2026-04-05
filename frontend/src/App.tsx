import { useState, useRef, useCallback } from 'react'
import { useStore, useActivePool } from '@/store/poolStore'
import PoolState from './components/PoolState'
import AccountBalances from './components/AccountBalances'
import TickMap from './components/TickMap'
import LiquidityChart from './components/LiquidityChart'
import StorageViewer from './components/StorageViewer'
import ActionPanel from './components/ActionPanel'
import StepNavigation from './components/StepNavigation'
import PoolList from './components/PoolList'

export default function App() {
  const { pool } = useActivePool()
  const [showStorage, setShowStorage] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(400)
  const isResizing = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isResizing.current = true
    startX.current = e.clientX
    startWidth.current = sidebarWidth
    e.preventDefault()
  }, [sidebarWidth])

  const handleMouseMove = useCallback((e: { clientX: number }) => {
    if (!isResizing.current) return
    const delta = e.clientX - startX.current
    const newWidth = Math.max(300, Math.min(700, startWidth.current + delta))
    setSidebarWidth(newWidth)
  }, [])

  const handleMouseUp = useCallback(() => {
    isResizing.current = false
  }, [])

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      <header className="bg-bg-secondary border-b border-border px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-sm font-bold">V3</div>
          <div>
            <h1 className="text-xl font-bold">Uniswap V3 教学模拟器</h1>
            <p className="text-xs text-text-muted mt-0.5">深入理解集中流动性做市商机制</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <AccountSelector />
          <button
            onClick={() => setShowStorage(!showStorage)}
            className="px-4 py-2 text-sm rounded-lg bg-bg-tertiary hover:bg-bg-hover border border-border transition-colors"
          >
            {showStorage ? '隐藏存储视图' : '显示存储视图'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className="bg-bg-secondary border-r border-border flex flex-col overflow-y-auto"
          style={{ width: sidebarWidth, minWidth: sidebarWidth }}
        >
          <PoolList />
          {pool && (
            <>
              <div className="border-t border-border mt-4 pt-4 px-6">
                <ActionPanel />
              </div>
              <div className="border-t border-border mt-4 pt-4 px-6">
                <StepNavigation />
              </div>
            </>
          )}
        </aside>

        <div
          className="w-1 cursor-col-resize hover:bg-accent/50 transition-colors flex-shrink-0 relative group"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute inset-y-0 -left-1 -right-1" />
        </div>

        <main className="flex-1 overflow-y-auto p-8 space-y-8">
          {pool ? (
            <>
              <PoolState />
              <AccountBalances />
              <div className="grid grid-cols-2 gap-8">
                <TickMap />
                <LiquidityChart />
              </div>
              {showStorage && <StorageViewer />}
            </>
          ) : (
            <div className="flex items-center justify-center h-96">
              <div className="text-center space-y-6">
                <div className="text-7xl">🦄</div>
                <h2 className="text-2xl font-semibold text-text-secondary">欢迎使用 Uniswap V3 教学模拟器</h2>
                <p className="text-text-muted max-w-md mx-auto leading-relaxed">
                  在左侧面板创建资金池，开始学习集中流动性的工作原理
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function AccountSelector() {
  const accounts = useStore(s => s.accounts)
  const activeId = useStore(s => s.activeAccountId)
  const setActiveAccount = useStore(s => s.setActiveAccount)

  return (
    <select
      value={activeId}
      onChange={e => setActiveAccount(e.target.value)}
      className="bg-bg-tertiary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-shadow"
    >
      {accounts.map(a => (
        <option key={a.id} value={a.id}>{a.name}</option>
      ))}
    </select>
  )
}
