import { describe, test, expect } from "bun:test";
import {
  position,
  nextInitializedTickWithinOneWord,
  flipTick,
} from "../src/libraries/tickBitmap.js";

describe("TickBitmap", () => {
  describe("position", () => {
    test("tick 0, tickSpacing 60", () => {
      const result = position(0, 60);
      expect(result.wordPos).toBe(0);
      expect(result.bitPos).toBe(0);
    });

    test("tick 60, tickSpacing 60", () => {
      const result = position(60, 60);
      expect(result.wordPos).toBe(0);
      expect(result.bitPos).toBe(1);
    });

    test("tick -60, tickSpacing 60", () => {
      const result = position(-60, 60);
      expect(result.wordPos).toBe(-1);
      expect(result.bitPos).toBe(255);
    });

    test("tick 256*60, tickSpacing 60", () => {
      const result = position(256 * 60, 60);
      expect(result.wordPos).toBe(1);
      expect(result.bitPos).toBe(0);
    });

    test("tick -600, tickSpacing 60", () => {
      const result = position(-600, 60);
      expect(result.wordPos).toBe(-1);
      expect(result.bitPos).toBe(246);
    });

    test("tick 600, tickSpacing 60", () => {
      const result = position(600, 60);
      expect(result.wordPos).toBe(0);
      expect(result.bitPos).toBe(10);
    });
  });

  describe("flipTick", () => {
    test("flips tick from 0 to 1", () => {
      const tickBitmap = new Map<number, bigint>();
      flipTick(tickBitmap, 0, 60);
      expect(tickBitmap.get(0)).toBe(1n);

      flipTick(tickBitmap, 0, 60);
      expect(tickBitmap.get(0)).toBe(0n);
    });

    test("flips tick at negative tick", () => {
      const tickBitmap = new Map<number, bigint>();
      flipTick(tickBitmap, -60, 60);
      expect(tickBitmap.get(-1)).toBe(2n ** 255n);

      flipTick(tickBitmap, -60, 60);
      expect(tickBitmap.get(-1)).toBe(0n);
    });

    test("throws for misaligned tick", () => {
      const tickBitmap = new Map<number, bigint>();
      expect(() => flipTick(tickBitmap, 1, 60)).toThrow("tick spacing not aligned");
    });
  });

  describe("nextInitializedTickWithinOneWord", () => {
    test("finds initialized tick in same word (lte=true)", () => {
      const tickBitmap = new Map<number, bigint>();
      flipTick(tickBitmap, -600, 60);
      flipTick(tickBitmap, 600, 60);

      const result = nextInitializedTickWithinOneWord(tickBitmap, 600, 60, true);
      expect(result.next).toBe(600);
      expect(result.initialized).toBe(true);
    });

    test("finds initialized tick in same word (lte=false)", () => {
      const tickBitmap = new Map<number, bigint>();
      flipTick(tickBitmap, 60, 60);
      flipTick(tickBitmap, 120, 60);
      flipTick(tickBitmap, 600, 60);

      const result = nextInitializedTickWithinOneWord(tickBitmap, 0, 60, false);
      expect(result.next).toBe(60);
      expect(result.initialized).toBe(true);
    });

    test("lte=false from initialized tick finds next", () => {
      const tickBitmap = new Map<number, bigint>();
      flipTick(tickBitmap, 60, 60);
      flipTick(tickBitmap, 120, 60);

      const result = nextInitializedTickWithinOneWord(tickBitmap, 60, 60, false);
      expect(result.next).toBe(120);
      expect(result.initialized).toBe(true);
    });

    test("returns edge of word when no tick found (lte=true)", () => {
      const tickBitmap = new Map<number, bigint>();

      const result = nextInitializedTickWithinOneWord(tickBitmap, 0, 60, true);
      expect(result.next).toBe(0);
      expect(result.initialized).toBe(false);
    });

    test("returns edge of word when no tick found (lte=false)", () => {
      const tickBitmap = new Map<number, bigint>();

      const result = nextInitializedTickWithinOneWord(tickBitmap, 0, 60, false);
      expect(result.next).toBe(15360);
      expect(result.initialized).toBe(false);
    });

    test("multiple ticks in same word", () => {
      const tickBitmap = new Map<number, bigint>();
      flipTick(tickBitmap, 0, 60);
      flipTick(tickBitmap, 60, 60);
      flipTick(tickBitmap, 120, 60);

      const result1 = nextInitializedTickWithinOneWord(tickBitmap, 180, 60, true);
      expect(result1.next).toBe(120);
      expect(result1.initialized).toBe(true);

      const result2 = nextInitializedTickWithinOneWord(tickBitmap, 120, 60, true);
      expect(result2.next).toBe(120);
      expect(result2.initialized).toBe(true);

      const result3 = nextInitializedTickWithinOneWord(tickBitmap, 119, 60, true);
      expect(result3.next).toBe(60);
      expect(result3.initialized).toBe(true);
    });

    test("negative ticks in same word", () => {
      const tickBitmap = new Map<number, bigint>();
      flipTick(tickBitmap, -600, 60);
      flipTick(tickBitmap, -120, 60);

      const result = nextInitializedTickWithinOneWord(tickBitmap, -60, 60, true);
      expect(result.next).toBe(-120);
      expect(result.initialized).toBe(true);
    });

    test("tickSpacing 10", () => {
      const tickBitmap = new Map<number, bigint>();
      flipTick(tickBitmap, -1000, 10);
      flipTick(tickBitmap, 10, 10);
      flipTick(tickBitmap, 1000, 10);

      const result1 = nextInitializedTickWithinOneWord(tickBitmap, 1000, 10, true);
      expect(result1.next).toBe(1000);
      expect(result1.initialized).toBe(true);

      const result2 = nextInitializedTickWithinOneWord(tickBitmap, 0, 10, false);
      expect(result2.next).toBe(10);
      expect(result2.initialized).toBe(true);
    });

    test("lte=false finds next tick above current", () => {
      const tickBitmap = new Map<number, bigint>();
      flipTick(tickBitmap, 540, 60);
      flipTick(tickBitmap, 600, 60);

      const result = nextInitializedTickWithinOneWord(tickBitmap, 540, 60, false);
      expect(result.next).toBe(600);
      expect(result.initialized).toBe(true);
    });

    test("lte=false from initialized tick", () => {
      const tickBitmap = new Map<number, bigint>();
      flipTick(tickBitmap, 540, 60);
      flipTick(tickBitmap, 600, 60);

      const result = nextInitializedTickWithinOneWord(tickBitmap, 540, 60, false);
      expect(result.next).toBe(600);
      expect(result.initialized).toBe(true);
    });

    test("lte=false skips to next word edge", () => {
      const tickBitmap = new Map<number, bigint>();
      flipTick(tickBitmap, 660, 60);

      const result = nextInitializedTickWithinOneWord(tickBitmap, 0, 60, false);
      expect(result.next).toBe(660);
      expect(result.initialized).toBe(true);
    });
  });
});
