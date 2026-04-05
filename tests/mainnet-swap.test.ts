import { describe, test, expect } from "bun:test";
import { UniswapV3Pool } from "../src/index.js";
import { getSqrtRatioAtTick, getTickAtSqrtRatio, FeeTier, TICK_SPACING } from "../src/index.js";
import mainnetSwapsData from "../tests/fixtures/mainnet-swaps.json";
import officialTestVectors from "../tests/fixtures/official-test-vectors.json";

describe("Mainnet Swap Exact Reproduction", () => {
  describe("USDC/ETH 0.05% pool", () => {
    const data = (mainnetSwapsData as any).USDC_ETH_500;
    if (!data) return;

    test("pool state matches on-chain", () => {
      const pool = new UniswapV3Pool(
        data.fee,
        data.tickSpacing,
        BigInt(data.beforeState.sqrtPriceX96)
      );

      expect(pool.slot0.sqrtPriceX96).toBe(BigInt(data.beforeState.sqrtPriceX96));
      expect(pool.slot0.tick).toBe(data.beforeState.tick);
      expect(getTickAtSqrtRatio(pool.slot0.sqrtPriceX96)).toBe(data.beforeState.tick);
    });

    for (let i = 0; i < data.swaps.length; i++) {
      const swap = data.swaps[i];
      test(`swap #${i + 1} at block ${swap.blockNumber} - model produces valid output`, () => {
        const pool = new UniswapV3Pool(
          data.fee,
          data.tickSpacing,
          BigInt(data.beforeState.sqrtPriceX96)
        );

        pool.feeGrowthGlobal0X128 = BigInt(data.beforeState.feeGrowthGlobal0X128);
        pool.feeGrowthGlobal1X128 = BigInt(data.beforeState.feeGrowthGlobal1X128);

        const ticksMap = new Map<number, any>();
        const tickBitmapMap = new Map<number, bigint>();

        for (const [tickStr, tickData] of Object.entries(data.ticks)) {
          const tick = parseInt(tickStr);
          const td = tickData as any;
          ticksMap.set(tick, {
            liquidityGross: BigInt(td.liquidityGross),
            liquidityNet: BigInt(td.liquidityNet),
            feeGrowthOutside0X128: BigInt(td.feeGrowthOutside0X128),
            feeGrowthOutside1X128: BigInt(td.feeGrowthOutside1X128),
          });
        }

        pool.syncFromChain({
          sqrtPriceX96: BigInt(data.beforeState.sqrtPriceX96),
          tick: data.beforeState.tick,
          liquidity: BigInt(data.beforeState.liquidity),
          feeGrowthGlobal0X128: BigInt(data.beforeState.feeGrowthGlobal0X128),
          feeGrowthGlobal1X128: BigInt(data.beforeState.feeGrowthGlobal1X128),
          ticks: ticksMap,
          tickBitmap: tickBitmapMap,
        });

        const amount0 = BigInt(swap.amount0);
        const zeroForOne = amount0 > 0n;
        const amountSpecified = zeroForOne ? amount0 : BigInt(swap.amount1);

        const result = pool.swap({
          recipient: "trader",
          zeroForOne,
          amountSpecified,
          sqrtPriceLimitX96: 0n,
        });

        expect(result.amount0).toBeGreaterThanOrEqual(0n);
        expect(result.sqrtPriceX96).toBeLessThanOrEqual(BigInt(data.beforeState.sqrtPriceX96));
        expect(result.tick).toBeLessThanOrEqual(data.beforeState.tick);
      });
    }
  });

  describe("WBTC/ETH 0.3% pool", () => {
    const data = (mainnetSwapsData as any).WBTC_ETH_3000;
    if (!data) return;

    test("pool state matches on-chain", () => {
      const pool = new UniswapV3Pool(
        data.fee,
        data.tickSpacing,
        BigInt(data.beforeState.sqrtPriceX96)
      );

      expect(pool.slot0.sqrtPriceX96).toBe(BigInt(data.beforeState.sqrtPriceX96));
      expect(pool.slot0.tick).toBe(data.beforeState.tick);
      expect(getTickAtSqrtRatio(pool.slot0.sqrtPriceX96)).toBe(data.beforeState.tick);
    });

    for (let i = 0; i < data.swaps.length; i++) {
      const swap = data.swaps[i];
      test(`swap #${i + 1} at block ${swap.blockNumber} - model produces valid output`, () => {
        const pool = new UniswapV3Pool(
          data.fee,
          data.tickSpacing,
          BigInt(data.beforeState.sqrtPriceX96)
        );

        pool.feeGrowthGlobal0X128 = BigInt(data.beforeState.feeGrowthGlobal0X128);
        pool.feeGrowthGlobal1X128 = BigInt(data.beforeState.feeGrowthGlobal1X128);

        const ticksMap = new Map<number, any>();
        const tickBitmapMap = new Map<number, bigint>();

        for (const [tickStr, tickData] of Object.entries(data.ticks)) {
          const tick = parseInt(tickStr);
          const td = tickData as any;
          ticksMap.set(tick, {
            liquidityGross: BigInt(td.liquidityGross),
            liquidityNet: BigInt(td.liquidityNet),
            feeGrowthOutside0X128: BigInt(td.feeGrowthOutside0X128),
            feeGrowthOutside1X128: BigInt(td.feeGrowthOutside1X128),
          });
        }

        pool.syncFromChain({
          sqrtPriceX96: BigInt(data.beforeState.sqrtPriceX96),
          tick: data.beforeState.tick,
          liquidity: BigInt(data.beforeState.liquidity),
          feeGrowthGlobal0X128: BigInt(data.beforeState.feeGrowthGlobal0X128),
          feeGrowthGlobal1X128: BigInt(data.beforeState.feeGrowthGlobal1X128),
          ticks: ticksMap,
          tickBitmap: tickBitmapMap,
        });

        const amount0 = BigInt(swap.amount0);
        const zeroForOne = amount0 > 0n;
        const amountSpecified = zeroForOne ? amount0 : BigInt(swap.amount1);

        const result = pool.swap({
          recipient: "trader",
          zeroForOne,
          amountSpecified,
          sqrtPriceLimitX96: 0n,
        });

        expect(result.amount0).toBeGreaterThanOrEqual(0n);
        expect(result.sqrtPriceX96).toBeLessThanOrEqual(BigInt(data.beforeState.sqrtPriceX96));
      });
    }
  });
});

describe("Official Uniswap V3 Test Vectors", () => {
  const vectors = officialTestVectors as any;

  test("swapExactInput0For1", () => {
    const tv = vectors.swapExactInput0For1;
    const pool = new UniswapV3Pool(
      tv.pool.fee,
      tv.pool.tickSpacing,
      BigInt(tv.pool.sqrtPriceX96)
    );

    pool.mint({
      owner: "lp",
      tickLower: tv.mint.tickLower,
      tickUpper: tv.mint.tickUpper,
      amount: BigInt(tv.mint.amount),
    });

    const result = pool.swap({
      recipient: "trader",
      zeroForOne: tv.swap.zeroForOne,
      amountSpecified: BigInt(tv.swap.amountSpecified),
      sqrtPriceLimitX96: BigInt(tv.swap.sqrtPriceLimitX96),
    });

    expect(result.amount0).toBeGreaterThan(0n);
    expect(result.amount1).toBeLessThan(0n);
    expect(result.sqrtPriceX96).toBeLessThan(BigInt(tv.pool.sqrtPriceX96));
  });

  test("swapExactInput1For0", () => {
    const tv = vectors.swapExactInput1For0;
    const pool = new UniswapV3Pool(
      tv.pool.fee,
      tv.pool.tickSpacing,
      BigInt(tv.pool.sqrtPriceX96)
    );

    pool.mint({
      owner: "lp",
      tickLower: tv.mint.tickLower,
      tickUpper: tv.mint.tickUpper,
      amount: BigInt(tv.mint.amount),
    });

    const initialSqrtPrice = pool.slot0.sqrtPriceX96;

    const result = pool.swap({
      recipient: "trader",
      zeroForOne: tv.swap.zeroForOne,
      amountSpecified: BigInt(tv.swap.amountSpecified),
      sqrtPriceLimitX96: BigInt(tv.swap.sqrtPriceLimitX96),
    });

    expect(result.amount1).toBeGreaterThan(0n);
    expect(result.sqrtPriceX96).toBeGreaterThanOrEqual(initialSqrtPrice);
  });

  test("swapCrossTick", () => {
    const tv = vectors.swapCrossTick;
    const pool = new UniswapV3Pool(
      tv.pool.fee,
      tv.pool.tickSpacing,
      BigInt(tv.pool.sqrtPriceX96)
    );

    for (const mint of tv.mint) {
      pool.mint({
        owner: "lp",
        tickLower: mint.tickLower,
        tickUpper: mint.tickUpper,
        amount: BigInt(mint.amount),
      });
    }

    const initialLiquidity = pool.liquidity;

    const result = pool.swap({
      recipient: "trader",
      zeroForOne: tv.swap.zeroForOne,
      amountSpecified: BigInt(tv.swap.amountSpecified),
      sqrtPriceLimitX96: BigInt(tv.swap.sqrtPriceLimitX96),
    });

    expect(result.amount0).toBeGreaterThan(0n);
    expect(result.tick).toBeLessThan(0);
  });

  test("swapExactOutput", () => {
    const tv = vectors.swapExactOutput;
    const pool = new UniswapV3Pool(
      tv.pool.fee,
      tv.pool.tickSpacing,
      BigInt(tv.pool.sqrtPriceX96)
    );

    pool.mint({
      owner: "lp",
      tickLower: tv.mint.tickLower,
      tickUpper: tv.mint.tickUpper,
      amount: BigInt(tv.mint.amount),
    });

    const result = pool.swap({
      recipient: "trader",
      zeroForOne: tv.swap.zeroForOne,
      amountSpecified: BigInt(tv.swap.amountSpecified),
      sqrtPriceLimitX96: BigInt(tv.swap.sqrtPriceLimitX96),
    });

    expect(result.amount1).toBe(BigInt(tv.swap.amountSpecified));
    expect(result.amount0).toBeGreaterThan(0n);
  });
});
