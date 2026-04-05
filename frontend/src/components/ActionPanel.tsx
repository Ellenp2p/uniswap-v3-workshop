import { useState } from 'react'
import { useStore, useActivePool } from '@/store/poolStore'

export default function ActionPanel() {
  const [action, setAction] = useState<'mint' | 'swap' | 'burn' | 'collect'>('mint')
  const { pool } = useActivePool()

  if (!pool) return null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-1.5">
        {([
          { key: 'mint', label: '添加', icon: '➕' },
          { key: 'swap', label: '交换', icon: '🔄' },
          { key: 'burn', label: '移除', icon: '🔥' },
          { key: 'collect', label: '收取', icon: '💰' },
        ] as const).map(item => (
          <button
            key={item.key}
            onClick={() => setAction(item.key)}
            className={`py-2.5 px-1.5 text-xs rounded-lg transition-all flex flex-col items-center gap-1 leading-tight ${
              action === item.key
                ? 'bg-accent text-white shadow-md shadow-accent/20'
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-hover border border-border'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </div>

      {action === 'mint' && <MintForm />}
      {action === 'swap' && <SwapForm />}
      {action === 'burn' && <BurnForm />}
      {action === 'collect' && <CollectForm />}
    </div>
  )
}

function InfoTip({ text }: { text: string }) {
  return (
    <span className="tooltip info-icon" data-tip={text}>?</span>
  )
}

function FormHint({ text }: { text: string }) {
  return (
    <p className="text-xs text-text-muted mt-1.5 leading-relaxed">{text}</p>
  )
}

function FormField({
  label,
  tooltip,
  hint,
  children,
}: {
  label: string
  tooltip: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm text-text-secondary flex items-center gap-1.5">
        {label}
        <InfoTip text={tooltip} />
      </label>
      {children}
      <FormHint text={hint} />
    </div>
  )
}

function MintForm() {
  const [tickLower, setTickLower] = useState('-60')
  const [tickUpper, setTickUpper] = useState('60')
  const [amount, setAmount] = useState('100')
  const mint = useStore(s => s.mint)
  const { pool } = useActivePool()
  const [error, setError] = useState('')

  const tickSpacing = pool ? pool.tickSpacing : 60

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const lower = Number(tickLower)
      const upper = Number(tickUpper)
      const amt = Number(amount)

      if (isNaN(lower) || isNaN(upper) || isNaN(amt)) {
        setError('请输入有效的数值')
        return
      }
      if (lower >= upper) {
        setError('Tick 下限必须小于上限')
        return
      }
      if (lower % tickSpacing !== 0 || upper % tickSpacing !== 0) {
        setError(`Tick 必须是 ${tickSpacing} 的倍数`)
        return
      }
      if (amt <= 0) {
        setError('流动性数量必须大于 0')
        return
      }
      mint(lower, upper, BigInt(Math.floor(amt * 1e18)))
    } catch (err: any) {
      setError(err.message || '添加流动性失败')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        <FormField
          label="Tick 下限"
          tooltip="流动性范围的起始 Tick。价格低于此值时，你的仓位将全部转换为 Token0。需要是 Tick 间距的整数倍"
          hint={`必须是 ${tickSpacing} 的倍数。参考: -60, -120, -200`}
        >
          <input
            type="number"
            value={tickLower}
            onChange={e => setTickLower(e.target.value)}
            className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all placeholder:text-text-muted/50"
            placeholder="-60"
          />
        </FormField>
        <FormField
          label="Tick 上限"
          tooltip="流动性范围的结束 Tick。价格高于此值时，你的仓位将全部转换为 Token1。需要是 Tick 间距的整数倍"
          hint={`必须是 ${tickSpacing} 的倍数。参考: 60, 120, 200`}
        >
          <input
            type="number"
            value={tickUpper}
            onChange={e => setTickUpper(e.target.value)}
            className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all placeholder:text-text-muted/50"
            placeholder="60"
          />
        </FormField>
      </div>

      <FormField
        label="流动性数量"
        tooltip="要添加的流动性单位 L。在 Uniswap V3 中，流动性 L = √(x × y)，其中 x 和 y 是两种代币的数量。流动性越大，价格影响越小"
        hint="参考值: 10, 50, 100, 500。值越大，对价格的影响越小"
      >
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="100"
          className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all placeholder:text-text-muted/50"
        />
      </FormField>

      {error && (
        <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2.5">
          {error}
        </div>
      )}

      <button
        type="submit"
        className="w-full bg-accent hover:bg-accent-hover text-white py-2.5 rounded-lg text-sm font-medium transition-all shadow-md shadow-accent/20 hover:shadow-accent/30"
      >
        添加流动性
      </button>
    </form>
  )
}

function SwapForm() {
  const [zeroForOne, setZeroForOne] = useState(true)
  const [amount, setAmount] = useState('10')
  const swap = useStore(s => s.swap)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const amt = Number(amount)
      if (isNaN(amt) || amt <= 0) {
        setError('请输入有效的交换数量')
        return
      }
      swap(zeroForOne, BigInt(Math.floor(amt * 1e18)))
    } catch (err: any) {
      setError(err.message || '交换失败')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField
        label="交换方向"
        tooltip="Token0 → Token1: 卖出 Token0 买入 Token1，价格会下降。Token1 → Token0: 卖出 Token1 买入 Token0，价格会上升。交换方向决定了价格移动的方向"
        hint="当前价格会随交换方向变化。大量交换会导致更大的价格滑点"
      >
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setZeroForOne(true)}
            className={`py-2.5 rounded-lg text-sm font-medium border transition-all ${
              zeroForOne
                ? 'bg-accent/20 border-accent text-accent shadow-md shadow-accent/15'
                : 'bg-bg-tertiary border-border text-text-secondary hover:text-text-primary'
            }`}
          >
            Token0 → Token1
          </button>
          <button
            type="button"
            onClick={() => setZeroForOne(false)}
            className={`py-2.5 rounded-lg text-sm font-medium border transition-all ${
              !zeroForOne
                ? 'bg-accent/20 border-accent text-accent shadow-md shadow-accent/15'
                : 'bg-bg-tertiary border-border text-text-secondary hover:text-text-primary'
            }`}
          >
            Token1 → Token0
          </button>
        </div>
      </FormField>

      <FormField
        label="交换数量"
        tooltip="要交换的代币数量（精确输入模式）。数量越大，价格滑点越大。如果交换量超过当前价格范围内的流动性，价格会穿越多个 Tick 区间"
        hint="参考值: 1, 5, 10, 50, 100。小金额滑点小，大金额可能跨越多个 Tick"
      >
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="10"
          className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all placeholder:text-text-muted/50"
        />
      </FormField>

      {error && (
        <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2.5">
          {error}
        </div>
      )}

      <button
        type="submit"
        className="w-full bg-accent hover:bg-accent-hover text-white py-2.5 rounded-lg text-sm font-medium transition-all shadow-md shadow-accent/20 hover:shadow-accent/30"
      >
        执行交换
      </button>
    </form>
  )
}

function BurnForm() {
  const [tickLower, setTickLower] = useState('-60')
  const [tickUpper, setTickUpper] = useState('60')
  const [amount, setAmount] = useState('50')
  const burn = useStore(s => s.burn)
  const { pool } = useActivePool()
  const [error, setError] = useState('')

  const tickSpacing = pool ? pool.tickSpacing : 60

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const lower = Number(tickLower)
      const upper = Number(tickUpper)
      const amt = Number(amount)

      if (isNaN(lower) || isNaN(upper) || isNaN(amt)) {
        setError('请输入有效的数值')
        return
      }
      if (lower >= upper) {
        setError('Tick 下限必须小于上限')
        return
      }
      if (amt <= 0) {
        setError('移除数量必须大于 0')
        return
      }
      burn(lower, upper, BigInt(Math.floor(amt * 1e18)))
    } catch (err: any) {
      setError(err.message || '移除流动性失败')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        <FormField
          label="Tick 下限"
          tooltip="要移除流动性的仓位下限。需要与添加流动性时设置的 Tick 范围一致，否则找不到对应的仓位"
          hint={`必须是 ${tickSpacing} 的倍数。需与添加时一致`}
        >
          <input
            type="number"
            value={tickLower}
            onChange={e => setTickLower(e.target.value)}
            className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all placeholder:text-text-muted/50"
            placeholder="-60"
          />
        </FormField>
        <FormField
          label="Tick 上限"
          tooltip="要移除流动性的仓位上限。需要与添加流动性时设置的 Tick 范围一致"
          hint={`必须是 ${tickSpacing} 的倍数。需与添加时一致`}
        >
          <input
            type="number"
            value={tickUpper}
            onChange={e => setTickUpper(e.target.value)}
            className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all placeholder:text-text-muted/50"
            placeholder="60"
          />
        </FormField>
      </div>

      <FormField
        label="移除数量"
        tooltip="要从仓位中移除的流动性数量。不能超过该仓位已有的流动性。移除后会按比例返还 Token0 和 Token1"
        hint="参考值: 10, 25, 50。不能超过已添加的数量"
      >
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="50"
          className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all placeholder:text-text-muted/50"
        />
      </FormField>

      {error && (
        <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2.5">
          {error}
        </div>
      )}

      <button
        type="submit"
        className="w-full bg-danger hover:bg-red-500 text-white py-2.5 rounded-lg text-sm font-medium transition-all shadow-md shadow-danger/20 hover:shadow-danger/30"
      >
        移除流动性
      </button>
    </form>
  )
}

function CollectForm() {
  const [tickLower, setTickLower] = useState('-60')
  const [tickUpper, setTickUpper] = useState('60')
  const collect = useStore(s => s.collect)
  const { pool } = useActivePool()
  const [error, setError] = useState('')

  const tickSpacing = pool ? pool.tickSpacing : 60

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const lower = Number(tickLower)
      const upper = Number(tickUpper)

      if (isNaN(lower) || isNaN(upper)) {
        setError('请输入有效的 Tick 值')
        return
      }
      if (lower >= upper) {
        setError('Tick 下限必须小于上限')
        return
      }
      collect(lower, upper)
    } catch (err: any) {
      setError(err.message || '收取手续费失败')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        <FormField
          label="Tick 下限"
          tooltip="要收取手续费的仓位下限。需要与添加流动性时设置的 Tick 范围一致。只有在该范围内发生过交易，才会产生手续费"
          hint={`必须是 ${tickSpacing} 的倍数。需与添加时一致`}
        >
          <input
            type="number"
            value={tickLower}
            onChange={e => setTickLower(e.target.value)}
            className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all placeholder:text-text-muted/50"
            placeholder="-60"
          />
        </FormField>
        <FormField
          label="Tick 上限"
          tooltip="要收取手续费的仓位上限。需要与添加流动性时设置的 Tick 范围一致"
          hint={`必须是 ${tickSpacing} 的倍数。需与添加时一致`}
        >
          <input
            type="number"
            value={tickUpper}
            onChange={e => setTickUpper(e.target.value)}
            className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all placeholder:text-text-muted/50"
            placeholder="60"
          />
        </FormField>
      </div>

      <div className="bg-bg-tertiary rounded-lg p-3 border border-border">
        <p className="text-xs text-text-muted leading-relaxed">
          收取手续费会将仓位累计的未领取手续费（tokensOwed0 和 tokensOwed1）转入你的账户余额。
          手续费来源于在该价格范围内执行的交易。
        </p>
      </div>

      {error && (
        <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2.5">
          {error}
        </div>
      )}

      <button
        type="submit"
        className="w-full bg-success hover:bg-emerald-500 text-white py-2.5 rounded-lg text-sm font-medium transition-all shadow-md shadow-success/20 hover:shadow-success/30"
      >
        收取手续费
      </button>
    </form>
  )
}
