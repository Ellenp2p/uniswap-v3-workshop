import { describe, test, expect } from "bun:test";
import { write, observeSingle, observe, grow } from "../src/libraries/oracle.js";
import { Observation } from "../src/types.js";

function createObservations(): Observation[] {
  return [{
    blockTimestamp: 0,
    tickCumulative: 0n,
    secondsPerLiquidityCumulativeX128: 0n,
    initialized: true,
  }];
}

describe("Oracle", () => {
  describe("write", () => {
    test("writes first observation", () => {
      const observations = createObservations();
      const result = write(observations, 0, 10, 0, 1000000000000000000n, 1, 1);
      expect(result.indexUpdated).toBe(0);
      expect(result.cardinalityUpdated).toBe(1);
      expect(observations[0].blockTimestamp).toBe(10);
      expect(observations[0].initialized).toBe(true);
    });

    test("advances index on new timestamp", () => {
      const observations = createObservations();
      write(observations, 0, 10, 0, 1000000000000000000n, 1, 1);

      const result = write(observations, 0, 20, 0, 1000000000000000000n, 1, 1);
      expect(result.indexUpdated).toBe(0);
    });

    test("accumulates tick cumulative", () => {
      const observations = createObservations();
      write(observations, 0, 10, 100, 1000000000000000000n, 1, 1);

      expect(observations[0].tickCumulative).toBe(1000n);
    });

    test("accumulates secondsPerLiquidity", () => {
      const observations = createObservations();
      const liquidity = 1000000000000000000n;
      write(observations, 0, 10, 0, liquidity, 1, 1);

      expect(observations[0].secondsPerLiquidityCumulativeX128).toBe(
        (10n << 128n) / liquidity
      );
    });

    test("does not write if timestamp unchanged", () => {
      const observations = createObservations();
      write(observations, 0, 10, 0, 1000000000000000000n, 1, 1);

      const result = write(observations, 0, 10, 0, 1000000000000000000n, 1, 1);
      expect(result.indexUpdated).toBe(0);
    });
  });

  describe("grow", () => {
    test("increases cardinality", () => {
      const observations = createObservations();
      const result = grow(observations, 1, 5);
      expect(result).toBe(5);
      expect(observations.length).toBe(5);
    });

    test("does not shrink cardinality", () => {
      const observations = createObservations();
      const result = grow(observations, 5, 3);
      expect(result).toBe(5);
    });
  });

  describe("observeSingle", () => {
    test("returns current observation at secondsAgo=0", () => {
      const observations = createObservations();
      write(observations, 0, 100, 50, 1000000000000000000n, 1, 1);

      const result = observeSingle(observations, 100, 0, 50, 0, 1000000000000000000n, 1);
      expect(result.tickCumulative).toBe(5000n);
    });

    test("interpolates between observations", () => {
      const observations: Observation[] = [
        { blockTimestamp: 0, tickCumulative: 0n, secondsPerLiquidityCumulativeX128: 0n, initialized: true },
        { blockTimestamp: 0, tickCumulative: 0n, secondsPerLiquidityCumulativeX128: 0n, initialized: false },
      ];

      write(observations, 0, 10, 100, 1000000000000000000n, 2, 2);

      const result = observeSingle(observations, 10, 5, 100, 0, 1000000000000000000n, 2);
      expect(result.tickCumulative).toBe(500n);
    });
  });

  describe("observe", () => {
    test("returns multiple observations", () => {
      const observations: Observation[] = [
        { blockTimestamp: 0, tickCumulative: 0n, secondsPerLiquidityCumulativeX128: 0n, initialized: true },
        { blockTimestamp: 0, tickCumulative: 0n, secondsPerLiquidityCumulativeX128: 0n, initialized: false },
      ];

      write(observations, 0, 100, 50, 1000000000000000000n, 2, 2);

      const result = observe(observations, 100, [0, 50], 50, 0, 1000000000000000000n, 2);
      expect(result.tickCumulatives.length).toBe(2);
      expect(result.secondsPerLiquidityCumulativeX128s.length).toBe(2);
    });
  });
});
