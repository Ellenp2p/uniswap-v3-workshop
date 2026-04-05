import { FEE_DENOMINATOR } from "../constants.js";
import { mulDivRoundingUp } from "./fullMath.js";
import {
  getAmount0Delta,
  getAmount1Delta,
  getNextSqrtPriceFromInput,
  getNextSqrtPriceFromOutput,
} from "./sqrtPriceMath.js";

export type SwapStepResult = {
  sqrtRatioNextX96: bigint;
  amountIn: bigint;
  amountOut: bigint;
  feeAmount: bigint;
};

export function computeSwapStep(
  sqrtRatioCurrentX96: bigint,
  sqrtRatioTargetX96: bigint,
  liquidity: bigint,
  amountRemaining: bigint,
  feePips: number
): SwapStepResult {
  const zeroForOne = sqrtRatioCurrentX96 >= sqrtRatioTargetX96;
  const exactIn = amountRemaining >= 0n;

  let sqrtRatioNextX96: bigint;
  let amountIn: bigint;
  let amountOut: bigint;
  let feeAmount: bigint;

  if (exactIn) {
    const amountRemainingLessFee = mulDivRoundingUp(
      amountRemaining,
      FEE_DENOMINATOR - BigInt(feePips),
      FEE_DENOMINATOR
    );

    amountIn = zeroForOne
      ? getAmount0Delta(sqrtRatioTargetX96, sqrtRatioCurrentX96, liquidity, true)
      : getAmount1Delta(sqrtRatioCurrentX96, sqrtRatioTargetX96, liquidity, true);

    if (amountRemainingLessFee >= amountIn) {
      sqrtRatioNextX96 = sqrtRatioTargetX96;
    } else {
      sqrtRatioNextX96 = getNextSqrtPriceFromInput(
        sqrtRatioCurrentX96,
        liquidity,
        amountRemainingLessFee,
        zeroForOne
      );
    }
  } else {
    amountOut = zeroForOne
      ? getAmount1Delta(sqrtRatioTargetX96, sqrtRatioCurrentX96, liquidity, false)
      : getAmount0Delta(sqrtRatioCurrentX96, sqrtRatioTargetX96, liquidity, false);

    const amountRemainingAbs = -amountRemaining;
    if (amountRemainingAbs >= amountOut) {
      sqrtRatioNextX96 = sqrtRatioTargetX96;
    } else {
      sqrtRatioNextX96 = getNextSqrtPriceFromOutput(
        sqrtRatioCurrentX96,
        liquidity,
        amountRemainingAbs,
        zeroForOne
      );
    }
  }

  const max = sqrtRatioTargetX96 === sqrtRatioNextX96;

  if (zeroForOne) {
    if (!max || !exactIn) {
      amountIn = getAmount0Delta(sqrtRatioNextX96, sqrtRatioCurrentX96, liquidity, true);
    }
    if (!max || exactIn) {
      amountOut = getAmount1Delta(sqrtRatioNextX96, sqrtRatioCurrentX96, liquidity, false);
    }
  } else {
    if (!max || !exactIn) {
      amountIn = getAmount1Delta(sqrtRatioCurrentX96, sqrtRatioNextX96, liquidity, true);
    }
    if (!max || exactIn) {
      amountOut = getAmount0Delta(sqrtRatioCurrentX96, sqrtRatioNextX96, liquidity, false);
    }
  }

  if (!exactIn) {
    const amountRemainingAbs = -amountRemaining;
    if (amountOut > amountRemainingAbs) {
      throw new Error("amountOut exceeds amountRemaining");
    }
  }

  if (exactIn && sqrtRatioNextX96 !== sqrtRatioTargetX96) {
    feeAmount = amountRemaining - amountIn;
  } else {
    feeAmount = mulDivRoundingUp(
      amountIn,
      BigInt(feePips),
      FEE_DENOMINATOR - BigInt(feePips)
    );
  }

  return {
    sqrtRatioNextX96,
    amountIn,
    amountOut,
    feeAmount,
  };
}
