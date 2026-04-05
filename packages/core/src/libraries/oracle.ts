import { Q128 } from "../constants.js";
import { Observation } from "../types.js";

export function initialize(time: number): { cardinality: number; cardinalityNext: number } {
  return { cardinality: 1, cardinalityNext: 1 };
}

export function write(
  observations: Observation[],
  index: number,
  blockTimestamp: number,
  tick: number,
  liquidity: bigint,
  cardinality: number,
  cardinalityNext: number
): { indexUpdated: number; cardinalityUpdated: number } {
  const last = observations[index];
  let indexUpdated = index;

  if (last.blockTimestamp !== blockTimestamp) {
    cardinality = Math.max(cardinality, cardinalityNext);
    indexUpdated = (index + 1) % cardinality;

    if (observations.length <= indexUpdated) {
      observations.push({
        blockTimestamp: 0,
        tickCumulative: 0n,
        secondsPerLiquidityCumulativeX128: 0n,
        initialized: false,
      });
    }

    const delta = blockTimestamp - last.blockTimestamp;
    observations[indexUpdated] = {
      blockTimestamp,
      tickCumulative: last.tickCumulative + BigInt(tick) * BigInt(delta),
      secondsPerLiquidityCumulativeX128:
        liquidity > 0n
          ? last.secondsPerLiquidityCumulativeX128 +
            ((BigInt(delta) << 128n) / liquidity)
          : last.secondsPerLiquidityCumulativeX128,
      initialized: true,
    };
  }

  return {
    indexUpdated,
    cardinalityUpdated: cardinality,
  };
}

export function grow(
  observations: Observation[],
  current: number,
  next: number
): number {
  if (next <= current) return current;

  for (let i = observations.length; i < next; i++) {
    observations.push({
      blockTimestamp: 0,
      tickCumulative: 0n,
      secondsPerLiquidityCumulativeX128: 0n,
      initialized: false,
    });
  }

  return next;
}

export function observeSingle(
  observations: Observation[],
  time: number,
  secondsAgo: number,
  tick: number,
  index: number,
  liquidity: bigint,
  cardinality: number
): { tickCumulative: bigint; secondsPerLiquidityCumulativeX128: bigint } {
  if (secondsAgo === 0) {
    const last = observations[index];
    if (last.blockTimestamp !== time) {
      const delta = time - last.blockTimestamp;
      return {
        tickCumulative: last.tickCumulative + BigInt(tick) * BigInt(delta),
        secondsPerLiquidityCumulativeX128:
          liquidity > 0n
            ? last.secondsPerLiquidityCumulativeX128 +
              ((BigInt(delta) << 128n) / liquidity)
            : last.secondsPerLiquidityCumulativeX128,
      };
    }
    return {
      tickCumulative: last.tickCumulative,
      secondsPerLiquidityCumulativeX128: last.secondsPerLiquidityCumulativeX128,
    };
  }

  const target = time - secondsAgo;

  if (observations.length === 0) {
    throw new Error("observations not initialized");
  }

  let beforeOrAt: Observation | null = null;
  let atOrAfter: Observation | null = null;

  for (let i = 0; i < cardinality; i++) {
    const obs = observations[i];
    if (!obs.initialized) continue;

    if (obs.blockTimestamp === target) {
      return {
        tickCumulative: obs.tickCumulative,
        secondsPerLiquidityCumulativeX128: obs.secondsPerLiquidityCumulativeX128,
      };
    }

    if (obs.blockTimestamp < target) {
      if (!beforeOrAt || obs.blockTimestamp > beforeOrAt.blockTimestamp) {
        beforeOrAt = obs;
      }
    } else {
      if (!atOrAfter || obs.blockTimestamp < atOrAfter.blockTimestamp) {
        atOrAfter = obs;
      }
    }
  }

  if (beforeOrAt && atOrAfter) {
    const numerator = BigInt(target - beforeOrAt.blockTimestamp);
    const denominator = BigInt(atOrAfter.blockTimestamp - beforeOrAt.blockTimestamp);

    return {
      tickCumulative:
        beforeOrAt.tickCumulative +
        ((atOrAfter.tickCumulative - beforeOrAt.tickCumulative) * numerator) /
          denominator,
      secondsPerLiquidityCumulativeX128:
        beforeOrAt.secondsPerLiquidityCumulativeX128 +
        ((atOrAfter.secondsPerLiquidityCumulativeX128 -
          beforeOrAt.secondsPerLiquidityCumulativeX128) *
          numerator) /
          denominator,
    };
  }

  if (beforeOrAt) {
    const delta = time - beforeOrAt.blockTimestamp;
    return {
      tickCumulative:
        beforeOrAt.tickCumulative + BigInt(tick) * BigInt(delta),
      secondsPerLiquidityCumulativeX128:
        liquidity > 0n
          ? beforeOrAt.secondsPerLiquidityCumulativeX128 +
            ((BigInt(delta) << 128n) / liquidity)
          : beforeOrAt.secondsPerLiquidityCumulativeX128,
    };
  }

  throw new Error("HIA");
}

export function observe(
  observations: Observation[],
  time: number,
  secondsAgos: number[],
  tick: number,
  index: number,
  liquidity: bigint,
  cardinality: number
): { tickCumulatives: bigint[]; secondsPerLiquidityCumulativeX128s: bigint[] } {
  const tickCumulatives: bigint[] = [];
  const secondsPerLiquidityCumulativeX128s: bigint[] = [];

  for (const secondsAgo of secondsAgos) {
    const result = observeSingle(
      observations,
      time,
      secondsAgo,
      tick,
      index,
      liquidity,
      cardinality
    );
    tickCumulatives.push(result.tickCumulative);
    secondsPerLiquidityCumulativeX128s.push(result.secondsPerLiquidityCumulativeX128);
  }

  return { tickCumulatives, secondsPerLiquidityCumulativeX128s };
}
