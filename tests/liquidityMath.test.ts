import { describe, test, expect } from "bun:test";
import { addDelta } from "../src/libraries/liquidityMath.js";

describe("LiquidityMath", () => {
  describe("addDelta", () => {
    test("adds positive delta", () => {
      expect(addDelta(100n, 50n)).toBe(150n);
    });

    test("adds negative delta", () => {
      expect(addDelta(100n, -50n)).toBe(50n);
    });

    test("adds zero delta", () => {
      expect(addDelta(100n, 0n)).toBe(100n);
    });

    test("throws on underflow", () => {
      expect(() => addDelta(50n, -100n)).toThrow("LA");
    });

    test("throws on overflow", () => {
      const maxUint128 = 2n ** 128n - 1n;
      expect(() => addDelta(maxUint128, 1n)).toThrow("LA");
    });

    test("max uint128 minus 1", () => {
      const maxUint128 = 2n ** 128n - 1n;
      expect(addDelta(maxUint128, -1n)).toBe(maxUint128 - 1n);
    });
  });
});
