export function formatBigInt(value: bigint, decimals: number = 18): string {
  if (value === 0n) return '0';
  const divisor = 10n ** BigInt(decimals);
  const integer = value / divisor;
  const fractional = value % divisor;
  if (fractional === 0n) return integer.toString();
  const fracStr = fractional.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${integer}.${fracStr}`;
}

export function formatSignedBigInt(value: bigint, decimals: number = 18): string {
  if (value === 0n) return '0';
  const sign = value < 0n ? '-' : '';
  const abs = value < 0n ? -value : value;
  return sign + formatBigInt(abs, decimals);
}

export function formatNumber(value: number, decimals: number = 6): string {
  return value.toFixed(decimals).replace(/\.?0+$/, '');
}

export function shortenAddress(addr: string): string {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(4)}%`;
}

export function sqrtPriceToPrice(sqrtPriceX96: bigint): number {
  const Q96 = 2n ** 96n;
  const ratio = Number(sqrtPriceX96) / Number(Q96);
  return ratio * ratio;
}

export function priceToSqrtPrice(price: number): bigint {
  const Q96 = 2n ** 96n;
  return BigInt(Math.floor(Math.sqrt(price) * Number(Q96)));
}
