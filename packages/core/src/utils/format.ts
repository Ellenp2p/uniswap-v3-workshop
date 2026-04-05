import { Q96 } from "../constants.js";

export function sqrtPriceX96ToPrice(sqrtPriceX96: bigint, decimals0: number = 18, decimals1: number = 18): number {
  const sqrtRatio = Number(sqrtPriceX96 / Q96);
  const remainder = sqrtPriceX96 % Q96;
  const fractional = Number(remainder) / Number(Q96);
  const fullRatio = sqrtRatio + fractional;
  const rawPrice = fullRatio * fullRatio;
  return rawPrice * Math.pow(10, decimals0 - decimals1);
}

export function priceToSqrtPriceX96(price: number, decimals0: number = 18, decimals1: number = 18): bigint {
  const adjustedPrice = price / Math.pow(10, decimals0 - decimals1);
  return BigInt(Math.floor(Math.sqrt(adjustedPrice) * Number(Q96)));
}

export function formatTokenAmount(amount: bigint, decimals: number = 18): string {
  const divisor = 10n ** BigInt(decimals);
  const integer = amount / divisor;
  const fractional = amount % divisor;
  const fractionalStr = fractional.toString().padStart(decimals, "0").replace(/0+$/, "");
  return fractionalStr.length > 0 ? `${integer}.${fractionalStr}` : `${integer}`;
}

export function parseTokenAmount(amount: string, decimals: number = 18): bigint {
  const parts = amount.split(".");
  const integer = parts[0];
  const fractional = (parts[1] || "").padEnd(decimals, "0").slice(0, decimals);
  return BigInt(integer + fractional);
}
