import { describe, test, expect } from "bun:test";
import {
  update,
  cross,
  clear,
  getFeeGrowthInside,
  tickSpacingToMaxLiquidityPerTick,
  createTickInfo,
} from "../src/libraries/tick.js";
import { getSqrtRatioAtTick } from "../src/libraries/tickMath.js";

describe("Tick", () => {
  describe("tickSpacingToMaxLiquidityPerTick", () => {
    test("tickSpacing 10", () => {
      const maxLiquidity = tickSpacingToMaxLiquidityPerTick(10);
      expect(maxLiquidity).toBeGreaterThan(0n);
    });

    test("tickSpacing 60", () => {
      const maxLiquidity = tickSpacingToMaxLiquidityPerTick(60);
      expect(maxLiquidity).toBeGreaterThan(0n);
    });

    test("tickSpacing 200", () => {
      const maxLiquidity = tickSpacingToMaxLiquidityPerTick(200);
      expect(maxLiquidity).toBeGreaterThan(0n);
    });

    test("smaller tickSpacing allows less liquidity per tick", () => {
      const max10 = tickSpacingToMaxLiquidityPerTick(10);
      const max60 = tickSpacingToMaxLiquidityPerTick(60);
      expect(max10).toBeLessThan(max60);
    });
  });

  describe("update", () => {
    test("initializes a new tick", () => {
      const tickInfo = createTickInfo();
      const maxLiquidity = tickSpacingToMaxLiquidityPerTick(60);

      update(
        tickInfo,
        -600,
        0,
        1000000000000000000n,
        0n,
        0n,
        0n,
        0n,
        0,
        false,
        maxLiquidity
      );

      expect(tickInfo.initialized).toBe(true);
      expect(tickInfo.liquidityGross).toBe(1000000000000000000n);
      expect(tickInfo.liquidityNet).toBe(1000000000000000000n);
    });

    test("upper tick has negative liquidityNet", () => {
      const tickInfo = createTickInfo();
      const maxLiquidity = tickSpacingToMaxLiquidityPerTick(60);

      update(
        tickInfo,
        600,
        0,
        1000000000000000000n,
        0n,
        0n,
        0n,
        0n,
        0,
        true,
        maxLiquidity
      );

      expect(tickInfo.initialized).toBe(true);
      expect(tickInfo.liquidityGross).toBe(1000000000000000000n);
      expect(tickInfo.liquidityNet).toBe(-1000000000000000000n);
    });

    test("accumulates liquidity for multiple updates", () => {
      const tickInfo = createTickInfo();
      const maxLiquidity = tickSpacingToMaxLiquidityPerTick(60);

      update(
        tickInfo,
        -600,
        0,
        1000000000000000000n,
        0n,
        0n,
        0n,
        0n,
        0,
        false,
        maxLiquidity
      );

      update(
        tickInfo,
        -600,
        0,
        500000000000000000n,
        0n,
        0n,
        0n,
        0n,
        0,
        false,
        maxLiquidity
      );

      expect(tickInfo.liquidityGross).toBe(1500000000000000000n);
      expect(tickInfo.liquidityNet).toBe(1500000000000000000n);
    });

    test("throws when exceeding max liquidity", () => {
      const tickInfo = createTickInfo();
      const maxLiquidity = 1000000000000000000n;

      update(
        tickInfo,
        -600,
        0,
        1000000000000000000n,
        0n,
        0n,
        0n,
        0n,
        0,
        false,
        maxLiquidity
      );

      expect(() =>
        update(
          tickInfo,
          -600,
          0,
          1n,
          0n,
          0n,
          0n,
          0n,
          0,
          false,
          maxLiquidity
        )
      ).toThrow("LO");
    });

    test("returns flipped=true when transitioning from 0 to non-zero", () => {
      const tickInfo = createTickInfo();
      const maxLiquidity = tickSpacingToMaxLiquidityPerTick(60);

      const { flipped } = update(
        tickInfo,
        -600,
        0,
        1000000000000000000n,
        0n,
        0n,
        0n,
        0n,
        0,
        false,
        maxLiquidity
      );

      expect(flipped).toBe(true);
    });

    test("returns flipped=false when liquidity stays non-zero", () => {
      const tickInfo = createTickInfo();
      const maxLiquidity = tickSpacingToMaxLiquidityPerTick(60);

      update(
        tickInfo,
        -600,
        0,
        1000000000000000000n,
        0n,
        0n,
        0n,
        0n,
        0,
        false,
        maxLiquidity
      );

      const { flipped } = update(
        tickInfo,
        -600,
        0,
        500000000000000000n,
        0n,
        0n,
        0n,
        0n,
        0,
        false,
        maxLiquidity
      );

      expect(flipped).toBe(false);
    });

    test("returns flipped=true when transitioning to 0", () => {
      const tickInfo = createTickInfo();
      const maxLiquidity = tickSpacingToMaxLiquidityPerTick(60);

      update(
        tickInfo,
        -600,
        0,
        1000000000000000000n,
        0n,
        0n,
        0n,
        0n,
        0,
        false,
        maxLiquidity
      );

      const { flipped } = update(
        tickInfo,
        -600,
        0,
        -1000000000000000000n,
        0n,
        0n,
        0n,
        0n,
        0,
        false,
        maxLiquidity
      );

      expect(flipped).toBe(true);
      expect(tickInfo.liquidityGross).toBe(0n);
      expect(tickInfo.liquidityNet).toBe(0n);
    });
  });

  describe("cross", () => {
    test("flips feeGrowthOutside", () => {
      const tickInfo = createTickInfo();
      const maxLiquidity = tickSpacingToMaxLiquidityPerTick(60);

      update(
        tickInfo,
        -600,
        0,
        1000000000000000000n,
        0n,
        0n,
        0n,
        0n,
        0,
        false,
        maxLiquidity
      );

      const liquidityNet = cross(
        tickInfo,
        1000000000000000000000000000000n,
        2000000000000000000000000000000n,
        3000000000000000000000000000000n,
        4000000000000000000000000000000n,
        1000
      );

      expect(liquidityNet).toBe(1000000000000000000n);
      expect(tickInfo.feeGrowthOutside0X128).toBe(1000000000000000000000000000000n);
      expect(tickInfo.feeGrowthOutside1X128).toBe(2000000000000000000000000000000n);
      expect(tickInfo.secondsPerLiquidityOutsideX128).toBe(3000000000000000000000000000000n);
      expect(tickInfo.tickCumulativeOutside).toBe(4000000000000000000000000000000n);
      expect(tickInfo.secondsOutside).toBe(1000);
    });

    test("second cross restores original values", () => {
      const tickInfo = createTickInfo();
      const maxLiquidity = tickSpacingToMaxLiquidityPerTick(60);

      update(
        tickInfo,
        -600,
        0,
        1000000000000000000n,
        0n,
        0n,
        0n,
        0n,
        0,
        false,
        maxLiquidity
      );

      const global0 = 1000000000000000000000000000000n;
      const global1 = 2000000000000000000000000000000n;

      cross(tickInfo, global0, global1, 0n, 0n, 1000);

      cross(tickInfo, global0, global1, 0n, 0n, 1000);

      expect(tickInfo.feeGrowthOutside0X128).toBe(0n);
      expect(tickInfo.feeGrowthOutside1X128).toBe(0n);
    });
  });

  describe("getFeeGrowthInside", () => {
    test("full range position gets all fees", () => {
      const tickLower = createTickInfo();
      const tickUpper = createTickInfo();

      const result = getFeeGrowthInside(
        tickLower,
        tickUpper,
        -887272,
        887272,
        0,
        1000000000000000000000000000000n,
        2000000000000000000000000000000n
      );

      expect(result.feeGrowthInside0X128).toBe(1000000000000000000000000000000n);
      expect(result.feeGrowthInside1X128).toBe(2000000000000000000000000000000n);
    });

    test("position below current tick gets no fees", () => {
      const tickLower = createTickInfo();
      const tickUpper = createTickInfo();

      const result = getFeeGrowthInside(
        tickLower,
        tickUpper,
        1000,
        2000,
        3000,
        1000000000000000000000000000000n,
        2000000000000000000000000000000n
      );

      expect(result.feeGrowthInside0X128).toBe(0n);
      expect(result.feeGrowthInside1X128).toBe(0n);
    });

    test("position above current tick gets no fees", () => {
      const tickLower = createTickInfo();
      const tickUpper = createTickInfo();

      const result = getFeeGrowthInside(
        tickLower,
        tickUpper,
        -2000,
        -1000,
        -3000,
        1000000000000000000000000000000n,
        2000000000000000000000000000000n
      );

      expect(result.feeGrowthInside0X128).toBe(0n);
      expect(result.feeGrowthInside1X128).toBe(0n);
    });
  });

  describe("clear", () => {
    test("resets all fields", () => {
      const tickInfo = createTickInfo();
      tickInfo.liquidityGross = 100n;
      tickInfo.liquidityNet = 50n;
      tickInfo.feeGrowthOutside0X128 = 1000n;
      tickInfo.feeGrowthOutside1X128 = 2000n;
      tickInfo.secondsPerLiquidityOutsideX128 = 3000n;
      tickInfo.tickCumulativeOutside = 4000n;
      tickInfo.secondsOutside = 100;
      tickInfo.initialized = true;

      clear(tickInfo);

      expect(tickInfo.liquidityGross).toBe(0n);
      expect(tickInfo.liquidityNet).toBe(0n);
      expect(tickInfo.feeGrowthOutside0X128).toBe(0n);
      expect(tickInfo.feeGrowthOutside1X128).toBe(0n);
      expect(tickInfo.secondsPerLiquidityOutsideX128).toBe(0n);
      expect(tickInfo.tickCumulativeOutside).toBe(0n);
      expect(tickInfo.secondsOutside).toBe(0);
      expect(tickInfo.initialized).toBe(false);
    });
  });
});
