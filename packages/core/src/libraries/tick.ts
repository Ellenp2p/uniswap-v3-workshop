import { MIN_TICK, MAX_TICK, Q128 } from "../constants.js";
import { TickInfo } from "../types.js";
import { mulDiv } from "./fullMath.js";
import { addDelta } from "./liquidityMath.js";
import { getSqrtRatioAtTick } from "./tickMath.js";

export function tickSpacingToMaxLiquidityPerTick(tickSpacing: number): bigint {
  const minTick = Math.ceil(MIN_TICK / tickSpacing) * tickSpacing;
  const maxTick = Math.floor(MAX_TICK / tickSpacing) * tickSpacing;
  const numTicks = Math.floor((maxTick - minTick) / tickSpacing) + 1;
  return (2n ** 128n - 1n) / BigInt(numTicks);
}

export function getFeeGrowthInside(
  tickLower: TickInfo,
  tickUpper: TickInfo,
  tickLowerNum: number,
  tickUpperNum: number,
  tickCurrent: number,
  feeGrowthGlobal0X128: bigint,
  feeGrowthGlobal1X128: bigint
): { feeGrowthInside0X128: bigint; feeGrowthInside1X128: bigint } {
  let feeGrowthBelow0: bigint;
  let feeGrowthBelow1: bigint;

  if (tickCurrent >= tickLowerNum) {
    feeGrowthBelow0 = tickLower.feeGrowthOutside0X128;
    feeGrowthBelow1 = tickLower.feeGrowthOutside1X128;
  } else {
    feeGrowthBelow0 = feeGrowthGlobal0X128 - tickLower.feeGrowthOutside0X128;
    feeGrowthBelow1 = feeGrowthGlobal1X128 - tickLower.feeGrowthOutside1X128;
  }

  let feeGrowthAbove0: bigint;
  let feeGrowthAbove1: bigint;

  if (tickCurrent < tickUpperNum) {
    feeGrowthAbove0 = tickUpper.feeGrowthOutside0X128;
    feeGrowthAbove1 = tickUpper.feeGrowthOutside1X128;
  } else {
    feeGrowthAbove0 = feeGrowthGlobal0X128 - tickUpper.feeGrowthOutside0X128;
    feeGrowthAbove1 = feeGrowthGlobal1X128 - tickUpper.feeGrowthOutside1X128;
  }

  return {
    feeGrowthInside0X128: feeGrowthGlobal0X128 - feeGrowthBelow0 - feeGrowthAbove0,
    feeGrowthInside1X128: feeGrowthGlobal1X128 - feeGrowthBelow1 - feeGrowthAbove1,
  };
}

export function update(
  self: TickInfo,
  tick: number,
  tickCurrent: number,
  liquidityDelta: bigint,
  feeGrowthGlobal0X128: bigint,
  feeGrowthGlobal1X128: bigint,
  secondsPerLiquidityCumulativeX128: bigint,
  tickCumulative: bigint,
  time: number,
  upper: boolean,
  maxLiquidity: bigint
): { flipped: boolean; liquidityGrossBefore: bigint } {
  const liquidityGrossBefore = self.liquidityGross;
  const liquidityGross = liquidityGrossBefore + liquidityDelta;

  if (liquidityGross > maxLiquidity) {
    throw new Error("LO");
  }

  const flipped =
    (liquidityGross === 0n) !== (liquidityGrossBefore === 0n);

  if (liquidityGrossBefore === 0n) {
    if (tick <= tickCurrent) {
      self.feeGrowthOutside0X128 = feeGrowthGlobal0X128;
      self.feeGrowthOutside1X128 = feeGrowthGlobal1X128;
      self.secondsPerLiquidityOutsideX128 = secondsPerLiquidityCumulativeX128;
      self.tickCumulativeOutside = tickCumulative;
      self.secondsOutside = time;
    }
    self.initialized = true;
  }

  self.liquidityGross = liquidityGross;
  self.liquidityNet = upper
    ? self.liquidityNet - liquidityDelta
    : self.liquidityNet + liquidityDelta;

  return { flipped, liquidityGrossBefore };
}

export function clear(self: TickInfo): void {
  self.liquidityGross = 0n;
  self.liquidityNet = 0n;
  self.feeGrowthOutside0X128 = 0n;
  self.feeGrowthOutside1X128 = 0n;
  self.secondsPerLiquidityOutsideX128 = 0n;
  self.tickCumulativeOutside = 0n;
  self.secondsOutside = 0;
  self.initialized = false;
}

export function cross(
  self: TickInfo,
  feeGrowthGlobal0X128: bigint,
  feeGrowthGlobal1X128: bigint,
  secondsPerLiquidityCumulativeX128: bigint,
  tickCumulative: bigint,
  time: number
): bigint {
  self.feeGrowthOutside0X128 = feeGrowthGlobal0X128 - self.feeGrowthOutside0X128;
  self.feeGrowthOutside1X128 = feeGrowthGlobal1X128 - self.feeGrowthOutside1X128;
  self.secondsPerLiquidityOutsideX128 =
    secondsPerLiquidityCumulativeX128 - self.secondsPerLiquidityOutsideX128;
  self.tickCumulativeOutside = tickCumulative - self.tickCumulativeOutside;
  self.secondsOutside = time - self.secondsOutside;
  return self.liquidityNet;
}

export function createTickInfo(): TickInfo {
  return {
    liquidityGross: 0n,
    liquidityNet: 0n,
    feeGrowthOutside0X128: 0n,
    feeGrowthOutside1X128: 0n,
    secondsPerLiquidityOutsideX128: 0n,
    tickCumulativeOutside: 0n,
    secondsOutside: 0,
    initialized: false,
  };
}
