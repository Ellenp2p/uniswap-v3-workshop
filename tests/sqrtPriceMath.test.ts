import { describe, test, expect } from "bun:test";
import {
  getNextSqrtPriceFromInput,
  getNextSqrtPriceFromOutput,
  getAmount0Delta,
  getAmount1Delta,
} from "../src/libraries/sqrtPriceMath.js";
import { getSqrtRatioAtTick } from "../src/libraries/tickMath.js";

describe("SqrtPriceMath", () => {
  const sqrtP = getSqrtRatioAtTick(0);
  const liquidity = 1000000n;

  describe("getNextSqrtPriceFromInput", () => {
    test("zeroForOne with amount in increases price", () => {
      const amountIn = 1000n;
      const nextSqrtP = getNextSqrtPriceFromInput(sqrtP, liquidity, amountIn, true);
      expect(nextSqrtP).toBeLessThan(sqrtP);
    });

    test("zeroForOne=false with amount in decreases price", () => {
      const amountIn = 1000n;
      const nextSqrtP = getNextSqrtPriceFromInput(sqrtP, liquidity, amountIn, false);
      expect(nextSqrtP).toBeGreaterThan(sqrtP);
    });
  });

  describe("getAmount0Delta", () => {
    test("amount0 between two ticks", () => {
      const sqrtA = getSqrtRatioAtTick(-10);
      const sqrtB = getSqrtRatioAtTick(10);
      const liquidity = 1000000n;
      const amount0 = getAmount0Delta(sqrtA, sqrtB, liquidity, false);
      expect(amount0).toBeGreaterThan(0n);
    });
  });

  describe("getAmount1Delta", () => {
    test("amount1 between two ticks", () => {
      const sqrtA = getSqrtRatioAtTick(-10);
      const sqrtB = getSqrtRatioAtTick(10);
      const liquidity = 1000000n;
      const amount1 = getAmount1Delta(sqrtA, sqrtB, liquidity, false);
      expect(amount1).toBeGreaterThan(0n);
    });
  });
});
