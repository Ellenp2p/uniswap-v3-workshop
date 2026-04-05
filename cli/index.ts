#!/usr/bin/env bun

import { UniswapV3Pool } from "../src/pool/pool.js";
import {
  getSqrtRatioAtTick,
  getTickAtSqrtRatio,
  FeeTier,
  TICK_SPACING,
  sqrtPriceX96ToPrice,
  priceToSqrtPriceX96,
  formatTokenAmount,
} from "../src/index.js";

function printUsage() {
  console.log(`Uniswap V3 CLI

Usage:
  bun run cli/index.ts <command> [args]

Commands:
  tick-price <tick>                          Get price for a tick
  price-tick <price>                         Get tick for a price
  pool create <fee> <initPrice>              Create a new pool
  pool mint <lower> <upper> <amount>         Add liquidity
  pool swap <direction> <amount>             Execute a swap
  pool burn <lower> <upper> <amount>         Remove liquidity
  pool collect <lower> <upper>               Collect fees
  pool state                                 Show pool state
  pool ticks                                 Show all initialized ticks
  pool position <lower> <upper>              Show position info
  help                                       Show this help

Examples:
  bun run cli tick-price 0
  bun run cli price-tick 1.0
  bun run cli pool create 3000 1.0
  bun run cli pool mint -600 600 1000000000000000000
  bun run cli pool swap zeroForOne 10000000000000000
  bun run cli pool state
`);
}

const args = process.argv.slice(2);
const command = args[0];

let pool: UniswapV3Pool | null = null;
const POOL_STATE_FILE = ".pool-state.json";

import { readFileSync, writeFileSync, existsSync } from "fs";

function savePoolState(pool: UniswapV3Pool) {
  const state = {
    fee: pool.fee,
    tickSpacing: pool.tickSpacing,
    slot0: pool.slot0,
    liquidity: pool.liquidity.toString(),
    feeGrowthGlobal0X128: pool.feeGrowthGlobal0X128.toString(),
    feeGrowthGlobal1X128: pool.feeGrowthGlobal1X128.toString(),
    ticks: Array.from(pool.ticks.entries()).map(([k, v]) => [
      k,
      {
        liquidityGross: v.liquidityGross.toString(),
        liquidityNet: v.liquidityNet.toString(),
        feeGrowthOutside0X128: v.feeGrowthOutside0X128.toString(),
        feeGrowthOutside1X128: v.feeGrowthOutside1X128.toString(),
        initialized: v.initialized,
      },
    ]),
    tickBitmap: Array.from(pool.tickBitmap.entries()).map(([k, v]) => [k, v.toString()]),
    positions: Array.from(pool.positions.entries()).map(([k, v]) => [
      k,
      {
        liquidity: v.liquidity.toString(),
        feeGrowthInside0LastX128: v.feeGrowthInside0LastX128.toString(),
        feeGrowthInside1LastX128: v.feeGrowthInside1LastX128.toString(),
        tokensOwed0: v.tokensOwed0.toString(),
        tokensOwed1: v.tokensOwed1.toString(),
      },
    ]),
    observations: pool.observations,
  };
  writeFileSync(POOL_STATE_FILE, JSON.stringify(state, (_, v) => typeof v === "bigint" ? v.toString() : v, 2));
}

function loadPoolState(): UniswapV3Pool | null {
  if (!existsSync(POOL_STATE_FILE)) return null;
  try {
    const state = JSON.parse(readFileSync(POOL_STATE_FILE, "utf-8"));
    const p = new UniswapV3Pool(state.fee, state.tickSpacing, BigInt(state.slot0.sqrtPriceX96));
    p.slot0 = {
      sqrtPriceX96: BigInt(state.slot0.sqrtPriceX96),
      tick: state.slot0.tick,
      observationIndex: state.slot0.observationIndex,
      observationCardinality: state.slot0.observationCardinality,
      observationCardinalityNext: state.slot0.observationCardinalityNext,
      feeProtocol: state.slot0.feeProtocol,
      unlocked: state.slot0.unlocked,
    };
    p.liquidity = BigInt(state.liquidity);
    p.feeGrowthGlobal0X128 = BigInt(state.feeGrowthGlobal0X128);
    p.feeGrowthGlobal1X128 = BigInt(state.feeGrowthGlobal1X128);

    for (const [tick, tickData] of state.ticks) {
      const tickInfo = {
        liquidityGross: BigInt(tickData.liquidityGross),
        liquidityNet: BigInt(tickData.liquidityNet),
        feeGrowthOutside0X128: BigInt(tickData.feeGrowthOutside0X128),
        feeGrowthOutside1X128: BigInt(tickData.feeGrowthOutside1X128),
        secondsPerLiquidityOutsideX128: 0n,
        tickCumulativeOutside: 0n,
        secondsOutside: 0,
        initialized: tickData.initialized,
      };
      p.ticks.set(Number(tick), tickInfo);
    }

    for (const [word, value] of state.tickBitmap) {
      p.tickBitmap.set(Number(word), BigInt(value));
    }

    for (const [key, posData] of state.positions) {
      p.positions.set(key, {
        liquidity: BigInt(posData.liquidity),
        feeGrowthInside0LastX128: BigInt(posData.feeGrowthInside0LastX128),
        feeGrowthInside1LastX128: BigInt(posData.feeGrowthInside1LastX128),
        tokensOwed0: BigInt(posData.tokensOwed0),
        tokensOwed1: BigInt(posData.tokensOwed1),
      });
    }

    return p;
  } catch {
    return null;
  }
}

function getPool(): UniswapV3Pool {
  if (!pool) {
    pool = loadPoolState();
    if (!pool) {
      console.error("No pool found. Create one first: bun run cli pool create <fee> <price>");
      process.exit(1);
    }
  }
  return pool;
}

switch (command) {
  case "tick-price": {
    const tick = parseInt(args[1]);
    const sqrtPrice = getSqrtRatioAtTick(tick);
    const price = sqrtPriceX96ToPrice(sqrtPrice);
    console.log(`Tick: ${tick}`);
    console.log(`sqrtPriceX96: ${sqrtPrice}`);
    console.log(`Price: ${price}`);
    break;
  }

  case "price-tick": {
    const price = parseFloat(args[1]);
    const sqrtPrice = priceToSqrtPriceX96(price);
    const tick = getTickAtSqrtRatio(sqrtPrice);
    console.log(`Price: ${price}`);
    console.log(`sqrtPriceX96: ${sqrtPrice}`);
    console.log(`Tick: ${tick}`);
    break;
  }

  case "pool": {
    const subCommand = args[1];

    switch (subCommand) {
      case "create": {
        const fee = parseInt(args[2]) as FeeTier;
        const initPrice = parseFloat(args[3]);
        const tickSpacing = TICK_SPACING[fee];
        const sqrtPrice = priceToSqrtPriceX96(initPrice);

        pool = new UniswapV3Pool(fee, tickSpacing, sqrtPrice);
        savePoolState(pool);

        console.log("Pool created:");
        console.log(`  Fee: ${fee} (${(fee / 10000).toFixed(2)}%)`);
        console.log(`  TickSpacing: ${tickSpacing}`);
        console.log(`  Initial Price: ${initPrice}`);
        console.log(`  sqrtPriceX96: ${sqrtPrice}`);
        console.log(`  Tick: ${pool.slot0.tick}`);
        break;
      }

      case "mint": {
        const p = getPool();
        const tickLower = parseInt(args[2]);
        const tickUpper = parseInt(args[3]);
        const amount = BigInt(args[4]);

        const result = p.mint({
          owner: "cli-user",
          tickLower,
          tickUpper,
          amount,
        });

        savePoolState(p);

        console.log("Minted liquidity:");
        console.log(`  Tick Range: ${tickLower} to ${tickUpper}`);
        console.log(`  Amount: ${formatTokenAmount(amount)}`);
        console.log(`  Token0: ${formatTokenAmount(result.amount0)}`);
        console.log(`  Token1: ${formatTokenAmount(result.amount1)}`);
        console.log(`  Pool Liquidity: ${p.liquidity}`);
        break;
      }

      case "swap": {
        const p = getPool();
        const zeroForOne = args[2] === "zeroForOne";
        const amount = BigInt(args[3]);

        const beforePrice = sqrtPriceX96ToPrice(p.slot0.sqrtPriceX96);
        const beforeTick = p.slot0.tick;

        const result = p.swap({
          recipient: "cli-user",
          zeroForOne,
          amountSpecified: amount,
          sqrtPriceLimitX96: 0n,
        });

        savePoolState(p);

        const afterPrice = sqrtPriceX96ToPrice(p.slot0.sqrtPriceX96);
        console.log("Swap executed:");
        console.log(`  Direction: ${zeroForOne ? "Token0 -> Token1" : "Token1 -> Token0"}`);
        console.log(`  Amount In: ${formatTokenAmount(amount)}`);
        console.log(`  Token0: ${formatTokenAmount(result.amount0)}`);
        console.log(`  Token1: ${formatTokenAmount(result.amount1)}`);
        console.log(`  Price: ${beforePrice.toFixed(6)} -> ${afterPrice.toFixed(6)}`);
        console.log(`  Tick: ${beforeTick} -> ${result.tick}`);
        console.log(`  Liquidity: ${result.liquidity}`);
        break;
      }

      case "burn": {
        const p = getPool();
        const tickLower = parseInt(args[2]);
        const tickUpper = parseInt(args[3]);
        const amount = BigInt(args[4]);

        const result = p.burn({
          owner: "cli-user",
          tickLower,
          tickUpper,
          amount,
        });

        savePoolState(p);

        console.log("Burned liquidity:");
        console.log(`  Tick Range: ${tickLower} to ${tickUpper}`);
        console.log(`  Amount: ${formatTokenAmount(amount)}`);
        console.log(`  Token0: ${formatTokenAmount(result.amount0)}`);
        console.log(`  Token1: ${formatTokenAmount(result.amount1)}`);
        console.log(`  Pool Liquidity: ${p.liquidity}`);
        break;
      }

      case "collect": {
        const p = getPool();
        const tickLower = parseInt(args[2]);
        const tickUpper = parseInt(args[3]);

        const result = p.collect({
          owner: "cli-user",
          tickLower,
          tickUpper,
          recipient: "cli-user",
        });

        savePoolState(p);

        console.log("Collected fees:");
        console.log(`  Tick Range: ${tickLower} to ${tickUpper}`);
        console.log(`  Token0: ${formatTokenAmount(result.tokensOwed0)}`);
        console.log(`  Token1: ${formatTokenAmount(result.tokensOwed1)}`);
        break;
      }

      case "state": {
        const p = getPool();
        const price = sqrtPriceX96ToPrice(p.slot0.sqrtPriceX96);

        console.log("Pool State:");
        console.log(`  Fee: ${p.fee} (${(p.fee / 10000).toFixed(2)}%)`);
        console.log(`  TickSpacing: ${p.tickSpacing}`);
        console.log(`  sqrtPriceX96: ${p.slot0.sqrtPriceX96}`);
        console.log(`  Tick: ${p.slot0.tick}`);
        console.log(`  Price: ${price}`);
        console.log(`  Liquidity: ${p.liquidity}`);
        console.log(`  feeGrowthGlobal0X128: ${p.feeGrowthGlobal0X128}`);
        console.log(`  feeGrowthGlobal1X128: ${p.feeGrowthGlobal1X128}`);
        console.log(`  Ticks: ${p.ticks.size}`);
        console.log(`  Positions: ${p.positions.size}`);
        break;
      }

      case "ticks": {
        const p = getPool();
        const sortedTicks = Array.from(p.ticks.entries()).sort((a, b) => a[0] - b[0]);

        console.log("Initialized Ticks:");
        for (const [tick, info] of sortedTicks) {
          const price = sqrtPriceX96ToPrice(getSqrtRatioAtTick(tick));
          console.log(`  Tick ${tick}: liquidityGross=${info.liquidityGross}, liquidityNet=${info.liquidityNet}, price=${price.toFixed(6)}`);
        }
        break;
      }

      case "position": {
        const p = getPool();
        const tickLower = parseInt(args[2]);
        const tickUpper = parseInt(args[3]);

        const pos = p.getPosition("cli-user", tickLower, tickUpper);
        console.log(`Position [${tickLower}, ${tickUpper}]:`);
        console.log(`  Liquidity: ${pos.liquidity}`);
        console.log(`  tokensOwed0: ${pos.tokensOwed0}`);
        console.log(`  tokensOwed1: ${pos.tokensOwed1}`);
        break;
      }

      default:
        printUsage();
        break;
    }
    break;
  }

  case "help":
  default:
    printUsage();
    break;
}
