export interface Slot0 {
  sqrtPriceX96: bigint;
  tick: number;
  observationIndex: number;
  observationCardinality: number;
  observationCardinalityNext: number;
  feeProtocol: number;
  unlocked: boolean;
}

export interface TickInfo {
  liquidityGross: bigint;
  liquidityNet: bigint;
  feeGrowthOutside0X128: bigint;
  feeGrowthOutside1X128: bigint;
  secondsPerLiquidityOutsideX128: bigint;
  tickCumulativeOutside: bigint;
  secondsOutside: number;
  initialized: boolean;
}

export interface PositionInfo {
  liquidity: bigint;
  feeGrowthInside0LastX128: bigint;
  feeGrowthInside1LastX128: bigint;
  tokensOwed0: bigint;
  tokensOwed1: bigint;
}

export interface Observation {
  blockTimestamp: number;
  tickCumulative: bigint;
  secondsPerLiquidityCumulativeX128: bigint;
  initialized: boolean;
}

export interface SwapState {
  amountSpecifiedRemaining: bigint;
  amountCalculated: bigint;
  sqrtPriceX96: bigint;
  tick: number;
  feeGrowthGlobalX128: bigint;
  protocolFee: bigint;
  liquidity: bigint;
}

export interface StepComputations {
  sqrtPriceStartX96: bigint;
  tickNext: number;
  initialized: boolean;
  sqrtPriceNextX96: bigint;
  amountIn: bigint;
  amountOut: bigint;
  feeAmount: bigint;
}

export type SwapParams = {
  recipient: string;
  zeroForOne: boolean;
  amountSpecified: bigint;
  sqrtPriceLimitX96: bigint;
};

export type MintParams = {
  owner: string;
  tickLower: number;
  tickUpper: number;
  amount: bigint;
};

export type BurnParams = {
  tickLower: number;
  tickUpper: number;
  amount: bigint;
};

export type CollectParams = {
  owner: string;
  tickLower: number;
  tickUpper: number;
  recipient: string;
};

export interface SwapResult {
  amount0: bigint;
  amount1: bigint;
  sqrtPriceX96: bigint;
  liquidity: bigint;
  tick: number;
}

export interface MintResult {
  amount0: bigint;
  amount1: bigint;
}

export interface BurnResult {
  amount0: bigint;
  amount1: bigint;
}

export interface CollectResult {
  tokensOwed0: bigint;
  tokensOwed1: bigint;
}
