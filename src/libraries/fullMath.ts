export function mulDiv(a: bigint, b: bigint, denominator: bigint): bigint {
  return (a * b) / denominator;
}

export function mulDivRoundingUp(a: bigint, b: bigint, denominator: bigint): bigint {
  const result = (a * b) / denominator;
  if ((a * b) % denominator > 0n) {
    return result + 1n;
  }
  return result;
}
