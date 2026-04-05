import { create } from 'zustand';
import { UniswapV3Pool } from '@uniswap-v3/core/pool/pool.js';
import { getSqrtRatioAtTick, FeeTier, TICK_SPACING } from '@uniswap-v3/core/index.js';
import { formatBigInt } from '@/utils/formatters';

const ERROR_MESSAGES: Record<string, string> = {
  AS: '交换数量不能为零',
  SPL: '价格超出允许范围。当前价格范围内流动性不足，无法完成此方向的交换。请尝试减小交换数量或先添加更多流动性',
  'tick not found': '未找到对应的 Tick，请检查 Tick 范围是否正确',
  'tick order': 'Tick 下限必须小于上限',
  'tick range': 'Tick 超出允许范围 (-887272 ~ 887272)',
  'tick spacing': 'Tick 必须是当前费率层级 Tick 间距的倍数',
  'position not found': '未找到对应的仓位，请检查 Tick 范围和账户是否正确',
};

function formatError(err: unknown): string {
  if (err instanceof Error) {
    return ERROR_MESSAGES[err.message] || err.message;
  }
  return String(err);
}

export interface Account {
  id: string;
  name: string;
  address: string;
  balance0: bigint;
  balance1: bigint;
}

export interface ActionRecord {
  type: 'create' | 'mint' | 'swap' | 'burn' | 'collect';
  timestamp: number;
  description: string;
  before: PoolSnapshot;
  after: PoolSnapshot;
  accountChanges: Record<string, { balance0Before: bigint; balance0After: bigint; balance1Before: bigint; balance1After: bigint }>;
}

export interface PoolSnapshot {
  sqrtPriceX96: string;
  tick: number;
  liquidity: string;
  feeGrowthGlobal0X128: string;
  feeGrowthGlobal1X128: string;
  ticks: [number, { liquidityGross: string; liquidityNet: string; initialized: boolean }][];
  positions: [string, { liquidity: string; tokensOwed0: string; tokensOwed1: string }][];
  tickBitmap: [number, string][];
}

export interface PoolMeta {
  id: string;
  name: string;
  feeTier: FeeTier;
  initialTick: number;
  createdAt: number;
}

interface PoolState {
  pool: UniswapV3Pool;
  history: ActionRecord[];
  currentStep: number;
}

const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: 'alice',
    name: 'Alice (LP)',
    address: '0x1111111111111111111111111111111111111111',
    balance0: 1000n * 10n ** 18n,
    balance1: 1000n * 10n ** 18n,
  },
  {
    id: 'bob',
    name: 'Bob (Trader)',
    address: '0x2222222222222222222222222222222222222222',
    balance0: 500n * 10n ** 18n,
    balance1: 500n * 10n ** 18n,
  },
  {
    id: 'charlie',
    name: 'Charlie (Trader)',
    address: '0x3333333333333333333333333333333333333333',
    balance0: 200n * 10n ** 18n,
    balance1: 200n * 10n ** 18n,
  },
];

function createSnapshot(pool: UniswapV3Pool): PoolSnapshot {
  const ticks: PoolSnapshot['ticks'] = [];
  for (const [tick, info] of pool.ticks) {
    ticks.push([tick, {
      liquidityGross: info.liquidityGross.toString(),
      liquidityNet: info.liquidityNet.toString(),
      initialized: info.initialized,
    }]);
  }

  const positions: PoolSnapshot['positions'] = [];
  for (const [key, pos] of pool.positions) {
    positions.push([key, {
      liquidity: pos.liquidity.toString(),
      tokensOwed0: pos.tokensOwed0.toString(),
      tokensOwed1: pos.tokensOwed1.toString(),
    }]);
  }

  const tickBitmap: PoolSnapshot['tickBitmap'] = [];
  for (const [word, value] of pool.tickBitmap) {
    tickBitmap.push([word, value.toString()]);
  }

  return {
    sqrtPriceX96: pool.slot0.sqrtPriceX96.toString(),
    tick: pool.slot0.tick,
    liquidity: pool.liquidity.toString(),
    feeGrowthGlobal0X128: pool.feeGrowthGlobal0X128.toString(),
    feeGrowthGlobal1X128: pool.feeGrowthGlobal1X128.toString(),
    ticks,
    positions,
    tickBitmap,
  };
}

function createEmptySnapshot(): PoolSnapshot {
  return {
    sqrtPriceX96: '0',
    tick: 0,
    liquidity: '0',
    feeGrowthGlobal0X128: '0',
    feeGrowthGlobal1X128: '0',
    ticks: [],
    positions: [],
    tickBitmap: [],
  };
}

function cloneAccounts(accounts: Account[]): Account[] {
  return accounts.map(a => ({ ...a }));
}

function getActivePool(state: AppState): { poolState: PoolState; meta: PoolMeta } | null {
  if (!state.activePoolId || !state.pools[state.activePoolId]) return null;
  return {
    poolState: state.pools[state.activePoolId],
    meta: state.poolMeta[state.activePoolId],
  };
}

interface AppState {
  pools: Record<string, PoolState>;
  poolMeta: Record<string, PoolMeta>;
  activePoolId: string | null;
  accounts: Account[];
  activeAccountId: string;
  createPool: (name: string, feeTier: FeeTier, initialTick: number, defaultLiquidity: bigint) => void;
  deletePool: (id: string) => void;
  switchPool: (id: string) => void;
  mint: (tickLower: number, tickUpper: number, amount: bigint) => void;
  swap: (zeroForOne: boolean, amount: bigint) => void;
  burn: (tickLower: number, tickUpper: number, amount: bigint) => void;
  collect: (tickLower: number, tickUpper: number) => void;
  setActiveAccount: (id: string) => void;
  goToStep: (step: number) => void;
  resetPool: () => void;
  resetAll: () => void;
  getSnapshot: () => PoolSnapshot;
}

let poolCounter = 0;

function generatePoolId(): string {
  poolCounter++;
  return `pool_${poolCounter}_${Date.now()}`;
}

export const useStore = create<AppState>((set, get) => ({
  pools: {},
  poolMeta: {},
  activePoolId: null,
  accounts: cloneAccounts(DEFAULT_ACCOUNTS),
  activeAccountId: 'alice',

  createPool: (name: string, feeTier: FeeTier, initialTick: number, defaultLiquidity: bigint) => {
    const tickSpacing = TICK_SPACING[feeTier];
    const sqrtPriceX96 = getSqrtRatioAtTick(initialTick);

    const maxTick = Math.floor(887272 / tickSpacing) * tickSpacing;

    set(state => {
      const pool = new UniswapV3Pool(feeTier, tickSpacing, sqrtPriceX96);
      const id = generatePoolId();

      const before = createEmptySnapshot();

      const account = state.accounts.find(a => a.id === state.activeAccountId)!;
      const mintResult = pool.mint({
        owner: account.address,
        tickLower: -maxTick,
        tickUpper: maxTick,
        amount: defaultLiquidity,
      });

      const accountChanges: ActionRecord['accountChanges'] = {};
      const accounts = state.accounts.map(a => {
        const isCurrent = a.id === state.activeAccountId;
        const b0 = isCurrent ? a.balance0 - mintResult.amount0 : a.balance0;
        const b1 = isCurrent ? a.balance1 - mintResult.amount1 : a.balance1;
        accountChanges[a.id] = {
          balance0Before: a.balance0,
          balance0After: b0,
          balance1Before: a.balance1,
          balance1After: b1,
        };
        return isCurrent ? { ...a, balance0: b0, balance1: b1 } : { ...a };
      });

      const after = createSnapshot(pool);

      const record: ActionRecord = {
        type: 'create',
        timestamp: Date.now(),
        description: `创建 ${name} - 费率 ${feeTier / 10000}%，默认流动性 ${formatBigInt(defaultLiquidity)}`,
        before,
        after,
        accountChanges,
      };

      const meta: PoolMeta = {
        id,
        name,
        feeTier,
        initialTick,
        createdAt: Date.now(),
      };

      const poolState: PoolState = {
        pool,
        history: [record],
        currentStep: 0,
      };

      return {
        pools: { ...state.pools, [id]: poolState },
        poolMeta: { ...state.poolMeta, [id]: meta },
        activePoolId: id,
        accounts,
      };
    });
  },

  deletePool: (id: string) => {
    set(state => {
      const newPools = { ...state.pools };
      const newMeta = { ...state.poolMeta };
      delete newPools[id];
      delete newMeta[id];

      let activePoolId = state.activePoolId;
      if (activePoolId === id) {
        const remainingIds = Object.keys(newPools);
        activePoolId = remainingIds.length > 0 ? remainingIds[remainingIds.length - 1] : null;
      }

      return { pools: newPools, poolMeta: newMeta, activePoolId };
    });
  },

  switchPool: (id: string) => {
    set({ activePoolId: id });
  },

  mint: (tickLower: number, tickUpper: number, amount: bigint) => {
    set(state => {
      const active = getActivePool(state);
      if (!active) throw new Error('未选择资金池');
      const account = state.accounts.find(a => a.id === state.activeAccountId);
      if (!account) throw new Error('Account not found');

      const { poolState, meta } = active;
      const before = createSnapshot(poolState.pool);

      let result;
      try {
        result = poolState.pool.mint({
          owner: account.address,
          tickLower,
          tickUpper,
          amount,
        });
      } catch (err: unknown) {
        throw new Error(formatError(err));
      }

      const accountChanges: ActionRecord['accountChanges'] = {};
      const accounts = state.accounts.map(a => {
        const isCurrent = a.id === state.activeAccountId;
        const b0 = isCurrent ? a.balance0 - result.amount0 : a.balance0;
        const b1 = isCurrent ? a.balance1 - result.amount1 : a.balance1;
        accountChanges[a.id] = {
          balance0Before: a.balance0,
          balance0After: b0,
          balance1Before: a.balance1,
          balance1After: b1,
        };
        return isCurrent ? { ...a, balance0: b0, balance1: b1 } : { ...a };
      });

      const after = createSnapshot(poolState.pool);

      const record: ActionRecord = {
        type: 'mint',
        timestamp: Date.now(),
        description: `${account.name} 添加流动性 [${tickLower}, ${tickUpper}] 数量 ${formatBigInt(amount)}`,
        before,
        after,
        accountChanges,
      };

      const newHistory = [...poolState.history.slice(0, poolState.currentStep + 1), record];

      return {
        pools: {
          ...state.pools,
          [state.activePoolId!]: { ...poolState, history: newHistory, currentStep: newHistory.length - 1 },
        },
        accounts,
      };
    });
  },

  swap: (zeroForOne: boolean, amount: bigint) => {
    set(state => {
      const active = getActivePool(state);
      if (!active) throw new Error('未选择资金池');
      const account = state.accounts.find(a => a.id === state.activeAccountId);
      if (!account) throw new Error('Account not found');

      const { poolState } = active;
      const before = createSnapshot(poolState.pool);

      let result;
      try {
        result = poolState.pool.swap({
          recipient: account.address,
          zeroForOne,
          amountSpecified: amount,
          sqrtPriceLimitX96: 0n,
        });
      } catch (err: unknown) {
        throw new Error(formatError(err));
      }

      const accountChanges: ActionRecord['accountChanges'] = {};
      const accounts = state.accounts.map(a => {
        const isCurrent = a.id === state.activeAccountId;
        const b0 = isCurrent ? a.balance0 - result.amount0 : a.balance0;
        const b1 = isCurrent ? a.balance1 - result.amount1 : a.balance1;
        accountChanges[a.id] = {
          balance0Before: a.balance0,
          balance0After: b0,
          balance1Before: a.balance1,
          balance1After: b1,
        };
        return isCurrent ? { ...a, balance0: b0, balance1: b1 } : { ...a };
      });

      const after = createSnapshot(poolState.pool);

      const record: ActionRecord = {
        type: 'swap',
        timestamp: Date.now(),
        description: `${account.name} 交换 ${zeroForOne ? 'Token0 → Token1' : 'Token1 → Token0'} 数量 ${formatBigInt(amount)}`,
        before,
        after,
        accountChanges,
      };

      const newHistory = [...poolState.history.slice(0, poolState.currentStep + 1), record];

      return {
        pools: {
          ...state.pools,
          [state.activePoolId!]: { ...poolState, history: newHistory, currentStep: newHistory.length - 1 },
        },
        accounts,
      };
    });
  },

  burn: (tickLower: number, tickUpper: number, amount: bigint) => {
    set(state => {
      const active = getActivePool(state);
      if (!active) throw new Error('未选择资金池');
      const account = state.accounts.find(a => a.id === state.activeAccountId);
      if (!account) throw new Error('Account not found');

      const { poolState } = active;
      const before = createSnapshot(poolState.pool);

      let result;
      try {
        result = poolState.pool.burn({
          tickLower,
          tickUpper,
          amount,
          owner: account.address,
        });
      } catch (err: unknown) {
        throw new Error(formatError(err));
      }

      const accountChanges: ActionRecord['accountChanges'] = {};
      const accounts = state.accounts.map(a => {
        const isCurrent = a.id === state.activeAccountId;
        const b0 = isCurrent ? a.balance0 + result.amount0 : a.balance0;
        const b1 = isCurrent ? a.balance1 + result.amount1 : a.balance1;
        accountChanges[a.id] = {
          balance0Before: a.balance0,
          balance0After: b0,
          balance1Before: a.balance1,
          balance1After: b1,
        };
        return isCurrent ? { ...a, balance0: b0, balance1: b1 } : { ...a };
      });

      const after = createSnapshot(poolState.pool);

      const record: ActionRecord = {
        type: 'burn',
        timestamp: Date.now(),
        description: `${account.name} 移除流动性 [${tickLower}, ${tickUpper}] 数量 ${formatBigInt(amount)}`,
        before,
        after,
        accountChanges,
      };

      const newHistory = [...poolState.history.slice(0, poolState.currentStep + 1), record];

      return {
        pools: {
          ...state.pools,
          [state.activePoolId!]: { ...poolState, history: newHistory, currentStep: newHistory.length - 1 },
        },
        accounts,
      };
    });
  },

  collect: (tickLower: number, tickUpper: number) => {
    set(state => {
      const active = getActivePool(state);
      if (!active) throw new Error('未选择资金池');
      const account = state.accounts.find(a => a.id === state.activeAccountId);
      if (!account) throw new Error('Account not found');

      const { poolState } = active;
      const before = createSnapshot(poolState.pool);

      let result;
      try {
        result = poolState.pool.collect({
          owner: account.address,
          tickLower,
          tickUpper,
          recipient: account.address,
        });
      } catch (err: unknown) {
        throw new Error(formatError(err));
      }

      const accountChanges: ActionRecord['accountChanges'] = {};
      const accounts = state.accounts.map(a => {
        const isCurrent = a.id === state.activeAccountId;
        const b0 = isCurrent ? a.balance0 + result.tokensOwed0 : a.balance0;
        const b1 = isCurrent ? a.balance1 + result.tokensOwed1 : a.balance1;
        accountChanges[a.id] = {
          balance0Before: a.balance0,
          balance0After: b0,
          balance1Before: a.balance1,
          balance1After: b1,
        };
        return isCurrent ? { ...a, balance0: b0, balance1: b1 } : { ...a };
      });

      const after = createSnapshot(poolState.pool);

      const record: ActionRecord = {
        type: 'collect',
        timestamp: Date.now(),
        description: `${account.name} 收取手续费 Token0: ${formatBigInt(result.tokensOwed0)} Token1: ${formatBigInt(result.tokensOwed1)}`,
        before,
        after,
        accountChanges,
      };

      const newHistory = [...poolState.history.slice(0, poolState.currentStep + 1), record];

      return {
        pools: {
          ...state.pools,
          [state.activePoolId!]: { ...poolState, history: newHistory, currentStep: newHistory.length - 1 },
        },
        accounts,
      };
    });
  },

  setActiveAccount: (id: string) => set({ activeAccountId: id }),

  goToStep: (step: number) => {
    set(state => {
      const active = getActivePool(state);
      if (!active) return state;
      if (step < 0 || step >= active.poolState.history.length) return state;

      const { poolState } = active;
      const targetRecord = poolState.history[step];
      const after = targetRecord.after;

      const pool = new UniswapV3Pool(poolState.pool.fee, poolState.pool.tickSpacing, BigInt(after.sqrtPriceX96));
      pool.slot0.tick = after.tick;
      pool.liquidity = BigInt(after.liquidity);
      pool.feeGrowthGlobal0X128 = BigInt(after.feeGrowthGlobal0X128);
      pool.feeGrowthGlobal1X128 = BigInt(after.feeGrowthGlobal1X128);

      for (const [tick, info] of after.ticks) {
        pool.ticks.set(tick, {
          liquidityGross: BigInt(info.liquidityGross),
          liquidityNet: BigInt(info.liquidityNet),
          feeGrowthOutside0X128: 0n,
          feeGrowthOutside1X128: 0n,
          secondsPerLiquidityOutsideX128: 0n,
          tickCumulativeOutside: 0n,
          secondsOutside: 0,
          initialized: info.initialized,
        });
      }

      for (const [key, pos] of after.positions) {
        pool.positions.set(key, {
          liquidity: BigInt(pos.liquidity),
          feeGrowthInside0LastX128: 0n,
          feeGrowthInside1LastX128: 0n,
          tokensOwed0: BigInt(pos.tokensOwed0),
          tokensOwed1: BigInt(pos.tokensOwed1),
        });
      }

      for (const [word, value] of after.tickBitmap) {
        pool.tickBitmap.set(word, BigInt(value));
      }

      const accountChanges = targetRecord.accountChanges;
      const accounts = state.accounts.map(a => {
        const changes = accountChanges[a.id];
        if (changes) {
          return { ...a, balance0: changes.balance0After, balance1: changes.balance1After };
        }
        return { ...a };
      });

      return {
        pools: {
          ...state.pools,
          [state.activePoolId!]: { ...poolState, pool, currentStep: step },
        },
        accounts,
      };
    });
  },

  resetPool: () => {
    set(state => {
      if (!state.activePoolId) return state;
      const newPools = { ...state.pools };
      delete newPools[state.activePoolId];
      const newMeta = { ...state.poolMeta };
      delete newMeta[state.activePoolId];

      const remainingIds = Object.keys(newPools);
      const activePoolId = remainingIds.length > 0 ? remainingIds[remainingIds.length - 1] : null;

      return {
        pools: newPools,
        poolMeta: newMeta,
        activePoolId,
        accounts: cloneAccounts(DEFAULT_ACCOUNTS),
      };
    });
  },

  resetAll: () => {
    poolCounter = 0;
    set({
      pools: {},
      poolMeta: {},
      activePoolId: null,
      accounts: cloneAccounts(DEFAULT_ACCOUNTS),
      activeAccountId: 'alice',
    });
  },

  getSnapshot: () => {
    const state = get();
    const active = getActivePool(state);
    if (!active) {
      return createEmptySnapshot();
    }
    return createSnapshot(active.poolState.pool);
  },
}));

const EMPTY_HISTORY: ActionRecord[] = [];

export function useActivePool() {
  const pool = useStore(s => {
    const active = getActivePool(s);
    return active ? active.poolState.pool : null;
  });
  const meta = useStore(s => {
    const active = getActivePool(s);
    return active ? active.meta : null;
  });
  const history = useStore(s => {
    const active = getActivePool(s);
    return active ? active.poolState.history : EMPTY_HISTORY;
  });
  const currentStep = useStore(s => {
    const active = getActivePool(s);
    return active ? active.poolState.currentStep : -1;
  });
  const poolCount = useStore(s => Object.keys(s.pools).length);

  return { pool, meta, history, currentStep, poolCount };
}
