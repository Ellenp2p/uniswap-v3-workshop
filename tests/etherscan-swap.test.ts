import { describe, test, expect } from "bun:test";
import { UniswapV3Pool } from "../src/index.js";
import { getSqrtRatioAtTick, getTickAtSqrtRatio } from "../src/index.js";
import etherscanData from "../tests/fixtures/etherscan-swaps.json";

describe("Etherscan Real Swap Data Verification", () => {
  const data = (etherscanData as any).USDC_ETH_500;
  if (!data || !data.swaps || data.swaps.length === 0) return;

  test("all swaps have valid data", () => {
    for (const swap of data.swaps) {
      expect(BigInt(swap.amount0) !== 0n || BigInt(swap.amount1) !== 0n).toBe(true);
      expect(BigInt(swap.sqrtPriceX96)).toBeGreaterThan(0n);
      expect(BigInt(swap.liquidity)).toBeGreaterThanOrEqual(0n);
    }
  });

  test("sqrtPriceX96 and tick are consistent for all swaps", () => {
    for (const swap of data.swaps) {
      const sqrtPrice = BigInt(swap.sqrtPriceX96);
      const tick = swap.tick;
      const computedTick = getTickAtSqrtRatio(sqrtPrice);
      expect(computedTick).toBe(tick);
    }
  });

  test("tick ranges are reasonable", () => {
    const ticks = data.swaps.map((s: any) => s.tick);
    const minTick = Math.min(...ticks);
    const maxTick = Math.max(...ticks);
    expect(minTick).toBeGreaterThanOrEqual(-887272);
    expect(maxTick).toBeLessThanOrEqual(887272);
    expect(maxTick - minTick).toBeLessThan(10000);
  });


  test("model produces valid swap output for each real swap", () => {
    for (let i = 0; i < Math.min(data.swaps.length, 10); i++) {
      const swap = data.swaps[i];
      const pool = new UniswapV3Pool(
        data.fee,
        data.tickSpacing,
        BigInt(swap.sqrtPriceX96)
      );

      pool.syncFromChain({
        sqrtPriceX96: BigInt(swap.sqrtPriceX96),
        tick: swap.tick,
        liquidity: BigInt(swap.liquidity),
        feeGrowthGlobal0X128: 0n,
        feeGrowthGlobal1X128: 0n,
        ticks: new Map(),
        tickBitmap: new Map(),
      });

      const amount0 = BigInt(swap.amount0);
      const amount1 = BigInt(swap.amount1);
      const zeroForOne = amount0 > 0n;
      const amountSpecified = zeroForOne ? amount0 : -amount1;

      if (amountSpecified <= 0n) continue;

      const result = pool.swap({
        recipient: "trader",
        zeroForOne,
        amountSpecified,
        sqrtPriceLimitX96: 0n,
      });

      expect(result.amount0).toBeGreaterThanOrEqual(0n);
      expect(result.sqrtPriceX96).toBeGreaterThan(0n);
      expect(result.tick).toBeGreaterThanOrEqual(-887272);
      expect(result.tick).toBeLessThanOrEqual(887272);
    }
  });
});
