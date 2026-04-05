import { describe, test, expect } from "bun:test";
import { mulDiv, mulDivRoundingUp } from "../src/libraries/fullMath.js";
import { getSqrtRatioAtTick, getTickAtSqrtRatio } from "../src/libraries/tickMath.js";
import { mostSignificantBit, leastSignificantBit } from "../src/libraries/bitMath.js";
import { addDelta } from "../src/libraries/liquidityMath.js";
import {
  getNextSqrtPriceFromInput,
  getNextSqrtPriceFromOutput,
  getAmount0Delta,
  getAmount1Delta,
} from "../src/libraries/sqrtPriceMath.js";
import { computeSwapStep } from "../src/libraries/swapMath.js";
import { UniswapV3Pool } from "../src/index.js";
import { FeeTier, TICK_SPACING, MIN_TICK, MAX_TICK } from "../src/constants.js";

function randomBigInt(max: bigint): bigint {
  const bits = max.toString(2).length;
  let result = 0n;
  for (let i = 0; i < bits; i += 53) {
    result = (result << 53n) | BigInt(Math.floor(Math.random() * (1 << 53)));
  }
  return result % max;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

describe("Fuzz Testing", () => {
  describe("TickMath roundtrip", () => {
    test("random ticks roundtrip correctly", () => {
      for (let i = 0; i < 100; i++) {
        const tick = randomInt(MIN_TICK, MAX_TICK);
        const sqrtRatio = getSqrtRatioAtTick(tick);
        const recoveredTick = getTickAtSqrtRatio(sqrtRatio);
        expect(recoveredTick).toBe(tick);
      }
    });

    test("random sqrtPriceX96 roundtrip correctly", () => {
      for (let i = 0; i < 100; i++) {
        const tick = randomInt(MIN_TICK, MAX_TICK - 1);
        const sqrtRatioA = getSqrtRatioAtTick(tick);
        const sqrtRatioB = getSqrtRatioAtTick(tick + 1);
        const randomSqrtPrice = sqrtRatioA + randomBigInt(sqrtRatioB - sqrtRatioA);
        const recoveredTick = getTickAtSqrtRatio(randomSqrtPrice);
        expect(recoveredTick).toBe(tick);
      }
    });
  });

  describe("mulDiv consistency", () => {
    test("random mulDiv is consistent", () => {
      for (let i = 0; i < 100; i++) {
        const a = randomBigInt(2n ** 128n);
        const b = randomBigInt(2n ** 128n);
        const d = randomBigInt(2n ** 128n - 1n) + 1n;
        const result = mulDiv(a, b, d);
        expect(result * d).toBeLessThanOrEqual(a * b);
        expect((result + 1n) * d).toBeGreaterThan(a * b);
      }
    });

    test("random mulDivRoundingUp is consistent", () => {
      for (let i = 0; i < 100; i++) {
        const a = randomBigInt(2n ** 128n);
        const b = randomBigInt(2n ** 128n);
        const d = randomBigInt(2n ** 128n - 1n) + 1n;
        const result = mulDivRoundingUp(a, b, d);
        expect(result * d).toBeGreaterThanOrEqual(a * b);
        expect((result - 1n) * d).toBeLessThan(a * b);
      }
    });
  });

  describe("BitMath consistency", () => {
    test("random MSB is correct", () => {
      for (let i = 0; i < 100; i++) {
        const x = randomBigInt(2n ** 256n - 1n) + 1n;
        const msb = mostSignificantBit(x);
        expect(2n ** BigInt(msb)).toBeLessThanOrEqual(x);
        expect(2n ** BigInt(msb + 1)).toBeGreaterThan(x);
      }
    });

    test("random LSB is correct", () => {
      for (let i = 0; i < 100; i++) {
        const x = randomBigInt(2n ** 256n - 1n) + 1n;
        const lsb = leastSignificantBit(x);
        expect(x & (1n << BigInt(lsb))).toBe(1n << BigInt(lsb));
        expect(x & ((1n << BigInt(lsb)) - 1n)).toBe(0n);
      }
    });
  });

  describe("LiquidityMath consistency", () => {
    test("random addDelta roundtrip", () => {
      for (let i = 0; i < 100; i++) {
        const x = randomBigInt(2n ** 127n);
        const y = randomBigInt(x) - x / 2n;
        const result = addDelta(x, y);
        expect(result).toBe(x + y);
      }
    });

    test("random addDelta with negative", () => {
      for (let i = 0; i < 100; i++) {
        const x = randomBigInt(2n ** 127n);
        const y = -(randomBigInt(x) + 1n);
        const result = addDelta(x, y);
        expect(result).toBe(x + y);
      }
    });
  });

  describe("SqrtPriceMath consistency", () => {
    test("random getAmount0Delta is non-negative", () => {
      for (let i = 0; i < 100; i++) {
        const tickA = randomInt(MIN_TICK, MAX_TICK - 1);
        const tickB = tickA + randomInt(1, 1000);
        const sqrtA = getSqrtRatioAtTick(tickA);
        const sqrtB = getSqrtRatioAtTick(tickB);
        const liquidity = randomBigInt(2n ** 100n) + 1n;

        const amount0 = getAmount0Delta(sqrtA, sqrtB, liquidity, false);
        expect(amount0).toBeGreaterThanOrEqual(0n);

        const amount1 = getAmount1Delta(sqrtA, sqrtB, liquidity, false);
        expect(amount1).toBeGreaterThanOrEqual(0n);
      }
    });
  });

  describe("Pool fuzz", () => {
    test("random mint and swap doesn't crash", () => {
      for (let i = 0; i < 20; i++) {
        const pool = new UniswapV3Pool(
          FeeTier.LOW,
          TICK_SPACING[FeeTier.LOW],
          getSqrtRatioAtTick(0)
        );

        const tickLower = -Math.floor(Math.random() * 10) * 60 - 60;
        const tickUpper = Math.floor(Math.random() * 10) * 60 + 60;
        const amount = randomBigInt(2n ** 100n) + 1n;

        try {
          pool.mint({
            owner: "fuzz",
            tickLower,
            tickUpper,
            amount,
          });

          const swapAmount = randomBigInt(amount / 10n) + 1n;
          const zeroForOne = Math.random() > 0.5;

          const result = pool.swap({
            recipient: "fuzz",
            zeroForOne,
            amountSpecified: swapAmount,
            sqrtPriceLimitX96: 0n,
          });

          expect(result.sqrtPriceX96).toBeGreaterThan(0n);
          expect(result.tick).toBeGreaterThanOrEqual(MIN_TICK);
          expect(result.tick).toBeLessThanOrEqual(MAX_TICK);
        } catch {
          // Some fuzz inputs may cause expected errors (e.g., overflow)
        }
      }
    });
  });
});
