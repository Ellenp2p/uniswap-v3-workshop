import { Q96 } from "../constants.js";
import { mulDiv, mulDivRoundingUp } from "./fullMath.js";
import { divRoundingUp } from "./unsafeMath.js";

export function getNextSqrtPriceFromInput(
  sqrtPX96: bigint,
  liquidity: bigint,
  amountIn: bigint,
  zeroForOne: boolean
): bigint {
  return zeroForOne
    ? getNextSqrtPriceFromAmount0RoundingUp(sqrtPX96, liquidity, amountIn, true)
    : getNextSqrtPriceFromAmount1RoundingDown(sqrtPX96, liquidity, amountIn, true);
}

export function getNextSqrtPriceFromOutput(
  sqrtPX96: bigint,
  liquidity: bigint,
  amountOut: bigint,
  zeroForOne: boolean
): bigint {
  return zeroForOne
    ? getNextSqrtPriceFromAmount1RoundingDown(sqrtPX96, liquidity, amountOut, false)
    : getNextSqrtPriceFromAmount0RoundingUp(sqrtPX96, liquidity, amountOut, false);
}

export function getNextSqrtPriceFromAmount0RoundingUp(
  sqrtPX96: bigint,
  liquidity: bigint,
  amount: bigint,
  add: boolean
): bigint {
  if (amount === 0n) return sqrtPX96;
  const numerator1 = liquidity * Q96;

  if (add) {
    const product = amount * sqrtPX96;
    const denominator = numerator1 + product;
    if (denominator >= numerator1) {
      return mulDivRoundingUp(numerator1, sqrtPX96, denominator);
    }
  } else {
    const product = amount * sqrtPX96;
    const denominator = numerator1 - product;
    return divRoundingUp(numerator1, denominator);
  }

  return divRoundingUp(numerator1, amount);
}

export function getNextSqrtPriceFromAmount1RoundingDown(
  sqrtPX96: bigint,
  liquidity: bigint,
  amount: bigint,
  add: boolean
): bigint {
  if (add) {
    const quotient = (amount * Q96) / liquidity;
    return sqrtPX96 + quotient;
  } else {
    const quotient = mulDivRoundingUp(amount, Q96, liquidity);
    return sqrtPX96 - quotient;
  }
}

export function getAmount0Delta(
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  liquidity: bigint,
  roundUp?: boolean
): bigint {
  if (sqrtRatioAX96 > sqrtRatioBX96) {
    [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  }

  if (roundUp === undefined) {
    const numerator1 = liquidity << 96n;
    const numerator2 = sqrtRatioBX96 - sqrtRatioAX96;
    return numerator1 * numerator2 / sqrtRatioBX96 / sqrtRatioAX96;
  }

  return roundUp
    ? mulDivRoundingUp(
        liquidity << 96n,
        sqrtRatioBX96 - sqrtRatioAX96,
        sqrtRatioBX96
      ) / sqrtRatioAX96 + 1n
    : mulDiv(
        liquidity << 96n,
        sqrtRatioBX96 - sqrtRatioAX96,
        sqrtRatioBX96
      ) / sqrtRatioAX96;
}

export function getAmount1Delta(
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  liquidity: bigint,
  roundUp?: boolean
): bigint {
  if (sqrtRatioAX96 > sqrtRatioBX96) {
    [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  }

  if (roundUp === undefined) {
    return (liquidity * (sqrtRatioBX96 - sqrtRatioAX96)) / Q96;
  }

  return roundUp
    ? mulDivRoundingUp(liquidity, sqrtRatioBX96 - sqrtRatioAX96, Q96)
    : mulDiv(liquidity, sqrtRatioBX96 - sqrtRatioAX96, Q96);
}
