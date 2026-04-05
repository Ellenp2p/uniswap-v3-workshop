import { describe, test, expect } from "bun:test";
import { getSqrtRatioAtTick, getTickAtSqrtRatio } from "../src/libraries/tickMath.js";
import { MIN_TICK, MAX_TICK, MIN_SQRT_RATIO, MAX_SQRT_RATIO } from "../src/constants.js";

describe("TickMath", () => {
  describe("getSqrtRatioAtTick", () => {
    test("MIN_TICK returns MIN_SQRT_RATIO", () => {
      expect(getSqrtRatioAtTick(MIN_TICK)).toBe(MIN_SQRT_RATIO);
    });

    test("MAX_TICK returns MAX_SQRT_RATIO", () => {
      expect(getSqrtRatioAtTick(MAX_TICK)).toBe(MAX_SQRT_RATIO);
    });

    test("tick 0 returns 2^96", () => {
      expect(getSqrtRatioAtTick(0)).toBe(2n ** 96n);
    });

    test("throws for tick out of range", () => {
      expect(() => getSqrtRatioAtTick(MIN_TICK - 1)).toThrow("TICK");
      expect(() => getSqrtRatioAtTick(MAX_TICK + 1)).toThrow("TICK");
    });

    test("tick 1", () => {
      const result = getSqrtRatioAtTick(1);
      expect(result).toBe(79232123823359799118286999568n);
    });

    test("tick -1", () => {
      const result = getSqrtRatioAtTick(-1);
      expect(result).toBe(79224201403219477170569942574n);
    });

    test("symmetric ticks product approximates 2^192", () => {
      const ratio1 = getSqrtRatioAtTick(100);
      const ratio2 = getSqrtRatioAtTick(-100);
      const product = ratio1 * ratio2;
      const expected = 2n ** 192n;
      const diff = product > expected ? product - expected : expected - product;
      expect(diff < expected / 100000000n).toBe(true);
    });

    test("monotonically increasing", () => {
      for (let tick = -100; tick < 100; tick += 10) {
        expect(getSqrtRatioAtTick(tick + 10)).toBeGreaterThan(getSqrtRatioAtTick(tick));
      }
    });
  });

  describe("getTickAtSqrtRatio", () => {
    test("MIN_SQRT_RATIO returns MIN_TICK", () => {
      expect(getTickAtSqrtRatio(MIN_SQRT_RATIO)).toBe(MIN_TICK);
    });

    test("tick 0 price returns 0", () => {
      expect(getTickAtSqrtRatio(2n ** 96n)).toBe(0);
    });

    test("throws for ratio out of range", () => {
      expect(() => getTickAtSqrtRatio(MIN_SQRT_RATIO - 1n)).toThrow("R");
      expect(() => getTickAtSqrtRatio(MAX_SQRT_RATIO)).toThrow("R");
    });

    test("roundtrip: tick -> sqrtRatio -> tick", () => {
      const testTicks = [-100000, -10000, -1000, -100, -10, -1, 0, 1, 10, 100, 1000, 10000, 100000];
      for (const tick of testTicks) {
        const sqrtRatio = getSqrtRatioAtTick(tick);
        const result = getTickAtSqrtRatio(sqrtRatio);
        expect(result).toBe(tick);
      }
    });

    test("roundtrip for all ticks in range (spot check)", () => {
      for (let tick = -1000; tick <= 1000; tick += 10) {
        const sqrtRatio = getSqrtRatioAtTick(tick);
        const result = getTickAtSqrtRatio(sqrtRatio);
        expect(result).toBe(tick);
      }
    });

    test("MAX_SQRT_RATIO - 1 returns MAX_TICK - 1", () => {
      expect(getTickAtSqrtRatio(MAX_SQRT_RATIO - 1n)).toBe(MAX_TICK - 1);
    });
  });
});
