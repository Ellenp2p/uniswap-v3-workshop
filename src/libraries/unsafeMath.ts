export function divRoundingUp(x: bigint, y: bigint): bigint {
  return (x / y) + ((x % y > 0n) ? 1n : 0n);
}
