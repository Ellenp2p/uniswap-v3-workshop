import { useStore, useActivePool } from '@/store/poolStore'
import { formatBigInt } from '@/utils/formatters'

export default function AccountBalances() {
  const accounts = useStore(s => s.accounts)
  const activeId = useStore(s => s.activeAccountId)
  const { history, currentStep } = useActivePool()

  const lastAction = currentStep >= 0 ? history[currentStep] : null

  return (
    <div className="bg-bg-secondary rounded-2xl border border-border p-8">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
        <span className="w-3 h-3 rounded-full bg-accent"></span>
        账户余额
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead>
            <tr className="text-text-muted border-b-2 border-border">
              <th className="text-left py-4 px-5 font-semibold">账户</th>
              <th className="text-right py-4 px-5 font-semibold tooltip" data-tip="Token0 是交易对中的第一个代币，如 ETH/USDC 中的 ETH">
                <span className="tooltip" data-tip="Token0 是交易对中的第一个代币，如 ETH/USDC 中的 ETH">Token0</span>
              </th>
              <th className="text-right py-4 px-5 font-semibold tooltip" data-tip="Token1 是交易对中的第二个代币，如 ETH/USDC 中的 USDC">
                <span className="tooltip" data-tip="Token1 是交易对中的第二个代币，如 ETH/USDC 中的 USDC">Token1</span>
              </th>
              <th className="text-right py-4 px-5 font-semibold">状态</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map(acc => {
              const changes = lastAction?.accountChanges[acc.id]
              const isActive = acc.id === activeId
              return (
                <tr
                  key={acc.id}
                  className={`border-b border-border/50 transition-colors ${isActive ? 'bg-accent/10' : 'hover:bg-bg-hover'}`}
                >
                  <td className="py-5 px-5">
                    <div className="font-semibold text-base">{acc.name}</div>
                    <div className="text-sm text-text-muted font-mono mt-1">{acc.address.slice(0, 10)}...</div>
                  </td>
                  <td className="py-5 px-5 text-right font-mono text-base">
                    <BalanceWithChange
                      value={acc.balance0}
                      change={changes ? changes.balance0After - changes.balance0Before : 0n}
                    />
                  </td>
                  <td className="py-5 px-5 text-right font-mono text-base">
                    <BalanceWithChange
                      value={acc.balance1}
                      change={changes ? changes.balance1After - changes.balance1Before : 0n}
                    />
                  </td>
                  <td className="py-5 px-5 text-right">
                    {isActive && <span className="text-sm px-4 py-1.5 rounded-full bg-accent/20 text-accent font-medium">当前操作</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BalanceWithChange({ value, change }: { value: bigint; change: bigint }) {
  const formatted = formatBigInt(value)
  const hasChange = change !== 0n
  const changeFormatted = formatBigInt(change < 0n ? -change : change)
  const isPositive = change > 0n

  return (
    <div>
      <div>{formatted}</div>
      {hasChange && (
        <div className={`text-sm mt-1 ${isPositive ? 'text-success' : 'text-danger'}`}>
          {isPositive ? '+' : '-'}{changeFormatted}
        </div>
      )}
    </div>
  )
}
