import { mostSignificantBit, leastSignificantBit } from "./bitMath.js";

export function position(tick: number, tickSpacing: number): { wordPos: number; bitPos: number } {
  const compressed = Math.floor(tick / tickSpacing);
  return {
    wordPos: compressed >> 8,
    bitPos: ((compressed % 256) + 256) % 256,
  };
}

export function nextInitializedTickWithinOneWord(
  tickBitmap: Map<number, bigint>,
  tick: number,
  tickSpacing: number,
  lte: boolean
): { next: number; initialized: boolean } {
  const compressed = Math.floor(tick / tickSpacing);

  if (lte) {
    const { wordPos, bitPos } = position(tick, tickSpacing);
    const mask = (1n << BigInt(bitPos + 1)) - 1n;
    const masked = (tickBitmap.get(wordPos) ?? 0n) & mask;
    const initialized = masked !== 0n;
    const next = initialized
      ? (compressed - (bitPos - mostSignificantBit(masked))) * tickSpacing
      : (compressed - bitPos) * tickSpacing;
    return { next, initialized };
  } else {
    const { wordPos, bitPos } = position(tick, tickSpacing);
    const mask = ~((1n << BigInt(bitPos + 1)) - 1n);
    const masked = (tickBitmap.get(wordPos) ?? 0n) & mask;
    const initialized = masked !== 0n;
    const next = initialized
      ? (compressed + (leastSignificantBit(masked) - bitPos)) * tickSpacing
      : (compressed + 1 + (255 - bitPos)) * tickSpacing;
    return { next, initialized };
  }
}

export function flipTick(
  tickBitmap: Map<number, bigint>,
  tick: number,
  tickSpacing: number
): void {
  if (tick % tickSpacing !== 0) {
    throw new Error("tick spacing not aligned");
  }
  const { wordPos, bitPos } = position(tick, tickSpacing);
  const mask = 1n << BigInt(bitPos);
  const current = tickBitmap.get(wordPos) ?? 0n;
  tickBitmap.set(wordPos, current ^ mask);
}
