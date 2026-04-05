export function addDelta(x: bigint, y: bigint): bigint {
  if (y < 0n) {
    const negY = -y;
    if (negY > x) {
      throw new Error("LA");
    }
    return x - negY;
  } else {
    const maxUint128 = (1n << 128n) - 1n;
    if (x + y > maxUint128) {
      throw new Error("LA");
    }
    return x + y;
  }
}
