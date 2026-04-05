export const MIN_TICK = -887272;
export const MAX_TICK = 887272;

export const MIN_SQRT_RATIO = 4295128739n;
export const MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342n;

export const Q96 = 2n ** 96n;
export const Q128 = 2n ** 128n;
export const Q192 = Q96 * Q96;

export const FEE_DENOMINATOR = 1_000_000n;

export enum FeeTier {
  LOWEST = 500,
  LOW = 3000,
  MEDIUM = 10000,
}

export const TICK_SPACING: Record<number, number> = {
  [FeeTier.LOWEST]: 10,
  [FeeTier.LOW]: 60,
  [FeeTier.MEDIUM]: 200,
};
