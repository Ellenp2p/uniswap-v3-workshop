import { MIN_TICK, MAX_TICK, FEE_DENOMINATOR, Q128 } from "../constants.js";
import {
  Slot0,
  TickInfo,
  PositionInfo,
  Observation,
  SwapState,
  StepComputations,
  SwapParams,
  MintParams,
  BurnParams,
  CollectParams,
  SwapResult,
  MintResult,
  BurnResult,
  CollectResult,
} from "../types.js";
import { getSqrtRatioAtTick, getTickAtSqrtRatio } from "../libraries/tickMath.js";
import { addDelta } from "../libraries/liquidityMath.js";
import { computeSwapStep } from "../libraries/swapMath.js";
import {
  nextInitializedTickWithinOneWord,
  flipTick,
} from "../libraries/tickBitmap.js";
import * as Tick from "../libraries/tick.js";
import * as Position from "../libraries/position.js";
import * as Oracle from "../libraries/oracle.js";
import { keccak256 } from "ethers";

function positionKey(owner: string, tickLower: number, tickUpper: number): string {
  const ownerBytes = addressToBytes(owner);
  const lowerBytes = int24ToBytes(tickLower);
  const upperBytes = int24ToBytes(tickUpper);
  const combined = new Uint8Array(20 + 3 + 3);
  combined.set(ownerBytes, 0);
  combined.set(lowerBytes, 20);
  combined.set(upperBytes, 23);
  return keccak256(combined);
}

function addressToBytes(addr: string): Uint8Array {
  if (addr.startsWith("0x") && addr.length === 42) {
    const bytes = new Uint8Array(20);
    for (let i = 0; i < 20; i++) {
      bytes[i] = parseInt(addr.slice(2 + i * 2, 4 + i * 2), 16);
    }
    return bytes;
  }
  const bytes = new Uint8Array(20);
  const textBytes = new TextEncoder().encode(addr);
  for (let i = 0; i < Math.min(textBytes.length, 20); i++) {
    bytes[20 - textBytes.length + i] = textBytes[i];
  }
  return bytes;
}

function int24ToBytes(value: number): Uint8Array {
  const bytes = new Uint8Array(3);
  let v = value;
  if (v < 0) v = v + (1 << 24);
  bytes[0] = (v >> 16) & 0xff;
  bytes[1] = (v >> 8) & 0xff;
  bytes[2] = v & 0xff;
  return bytes;
}

export class UniswapV3Pool {
  public slot0: Slot0;
  public feeGrowthGlobal0X128: bigint;
  public feeGrowthGlobal1X128: bigint;
  public protocolFee: bigint;
  public liquidity: bigint;
  public fee: number;
  public tickSpacing: number;

  public ticks: Map<number, TickInfo>;
  public tickBitmap: Map<number, bigint>;
  public positions: Map<string, PositionInfo>;
  public observations: Observation[];

  private time: number;

  constructor(fee: number, tickSpacing: number, initialSqrtPriceX96: bigint) {
    this.fee = fee;
    this.tickSpacing = tickSpacing;
    this.liquidity = 0n;
    this.feeGrowthGlobal0X128 = 0n;
    this.feeGrowthGlobal1X128 = 0n;
    this.protocolFee = 0n;
    this.time = 0;

    const tick = getTickAtSqrtRatio(initialSqrtPriceX96);

    this.slot0 = {
      sqrtPriceX96: initialSqrtPriceX96,
      tick,
      observationIndex: 0,
      observationCardinality: 1,
      observationCardinalityNext: 1,
      feeProtocol: 0,
      unlocked: true,
    };

    this.ticks = new Map();
    this.tickBitmap = new Map();
    this.positions = new Map();
    this.observations = [{
      blockTimestamp: this.time,
      tickCumulative: 0n,
      secondsPerLiquidityCumulativeX128: 0n,
      initialized: true,
    }];
  }

  advanceTime(seconds: number): void {
    this.time += seconds;
  }

  getTime(): number {
    return this.time;
  }

  swap(params: SwapParams): SwapResult {
    if (params.amountSpecified === 0n) {
      throw new Error("AS");
    }

    const zeroForOne = params.zeroForOne;
    const sqrtPriceLimitX96 =
      params.sqrtPriceLimitX96 !== 0n
        ? params.sqrtPriceLimitX96
        : zeroForOne
          ? getSqrtRatioAtTick(MIN_TICK) + 1n
          : getSqrtRatioAtTick(MAX_TICK) - 1n;

    if (zeroForOne) {
      if (sqrtPriceLimitX96 <= getSqrtRatioAtTick(MIN_TICK)) {
        throw new Error("SPL");
      }
      if (sqrtPriceLimitX96 >= this.slot0.sqrtPriceX96) {
        throw new Error("SPL");
      }
    } else {
      if (sqrtPriceLimitX96 >= getSqrtRatioAtTick(MAX_TICK)) {
        throw new Error("SPL");
      }
      if (sqrtPriceLimitX96 <= this.slot0.sqrtPriceX96) {
        throw new Error("SPL");
      }
    }

    const exactInput = params.amountSpecified > 0n;

    let state: SwapState = {
      amountSpecifiedRemaining: params.amountSpecified,
      amountCalculated: 0n,
      sqrtPriceX96: this.slot0.sqrtPriceX96,
      tick: this.slot0.tick,
      feeGrowthGlobalX128: zeroForOne ? this.feeGrowthGlobal0X128 : this.feeGrowthGlobal1X128,
      protocolFee: 0n,
      liquidity: this.liquidity,
    };

    while (
      state.amountSpecifiedRemaining !== 0n &&
      state.sqrtPriceX96 !== sqrtPriceLimitX96
    ) {
      let step: StepComputations = {
        sqrtPriceStartX96: state.sqrtPriceX96,
        tickNext: 0,
        initialized: false,
        sqrtPriceNextX96: 0n,
        amountIn: 0n,
        amountOut: 0n,
        feeAmount: 0n,
      };

      const { next, initialized } = nextInitializedTickWithinOneWord(
        this.tickBitmap,
        state.tick,
        this.tickSpacing,
        zeroForOne
      );

      step.tickNext = next;
      step.initialized = initialized;

      if (step.tickNext < MIN_TICK) {
        step.tickNext = MIN_TICK;
      } else if (step.tickNext > MAX_TICK) {
        step.tickNext = MAX_TICK;
      }

      step.sqrtPriceNextX96 = getSqrtRatioAtTick(step.tickNext);

      if (step.sqrtPriceNextX96 === state.sqrtPriceX96) {
        if (step.initialized) {
          const { indexUpdated } = Oracle.write(
            this.observations,
            this.slot0.observationIndex,
            this.time,
            this.slot0.tick,
            this.liquidity,
            this.slot0.observationCardinality,
            this.slot0.observationCardinalityNext
          );
          this.slot0.observationIndex = indexUpdated;

          const tickInfo = this.ticks.get(step.tickNext);
          if (!tickInfo) {
            throw new Error("tick not found");
          }

          const liquidityNet = Tick.cross(
            tickInfo,
            zeroForOne ? this.feeGrowthGlobal0X128 : state.feeGrowthGlobalX128,
            zeroForOne ? state.feeGrowthGlobalX128 : this.feeGrowthGlobal1X128,
            0n,
            0n,
            this.time
          );

          if (zeroForOne) {
            state.liquidity = addDelta(state.liquidity, -liquidityNet);
          } else {
            state.liquidity = addDelta(state.liquidity, liquidityNet);
          }
        }

        state.tick = zeroForOne ? step.tickNext - 1 : step.tickNext;
        continue;
      }

      let targetPrice: bigint;
      if (
        (zeroForOne && step.sqrtPriceNextX96 < sqrtPriceLimitX96) ||
        (!zeroForOne && step.sqrtPriceNextX96 > sqrtPriceLimitX96)
      ) {
        targetPrice = sqrtPriceLimitX96;
      } else {
        targetPrice = step.sqrtPriceNextX96;
      }

      const swapResult = computeSwapStep(
        state.sqrtPriceX96,
        targetPrice,
        state.liquidity,
        state.amountSpecifiedRemaining,
        this.fee
      );

      state.sqrtPriceX96 = swapResult.sqrtRatioNextX96;
      step.amountIn = swapResult.amountIn;
      step.amountOut = swapResult.amountOut;
      step.feeAmount = swapResult.feeAmount;

      if (exactInput) {
        state.amountSpecifiedRemaining -= step.amountIn + step.feeAmount;
        state.amountCalculated -= step.amountOut;
      } else {
        state.amountSpecifiedRemaining += step.amountOut;
        state.amountCalculated += step.amountIn + step.feeAmount;
      }

      if (state.liquidity > 0n) {
        const feeGrowthDelta = (step.feeAmount * Q128) / state.liquidity;
        state.feeGrowthGlobalX128 += feeGrowthDelta;
      }

      if (
        state.sqrtPriceX96 === step.sqrtPriceNextX96 &&
        step.initialized &&
        step.tickNext !== MIN_TICK &&
        step.tickNext !== MAX_TICK
      ) {
        const { indexUpdated } = Oracle.write(
          this.observations,
          this.slot0.observationIndex,
          this.time,
          this.slot0.tick,
          this.liquidity,
          this.slot0.observationCardinality,
          this.slot0.observationCardinalityNext
        );
        this.slot0.observationIndex = indexUpdated;

        const tickInfo = this.ticks.get(step.tickNext);
        if (!tickInfo) {
          throw new Error("tick not found");
        }

        const liquidityNet = Tick.cross(
          tickInfo,
          zeroForOne ? this.feeGrowthGlobal0X128 : state.feeGrowthGlobalX128,
          zeroForOne ? state.feeGrowthGlobalX128 : this.feeGrowthGlobal1X128,
          0n,
          0n,
          this.time
        );

        if (zeroForOne) {
          state.liquidity = addDelta(state.liquidity, -liquidityNet);
        } else {
          state.liquidity = addDelta(state.liquidity, liquidityNet);
        }

        state.tick = zeroForOne ? step.tickNext - 1 : step.tickNext;
      } else if (state.sqrtPriceX96 !== step.sqrtPriceNextX96) {
        state.tick = getTickAtSqrtRatio(state.sqrtPriceX96);
      } else {
        state.tick = zeroForOne ? step.tickNext - 1 : step.tickNext;
      }
    }

    if (zeroForOne) {
      this.feeGrowthGlobal0X128 = state.feeGrowthGlobalX128;
    } else {
      this.feeGrowthGlobal1X128 = state.feeGrowthGlobalX128;
    }

    this.slot0.sqrtPriceX96 = state.sqrtPriceX96;
    this.slot0.tick = state.tick;
    this.liquidity = state.liquidity;

    if (zeroForOne) {
      return {
        amount0: exactInput
          ? params.amountSpecified - state.amountSpecifiedRemaining
          : state.amountCalculated,
        amount1: exactInput
          ? state.amountCalculated
          : params.amountSpecified - state.amountSpecifiedRemaining,
        sqrtPriceX96: state.sqrtPriceX96,
        liquidity: state.liquidity,
        tick: state.tick,
      };
    } else {
      return {
        amount0: exactInput
          ? state.amountCalculated
          : params.amountSpecified - state.amountSpecifiedRemaining,
        amount1: exactInput
          ? params.amountSpecified - state.amountSpecifiedRemaining
          : state.amountCalculated,
        sqrtPriceX96: state.sqrtPriceX96,
        liquidity: state.liquidity,
        tick: state.tick,
      };
    }
  }

  mint(params: MintParams): MintResult {
    if (params.tickLower >= params.tickUpper) {
      throw new Error("tick order");
    }
    if (
      params.tickLower < MIN_TICK ||
      params.tickUpper > MAX_TICK
    ) {
      throw new Error("tick range");
    }
    if (params.tickLower % this.tickSpacing !== 0 || params.tickUpper % this.tickSpacing !== 0) {
      throw new Error("tick spacing");
    }

    let amount0 = 0n;
    let amount1 = 0n;

    const key = positionKey(params.owner, params.tickLower, params.tickUpper);
    let position = this.positions.get(key);
    if (!position) {
      position = Position.createPositionInfo();
      this.positions.set(key, position);
    }

    const sqrtPriceX96 = this.slot0.sqrtPriceX96;
    const sqrtRatioAX96 = getSqrtRatioAtTick(params.tickLower);
    const sqrtRatioBX96 = getSqrtRatioAtTick(params.tickUpper);

    const maxLiquidityPerTick = Tick.tickSpacingToMaxLiquidityPerTick(this.tickSpacing);

    const updateTick = (tick: number, upper: boolean) => {
      let tickInfo = this.ticks.get(tick);
      if (!tickInfo) {
        tickInfo = Tick.createTickInfo();
        this.ticks.set(tick, tickInfo);
      }

      const { flipped, liquidityGrossBefore } = Tick.update(
        tickInfo,
        tick,
        this.slot0.tick,
        params.amount,
        this.feeGrowthGlobal0X128,
        this.feeGrowthGlobal1X128,
        0n,
        0n,
        this.time,
        upper,
        maxLiquidityPerTick
      );

      if (flipped) {
        flipTick(this.tickBitmap, tick, this.tickSpacing);
      }
    };

    updateTick(params.tickLower, false);
    updateTick(params.tickUpper, true);

    if (params.amount > 0n) {
      const feeGrowthInside = Tick.getFeeGrowthInside(
        this.ticks.get(params.tickLower) ?? Tick.createTickInfo(),
        this.ticks.get(params.tickUpper) ?? Tick.createTickInfo(),
        params.tickLower,
        params.tickUpper,
        this.slot0.tick,
        this.feeGrowthGlobal0X128,
        this.feeGrowthGlobal1X128
      );

      Position.update(
        position,
        params.amount,
        feeGrowthInside.feeGrowthInside0X128,
        feeGrowthInside.feeGrowthInside1X128
      );

      if (sqrtPriceX96 >= sqrtRatioAX96 && sqrtPriceX96 < sqrtRatioBX96) {
        this.liquidity = addDelta(this.liquidity, params.amount);
      }

      if (sqrtPriceX96 < sqrtRatioAX96) {
        amount0 = this._getAmount0Delta(sqrtRatioAX96, sqrtRatioBX96, params.amount, true);
        amount1 = 0n;
      } else if (sqrtPriceX96 >= sqrtRatioBX96) {
        amount0 = 0n;
        amount1 = this._getAmount1Delta(sqrtRatioAX96, sqrtRatioBX96, params.amount, true);
      } else {
        amount0 = this._getAmount0Delta(sqrtPriceX96, sqrtRatioBX96, params.amount, true);
        amount1 = this._getAmount1Delta(sqrtRatioAX96, sqrtPriceX96, params.amount, true);
      }
    }

    return { amount0, amount1 };
  }

  burn(params: BurnParams & { owner?: string }): BurnResult {
    if (params.tickLower >= params.tickUpper) {
      throw new Error("tick order");
    }

    const sqrtRatioAX96 = getSqrtRatioAtTick(params.tickLower);
    const sqrtRatioBX96 = getSqrtRatioAtTick(params.tickUpper);

    const feeGrowthInside = Tick.getFeeGrowthInside(
      this.ticks.get(params.tickLower) ?? Tick.createTickInfo(),
      this.ticks.get(params.tickUpper) ?? Tick.createTickInfo(),
      params.tickLower,
      params.tickUpper,
      this.slot0.tick,
      this.feeGrowthGlobal0X128,
      this.feeGrowthGlobal1X128
    );

    const key = positionKey(params.owner ?? "", params.tickLower, params.tickUpper);
    const position = this.positions.get(key);
    if (!position) {
      throw new Error("position not found");
    }

    Position.update(
      position,
      -params.amount,
      feeGrowthInside.feeGrowthInside0X128,
      feeGrowthInside.feeGrowthInside1X128
    );

    if (params.amount > 0n) {
      if (
        this.slot0.sqrtPriceX96 >= sqrtRatioAX96 &&
        this.slot0.sqrtPriceX96 < sqrtRatioBX96
      ) {
        this.liquidity = addDelta(this.liquidity, -params.amount);
      }

      Tick.update(
        this.ticks.get(params.tickLower)!,
        params.tickLower,
        this.slot0.tick,
        -params.amount,
        this.feeGrowthGlobal0X128,
        this.feeGrowthGlobal1X128,
        0n,
        0n,
        this.time,
        false,
        Tick.tickSpacingToMaxLiquidityPerTick(this.tickSpacing)
      );

      Tick.update(
        this.ticks.get(params.tickUpper)!,
        params.tickUpper,
        this.slot0.tick,
        -params.amount,
        this.feeGrowthGlobal0X128,
        this.feeGrowthGlobal1X128,
        0n,
        0n,
        this.time,
        true,
        Tick.tickSpacingToMaxLiquidityPerTick(this.tickSpacing)
      );
    }

    const amount0 = this._getAmount0Delta(sqrtRatioAX96, sqrtRatioBX96, params.amount, false);
    const amount1 = this._getAmount1Delta(sqrtRatioAX96, sqrtRatioBX96, params.amount, false);

    return { amount0, amount1 };
  }

  collect(params: CollectParams): CollectResult {
    const key = positionKey(params.owner, params.tickLower, params.tickUpper);
    const position = this.positions.get(key);
    if (!position) {
      throw new Error("position not found");
    }

    const feeGrowthInside = Tick.getFeeGrowthInside(
      this.ticks.get(params.tickLower) ?? Tick.createTickInfo(),
      this.ticks.get(params.tickUpper) ?? Tick.createTickInfo(),
      params.tickLower,
      params.tickUpper,
      this.slot0.tick,
      this.feeGrowthGlobal0X128,
      this.feeGrowthGlobal1X128
    );

    Position.update(
      position,
      0n,
      feeGrowthInside.feeGrowthInside0X128,
      feeGrowthInside.feeGrowthInside1X128
    );

    const tokensOwed0 = position.tokensOwed0;
    const tokensOwed1 = position.tokensOwed1;

    if (tokensOwed0 > 0n || tokensOwed1 > 0n) {
      position.tokensOwed0 = 0n;
      position.tokensOwed1 = 0n;
    }

    return { tokensOwed0, tokensOwed1 };
  }

  private _getAmount0Delta(
    sqrtRatioAX96: bigint,
    sqrtRatioBX96: bigint,
    liquidity: bigint,
    roundUp: boolean
  ): bigint {
    if (sqrtRatioAX96 > sqrtRatioBX96) {
      [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
    }

    const numerator1 = liquidity << 96n;
    const numerator2 = sqrtRatioBX96 - sqrtRatioAX96;

    if (roundUp) {
      const result = (numerator1 * numerator2) / sqrtRatioBX96;
      return (result / sqrtRatioAX96) + ((result % sqrtRatioAX96 !== 0n) ? 1n : 0n);
    }

    return (numerator1 * numerator2) / sqrtRatioBX96 / sqrtRatioAX96;
  }

  private _getAmount1Delta(
    sqrtRatioAX96: bigint,
    sqrtRatioBX96: bigint,
    liquidity: bigint,
    roundUp: boolean
  ): bigint {
    if (sqrtRatioAX96 > sqrtRatioBX96) {
      [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
    }

    const result = (liquidity * (sqrtRatioBX96 - sqrtRatioAX96)) / (2n ** 96n);

    if (roundUp) {
      return result + ((liquidity * (sqrtRatioBX96 - sqrtRatioAX96)) % (2n ** 96n) !== 0n ? 1n : 0n);
    }

    return result;
  }

  getPosition(owner: string, tickLower: number, tickUpper: number): PositionInfo {
    const key = positionKey(owner, tickLower, tickUpper);
    return this.positions.get(key) ?? Position.createPositionInfo();
  }

  getTick(tick: number): TickInfo {
    return this.ticks.get(tick) ?? Tick.createTickInfo();
  }

  getPrice(): number {
    const sqrtPrice = Number(this.slot0.sqrtPriceX96) / Number(2n ** 96n);
    return sqrtPrice * sqrtPrice;
  }

  syncFromChain(state: {
    sqrtPriceX96: bigint;
    tick: number;
    liquidity: bigint;
    feeGrowthGlobal0X128: bigint;
    feeGrowthGlobal1X128: bigint;
    ticks: Map<number, { liquidityGross: bigint; liquidityNet: bigint; feeGrowthOutside0X128: bigint; feeGrowthOutside1X128: bigint }>;
    tickBitmap: Map<number, bigint>;
  }): void {
    this.slot0.sqrtPriceX96 = state.sqrtPriceX96;
    this.slot0.tick = state.tick;
    this.liquidity = state.liquidity;
    this.feeGrowthGlobal0X128 = state.feeGrowthGlobal0X128;
    this.feeGrowthGlobal1X128 = state.feeGrowthGlobal1X128;

    for (const [tick, tickData] of state.ticks) {
      const tickInfo = Tick.createTickInfo();
      tickInfo.liquidityGross = tickData.liquidityGross;
      tickInfo.liquidityNet = tickData.liquidityNet;
      tickInfo.feeGrowthOutside0X128 = tickData.feeGrowthOutside0X128;
      tickInfo.feeGrowthOutside1X128 = tickData.feeGrowthOutside1X128;
      tickInfo.initialized = true;
      this.ticks.set(tick, tickInfo);
    }

    for (const [word, value] of state.tickBitmap) {
      this.tickBitmap.set(word, value);
    }
  }
}
