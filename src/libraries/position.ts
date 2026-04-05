import { Q128 } from "../constants.js";
import { PositionInfo } from "../types.js";
import { mulDiv } from "./fullMath.js";
import { addDelta } from "./liquidityMath.js";

export function update(
  self: PositionInfo,
  liquidityDelta: bigint,
  feeGrowthInside0X128: bigint,
  feeGrowthInside1X128: bigint
): bigint {
  const tokensOwed0 = mulDiv(
    feeGrowthInside0X128 - self.feeGrowthInside0LastX128,
    self.liquidity,
    Q128
  );
  const tokensOwed1 = mulDiv(
    feeGrowthInside1X128 - self.feeGrowthInside1LastX128,
    self.liquidity,
    Q128
  );

  self.liquidity = addDelta(self.liquidity, liquidityDelta);
  self.feeGrowthInside0LastX128 = feeGrowthInside0X128;
  self.feeGrowthInside1LastX128 = feeGrowthInside1X128;

  if (tokensOwed0 > 0n || tokensOwed1 > 0n) {
    self.tokensOwed0 += tokensOwed0;
    self.tokensOwed1 += tokensOwed1;
  }

  return self.liquidity;
}

export function createPositionInfo(): PositionInfo {
  return {
    liquidity: 0n,
    feeGrowthInside0LastX128: 0n,
    feeGrowthInside1LastX128: 0n,
    tokensOwed0: 0n,
    tokensOwed1: 0n,
  };
}
