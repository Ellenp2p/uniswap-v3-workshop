import { describe, test, expect } from "bun:test";
import { computeSwapStep } from "../src/libraries/swapMath.js";
import { getSqrtRatioAtTick } from "../src/libraries/tickMath.js";

describe("SwapMath", () => {
  describe("computeSwapStep", () => {
    test("exact input, zeroForOne, reaches target price", () => {
      const sqrtRatioCurrentX96 = getSqrtRatioAtTick(0);
      const sqrtRatioTargetX96 = getSqrtRatioAtTick(-10);
      const liquidity = 1000000000000000000n;
      const amountRemaining = 100000000000000000n;
      const feePips = 3000;

      const result = computeSwapStep(
        sqrtRatioCurrentX96,
        sqrtRatioTargetX96,
        liquidity,
        amountRemaining,
        feePips
      );

      expect(result.sqrtRatioNextX96).toBe(sqrtRatioTargetX96);
      expect(result.amountIn).toBeGreaterThan(0n);
      expect(result.amountOut).toBeGreaterThan(0n);
      expect(result.feeAmount).toBeGreaterThan(0n);
      expect(result.amountIn + result.feeAmount).toBeLessThanOrEqual(amountRemaining);
    });

    test("exact input, zeroForOne, does not reach target price", () => {
      const sqrtRatioCurrentX96 = getSqrtRatioAtTick(0);
      const sqrtRatioTargetX96 = getSqrtRatioAtTick(-1000);
      const liquidity = 1000000000000000000n;
      const amountRemaining = 10000000000000000n;
      const feePips = 3000;

      const result = computeSwapStep(
        sqrtRatioCurrentX96,
        sqrtRatioTargetX96,
        liquidity,
        amountRemaining,
        feePips
      );

      expect(result.sqrtRatioNextX96).toBeLessThan(sqrtRatioCurrentX96);
      expect(result.sqrtRatioNextX96).toBeGreaterThan(sqrtRatioTargetX96);
      expect(result.amountIn + result.feeAmount).toBeLessThanOrEqual(amountRemaining);
      expect(result.amountOut).toBeGreaterThan(0n);
    });

    test("exact output, zeroForOne, reaches target price", () => {
      const sqrtRatioCurrentX96 = getSqrtRatioAtTick(0);
      const sqrtRatioTargetX96 = getSqrtRatioAtTick(-10);
      const liquidity = 1000000000000000000n;
      const feePips = 3000;

      const amountOut = 10000000000000000n;
      const amountRemaining = -amountOut;

      const result = computeSwapStep(
        sqrtRatioCurrentX96,
        sqrtRatioTargetX96,
        liquidity,
        amountRemaining,
        feePips
      );

      expect(result.sqrtRatioNextX96).toBe(sqrtRatioTargetX96);
      expect(result.amountIn).toBeGreaterThan(0n);
      expect(result.amountOut).toBeGreaterThan(0n);
      expect(result.feeAmount).toBeGreaterThan(0n);
    });

    test("exact output, zeroForOne, does not reach target price", () => {
      const sqrtRatioCurrentX96 = getSqrtRatioAtTick(0);
      const sqrtRatioTargetX96 = getSqrtRatioAtTick(-1000);
      const liquidity = 1000000000000000000n;
      const feePips = 3000;

      const amountOut = 10000000000000000n;
      const amountRemaining = -amountOut;

      const result = computeSwapStep(
        sqrtRatioCurrentX96,
        sqrtRatioTargetX96,
        liquidity,
        amountRemaining,
        feePips
      );

      expect(result.sqrtRatioNextX96).toBeLessThan(sqrtRatioCurrentX96);
      expect(result.sqrtRatioNextX96).toBeGreaterThan(sqrtRatioTargetX96);
      expect(result.amountOut).toBe(amountOut);
    });

    test("zeroForOne=false, exact input", () => {
      const sqrtRatioCurrentX96 = getSqrtRatioAtTick(0);
      const sqrtRatioTargetX96 = getSqrtRatioAtTick(10);
      const liquidity = 1000000000000000000n;
      const amountRemaining = 100000000000000000n;
      const feePips = 3000;

      const result = computeSwapStep(
        sqrtRatioCurrentX96,
        sqrtRatioTargetX96,
        liquidity,
        amountRemaining,
        feePips
      );

      expect(result.sqrtRatioNextX96).toBe(sqrtRatioTargetX96);
      expect(result.amountIn).toBeGreaterThan(0n);
      expect(result.amountOut).toBeGreaterThan(0n);
    });

    test("fee calculation is correct", () => {
      const sqrtRatioCurrentX96 = getSqrtRatioAtTick(0);
      const sqrtRatioTargetX96 = getSqrtRatioAtTick(-10);
      const liquidity = 1000000000000000000n;
      const amountRemaining = 100000000000000000n;
      const feePips = 3000;

      const result = computeSwapStep(
        sqrtRatioCurrentX96,
        sqrtRatioTargetX96,
        liquidity,
        amountRemaining,
        feePips
      );

      const expectedFee = (result.amountIn * BigInt(feePips) + 999999n) / 997000n;
      expect(result.feeAmount).toBe(expectedFee);
    });

    test("very small liquidity", () => {
      const sqrtRatioCurrentX96 = getSqrtRatioAtTick(0);
      const sqrtRatioTargetX96 = getSqrtRatioAtTick(-10);
      const liquidity = 1n;
      const amountRemaining = 100000000000000000n;
      const feePips = 3000;

      const result = computeSwapStep(
        sqrtRatioCurrentX96,
        sqrtRatioTargetX96,
        liquidity,
        amountRemaining,
        feePips
      );

      expect(result.amountIn).toBeGreaterThan(0n);
      expect(result.feeAmount).toBeGreaterThan(0n);
    });
  });
});
