import { describe, test, expect } from "bun:test";
import { mulDiv, mulDivRoundingUp } from "../src/libraries/fullMath.js";

describe("FullMath", () => {
  describe("mulDiv", () => {
    test("basic multiplication and division", () => {
      expect(mulDiv(10n, 10n, 5n)).toBe(20n);
    });

    test("large numbers", () => {
      const a = 2n ** 128n;
      const b = 2n ** 64n;
      const d = 2n ** 32n;
      expect(mulDiv(a, b, d)).toBe(2n ** 160n);
    });

    test("floor division", () => {
      expect(mulDiv(10n, 3n, 2n)).toBe(15n);
    });

    test("zero numerator", () => {
      expect(mulDiv(0n, 100n, 50n)).toBe(0n);
    });

    test("denominator larger than product", () => {
      expect(mulDiv(2n, 3n, 10n)).toBe(0n);
    });
  });

  describe("mulDivRoundingUp", () => {
    test("exact division", () => {
      expect(mulDivRoundingUp(10n, 10n, 5n)).toBe(20n);
    });

    test("rounds up on remainder", () => {
      expect(mulDivRoundingUp(10n, 3n, 2n)).toBe(15n);
      expect(mulDivRoundingUp(1n, 1n, 3n)).toBe(1n);
    });

    test("large numbers with remainder", () => {
      const a = 2n ** 128n + 1n;
      const b = 2n ** 64n;
      const d = 2n ** 32n;
      const result = mulDivRoundingUp(a, b, d);
      expect(result).toBe(2n ** 160n + 2n ** 32n);
    });
  });
});
