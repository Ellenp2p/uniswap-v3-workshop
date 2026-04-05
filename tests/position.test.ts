import { describe, test, expect } from "bun:test";
import { update, createPositionInfo } from "../src/libraries/position.js";
import { Q128 } from "../src/constants.js";

describe("Position", () => {
  describe("createPositionInfo", () => {
    test("creates zero-initialized position", () => {
      const position = createPositionInfo();
      expect(position.liquidity).toBe(0n);
      expect(position.feeGrowthInside0LastX128).toBe(0n);
      expect(position.feeGrowthInside1LastX128).toBe(0n);
      expect(position.tokensOwed0).toBe(0n);
      expect(position.tokensOwed1).toBe(0n);
    });
  });

  describe("update", () => {
    test("adds liquidity", () => {
      const position = createPositionInfo();

      const liquidity = update(
        position,
        1000000000000000000n,
        0n,
        0n
      );

      expect(liquidity).toBe(1000000000000000000n);
      expect(position.liquidity).toBe(1000000000000000000n);
    });

    test("removes liquidity", () => {
      const position = createPositionInfo();
      position.liquidity = 1000000000000000000n;

      const liquidity = update(
        position,
        -500000000000000000n,
        0n,
        0n
      );

      expect(liquidity).toBe(500000000000000000n);
      expect(position.liquidity).toBe(500000000000000000n);
    });

    test("accumulates tokens owed from fee growth", () => {
      const position = createPositionInfo();
      position.liquidity = 1000000000000000000n;
      position.feeGrowthInside0LastX128 = 0n;
      position.feeGrowthInside1LastX128 = 0n;

      update(
        position,
        0n,
        Q128,
        Q128 * 2n
      );

      expect(position.tokensOwed0).toBe(1000000000000000000n);
      expect(position.tokensOwed1).toBe(2000000000000000000n);
    });

    test("updates fee growth checkpoints", () => {
      const position = createPositionInfo();
      position.liquidity = 1000000000000000000n;

      update(
        position,
        0n,
        Q128 * 5n,
        Q128 * 10n
      );

      expect(position.feeGrowthInside0LastX128).toBe(Q128 * 5n);
      expect(position.feeGrowthInside1LastX128).toBe(Q128 * 10n);
    });

    test("accumulates tokens owed across multiple updates", () => {
      const position = createPositionInfo();
      position.liquidity = 1000000000000000000n;

      update(position, 0n, Q128, 0n);
      update(position, 0n, Q128 * 2n, 0n);

      expect(position.tokensOwed0).toBe(2000000000000000000n);
    });

    test("only counts fee growth since last update", () => {
      const position = createPositionInfo();
      position.liquidity = 1000000000000000000n;

      update(position, 0n, Q128 * 5n, 0n);
      update(position, 0n, Q128 * 10n, 0n);

      expect(position.tokensOwed0).toBe(10000000000000000000n);
    });

    test("handles zero liquidity", () => {
      const position = createPositionInfo();
      position.liquidity = 0n;

      update(position, 0n, Q128, Q128);

      expect(position.tokensOwed0).toBe(0n);
      expect(position.tokensOwed1).toBe(0n);
    });
  });
});
