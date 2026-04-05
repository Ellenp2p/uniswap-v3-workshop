import { describe, test, expect } from "bun:test";
import { UniswapV3Pool } from "../src/index.js";
import { getSqrtRatioAtTick, getTickAtSqrtRatio, FeeTier, TICK_SPACING, sqrtPriceX96ToPrice } from "../src/index.js";

describe("UniswapV3Pool", () => {
  function createPool(initialTick: number = 0) {
    const sqrtPriceX96 = getSqrtRatioAtTick(initialTick);
    return new UniswapV3Pool(FeeTier.LOW, TICK_SPACING[FeeTier.LOW], sqrtPriceX96);
  }

  describe("constructor", () => {
    test("initializes with correct state", () => {
      const pool = createPool(0);
      expect(pool.slot0.sqrtPriceX96).toBe(getSqrtRatioAtTick(0));
      expect(pool.slot0.tick).toBe(0);
      expect(pool.liquidity).toBe(0n);
      expect(pool.fee).toBe(FeeTier.LOW);
      expect(pool.tickSpacing).toBe(TICK_SPACING[FeeTier.LOW]);
    });

    test("initializes at non-zero tick", () => {
      const pool = createPool(100);
      expect(pool.slot0.sqrtPriceX96).toBe(getSqrtRatioAtTick(100));
      expect(pool.slot0.tick).toBe(100);
    });
  });

  describe("mint", () => {
    test("mint around current price adds liquidity", () => {
      const pool = createPool(0);
      const result = pool.mint({
        owner: "user",
        tickLower: -600,
        tickUpper: 600,
        amount: 1000000000000000000n,
      });

      expect(pool.liquidity).toBe(1000000000000000000n);
      expect(result.amount0).toBeGreaterThan(0n);
      expect(result.amount1).toBeGreaterThan(0n);
    });

    test("mint below current price only adds token1", () => {
      const pool = createPool(0);
      const result = pool.mint({
        owner: "user",
        tickLower: -1200,
        tickUpper: -600,
        amount: 1000000000000000000n,
      });

      expect(pool.liquidity).toBe(0n);
      expect(result.amount0).toBe(0n);
      expect(result.amount1).toBeGreaterThan(0n);
    });

    test("mint above current price only adds token0", () => {
      const pool = createPool(0);
      const result = pool.mint({
        owner: "user",
        tickLower: 600,
        tickUpper: 1200,
        amount: 1000000000000000000n,
      });

      expect(pool.liquidity).toBe(0n);
      expect(result.amount0).toBeGreaterThan(0n);
      expect(result.amount1).toBe(0n);
    });

    test("multiple mints accumulate liquidity", () => {
      const pool = createPool(0);
      pool.mint({
        owner: "user1",
        tickLower: -600,
        tickUpper: 600,
        amount: 1000000000000000000n,
      });
      pool.mint({
        owner: "user2",
        tickLower: -600,
        tickUpper: 600,
        amount: 500000000000000000n,
      });

      expect(pool.liquidity).toBe(1500000000000000000n);
    });

    test("minting overlapping ranges updates tick liquidityGross", () => {
      const pool = createPool(0);
      pool.mint({
        owner: "user",
        tickLower: -600,
        tickUpper: 600,
        amount: 1000000000000000000n,
      });
      pool.mint({
        owner: "user",
        tickLower: -300,
        tickUpper: 300,
        amount: 500000000000000000n,
      });

      const tick600 = pool.getTick(-600);
      expect(tick600.liquidityGross).toBe(1000000000000000000n);

      const tick300 = pool.getTick(-300);
      expect(tick300.liquidityGross).toBe(500000000000000000n);
    });

    test("throws for invalid tick range", () => {
      const pool = createPool(0);
      expect(() =>
        pool.mint({
          owner: "user",
          tickLower: 600,
          tickUpper: -600,
          amount: 1000000000000000000n,
        })
      ).toThrow("tick order");
    });

    test("throws for misaligned tick spacing", () => {
      const pool = createPool(0);
      expect(() =>
        pool.mint({
          owner: "user",
          tickLower: -601,
          tickUpper: 600,
          amount: 1000000000000000000n,
        })
      ).toThrow("tick spacing");
    });
  });

  describe("swap", () => {
    function setupPoolWithLiquidity() {
      const pool = createPool(0);
      pool.mint({
        owner: "user",
        tickLower: -600,
        tickUpper: 600,
        amount: 1000000000000000000n,
      });
      return pool;
    }

    test("swap zeroForOne decreases price", () => {
      const pool = setupPoolWithLiquidity();
      const initialPrice = pool.slot0.sqrtPriceX96;

      const result = pool.swap({
        recipient: "user",
        zeroForOne: true,
        amountSpecified: 10000000000000000n,
        sqrtPriceLimitX96: 0n,
      });

      expect(result.sqrtPriceX96).toBeLessThan(initialPrice);
      expect(result.amount0).toBeGreaterThan(0n);
      expect(result.amount1).toBeLessThan(0n);
    });

    test("swap zeroForOne=false increases price", () => {
      const pool = setupPoolWithLiquidity();
      const initialPrice = pool.slot0.sqrtPriceX96;

      const result = pool.swap({
        recipient: "user",
        zeroForOne: false,
        amountSpecified: 10000000000000000n,
        sqrtPriceLimitX96: 0n,
      });

      expect(result.sqrtPriceX96).toBeGreaterThan(initialPrice);
      expect(result.amount1).toBeGreaterThan(0n);
      expect(result.amount0).toBeLessThan(0n);
    });

    test("swap crosses tick boundary and updates liquidity", () => {
      const pool = createPool(0);
      pool.mint({
        owner: "user",
        tickLower: -600,
        tickUpper: 600,
        amount: 1000000000000000000n,
      });

      const initialLiquidity = pool.liquidity;

      const result = pool.swap({
        recipient: "user",
        zeroForOne: true,
        amountSpecified: 100000000000000000n,
        sqrtPriceLimitX96: 0n,
      });

      expect(result.tick).toBeLessThan(-600);
      expect(result.liquidity).toBe(0n);
    });

    test("swap charges correct fees", () => {
      const pool = setupPoolWithLiquidity();

      pool.swap({
        recipient: "user",
        zeroForOne: true,
        amountSpecified: 10000000000000000n,
        sqrtPriceLimitX96: 0n,
      });

      const collectResult = pool.collect({
        owner: "user",
        tickLower: -600,
        tickUpper: 600,
        recipient: "user",
      });
      expect(collectResult.tokensOwed0).toBeGreaterThan(0n);
    });

    test("swap with exact output", () => {
      const pool = setupPoolWithLiquidity();

      const result = pool.swap({
        recipient: "user",
        zeroForOne: true,
        amountSpecified: -5000000000000000n,
        sqrtPriceLimitX96: 0n,
      });

      expect(result.amount1).toBe(-5000000000000000n);
      expect(result.amount0).toBeGreaterThan(0n);
    });

    test("swap respects price limit", () => {
      const pool = setupPoolWithLiquidity();
      const limitSqrtPrice = getSqrtRatioAtTick(-300);

      const result = pool.swap({
        recipient: "user",
        zeroForOne: true,
        amountSpecified: 1000000000000000000n,
        sqrtPriceLimitX96: limitSqrtPrice,
      });

      expect(result.sqrtPriceX96).toBeGreaterThanOrEqual(limitSqrtPrice);
    });

    test("swap with zero amountSpecified throws", () => {
      const pool = setupPoolWithLiquidity();
      expect(() =>
        pool.swap({
          recipient: "user",
          zeroForOne: true,
          amountSpecified: 0n,
          sqrtPriceLimitX96: 0n,
        })
      ).toThrow("AS");
    });

    test("multiple swaps accumulate fees", () => {
      const pool = setupPoolWithLiquidity();

      pool.swap({
        recipient: "user",
        zeroForOne: true,
        amountSpecified: 10000000000000000n,
        sqrtPriceLimitX96: 0n,
      });
      pool.swap({
        recipient: "user",
        zeroForOne: true,
        amountSpecified: 10000000000000000n,
        sqrtPriceLimitX96: 0n,
      });

      const collectResult = pool.collect({
        owner: "user",
        tickLower: -600,
        tickUpper: 600,
        recipient: "user",
      });
      expect(collectResult.tokensOwed0).toBeGreaterThan(0n);
    });
  });

  describe("burn", () => {
    test("burn reduces position liquidity", () => {
      const pool = createPool(0);
      pool.mint({
        owner: "user",
        tickLower: -600,
        tickUpper: 600,
        amount: 1000000000000000000n,
      });

      const burnResult = pool.burn({
        owner: "user",
        tickLower: -600,
        tickUpper: 600,
        amount: 500000000000000000n,
      });

      expect(burnResult.amount0).toBeGreaterThan(0n);
      expect(burnResult.amount1).toBeGreaterThan(0n);
      expect(pool.liquidity).toBe(500000000000000000n);
    });

    test("burn full position clears liquidity", () => {
      const pool = createPool(0);
      pool.mint({
        owner: "user",
        tickLower: -600,
        tickUpper: 600,
        amount: 1000000000000000000n,
      });

      pool.burn({
        owner: "user",
        tickLower: -600,
        tickUpper: 600,
        amount: 1000000000000000000n,
      });

      expect(pool.liquidity).toBe(0n);
    });
  });

  describe("collect", () => {
    test("collect fees after swap", () => {
      const pool = createPool(0);
      pool.mint({
        owner: "user",
        tickLower: -600,
        tickUpper: 600,
        amount: 1000000000000000000n,
      });

      pool.swap({
        recipient: "user",
        zeroForOne: true,
        amountSpecified: 10000000000000000n,
        sqrtPriceLimitX96: 0n,
      });

      const collectResult = pool.collect({
        owner: "user",
        tickLower: -600,
        tickUpper: 600,
        recipient: "user",
      });

      expect(collectResult.tokensOwed0).toBeGreaterThan(0n);
    });

    test("collect resets tokensOwed", () => {
      const pool = createPool(0);
      pool.mint({
        owner: "user",
        tickLower: -600,
        tickUpper: 600,
        amount: 1000000000000000000n,
      });

      pool.swap({
        recipient: "user",
        zeroForOne: true,
        amountSpecified: 10000000000000000n,
        sqrtPriceLimitX96: 0n,
      });

      pool.collect({
        owner: "user",
        tickLower: -600,
        tickUpper: 600,
        recipient: "user",
      });

      const position = pool.getPosition("user", -600, 600);
      expect(position.tokensOwed0).toBe(0n);
      expect(position.tokensOwed1).toBe(0n);
    });
  });

  describe("integration", () => {
    test("full lifecycle: mint, swap, collect, burn", () => {
      const pool = createPool(0);

      const mintResult = pool.mint({
        owner: "user",
        tickLower: -600,
        tickUpper: 600,
        amount: 1000000000000000000n,
      });
      expect(mintResult.amount0).toBeGreaterThan(0n);
      expect(mintResult.amount1).toBeGreaterThan(0n);

      const swapResult = pool.swap({
        recipient: "user",
        zeroForOne: true,
        amountSpecified: 10000000000000000n,
        sqrtPriceLimitX96: 0n,
      });
      expect(swapResult.amount0).toBeGreaterThan(0n);

      const collectResult = pool.collect({
        owner: "user",
        tickLower: -600,
        tickUpper: 600,
        recipient: "user",
      });
      expect(collectResult.tokensOwed0).toBeGreaterThan(0n);

      const burnResult = pool.burn({
        owner: "user",
        tickLower: -600,
        tickUpper: 600,
        amount: 1000000000000000000n,
      });
      expect(pool.liquidity).toBe(0n);
    });

    test("price moves correctly with swaps", () => {
      const pool = createPool(0);
      pool.mint({
        owner: "user",
        tickLower: -600,
        tickUpper: 600,
        amount: 1000000000000000000n,
      });

      const initialPrice = sqrtPriceX96ToPrice(pool.slot0.sqrtPriceX96);

      pool.swap({
        recipient: "user",
        zeroForOne: true,
        amountSpecified: 10000000000000000n,
        sqrtPriceLimitX96: 0n,
      });
      const priceAfterSwap0 = sqrtPriceX96ToPrice(pool.slot0.sqrtPriceX96);
      expect(priceAfterSwap0).toBeLessThan(initialPrice);

      pool.swap({
        recipient: "user",
        zeroForOne: false,
        amountSpecified: 10000000000000000n,
        sqrtPriceLimitX96: 0n,
      });
      const priceAfterSwap1 = sqrtPriceX96ToPrice(pool.slot0.sqrtPriceX96);
      expect(priceAfterSwap1).toBeGreaterThan(priceAfterSwap0);
    });
  });
});
