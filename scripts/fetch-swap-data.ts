import { ethers } from "ethers";
import { writeFileSync, mkdirSync } from "fs";

const RPC_URLS = [
  "https://ethereum-rpc.publicnode.com",
  "https://1rpc.io/eth",
  "https://rpc.mevblocker.io",
  "https://eth.drpc.org",
];

async function getProvider() {
  for (const url of RPC_URLS) {
    try {
      const provider = new ethers.JsonRpcProvider(url, undefined, {
        staticNetwork: true,
      });
      await provider.getBlockNumber();
      console.log("Connected to:", url);
      return provider;
    } catch {
      continue;
    }
  }
  throw new Error("Failed to connect to any RPC endpoint");
}

const POOL_ABI = [
  "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
  "function fee() external view returns (uint24)",
  "function tickSpacing() external view returns (int24)",
  "function liquidity() external view returns (uint128)",
  "function ticks(int24 tick) external view returns (uint128 liquidityGross, int128 liquidityNet, uint256 feeGrowthOutside0X128, uint256 feeGrowthOutside1X128, uint160 secondsPerLiquidityOutsideX128, int56 tickCumulativeOutside, uint32 secondsOutside, bool initialized)",
  "function tickBitmap(int16 wordPosition) external view returns (uint256)",
  "function feeGrowthGlobal0X128() external view returns (uint256)",
  "function feeGrowthGlobal1X128() external view returns (uint256)",
];

const SWAP_EVENT = "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)";

const POOLS = {
  USDC_ETH_500: {
    address: "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640",
    decimals0: 6,
    decimals1: 18,
  },
  WBTC_ETH_3000: {
    address: "0xCBCdF9626bC03E24f779434178A73a0B4bad62eD",
    decimals0: 8,
    decimals1: 18,
  },
};

async function getSwapEvents(provider: ethers.JsonRpcProvider, poolAddress: string, fromBlock: number, toBlock: number) {
  const swapTopic = ethers.id(SWAP_EVENT);
  const logs = await provider.getLogs({
    address: poolAddress,
    topics: [swapTopic],
    fromBlock,
    toBlock,
  });

  const iface = new ethers.Interface([SWAP_EVENT]);
  return logs
    .map((log) => {
      const parsed = iface.parseLog(log);
      if (!parsed) return null;
      return {
        blockNumber: log.blockNumber!,
        txHash: log.transactionHash,
        amount0: parsed.args[2].toString(),
        amount1: parsed.args[3].toString(),
        sqrtPriceX96: parsed.args[4].toString(),
        liquidity: parsed.args[5].toString(),
        tick: Number(parsed.args[6]),
      };
    })
    .filter(Boolean);
}

async function getPoolStateAtBlock(pool: ethers.Contract, blockNumber: number) {
  try {
    const [slot0, liquidity, feeGrowthGlobal0X128, feeGrowthGlobal1X128] =
      await Promise.all([
        pool.slot0({ blockTag: blockNumber }),
        pool.liquidity({ blockTag: blockNumber }),
        pool.feeGrowthGlobal0X128({ blockTag: blockNumber }),
        pool.feeGrowthGlobal1X128({ blockTag: blockNumber }),
      ]);

    return {
      sqrtPriceX96: slot0.sqrtPriceX96.toString(),
      tick: Number(slot0.tick),
      liquidity: liquidity.toString(),
      feeGrowthGlobal0X128: feeGrowthGlobal0X128.toString(),
      feeGrowthGlobal1X128: feeGrowthGlobal1X128.toString(),
    };
  } catch {
    return null;
  }
}

async function getTicksForPool(pool: ethers.Contract, tickSpacing: number, blockNumber: number) {
  const ticks: Record<string, any> = {};
  const slot0 = await pool.slot0({ blockTag: blockNumber });
  const currentTick = Number(slot0.tick);
  const currentCompressed = Math.floor(currentTick / tickSpacing);
  const currentWord = currentCompressed >> 8;

  const scanRange = 15;
  for (let word = currentWord - scanRange; word <= currentWord + scanRange; word++) {
    try {
      const bitmap = await pool.tickBitmap(word, { blockTag: blockNumber });
      if (bitmap !== 0n) {
        for (let bit = 0; bit < 256; bit++) {
          if (bitmap & (1n << BigInt(bit))) {
            const compressedTick = word * 256 + bit;
            const tick = compressedTick * tickSpacing;
            try {
              const tickData = await pool.ticks(tick, { blockTag: blockNumber });
              if (tickData.liquidityGross > 0n) {
                ticks[tick.toString()] = {
                  liquidityGross: tickData.liquidityGross.toString(),
                  liquidityNet: tickData.liquidityNet.toString(),
                  feeGrowthOutside0X128: tickData.feeGrowthOutside0X128.toString(),
                  feeGrowthOutside1X128: tickData.feeGrowthOutside1X128.toString(),
                };
              }
            } catch {}
          }
        }
      }
    } catch {}
  }

  return ticks;
}

async function main() {
  const provider = await getProvider();
  const latestBlock = await provider.getBlockNumber();
  console.log("Latest block:", latestBlock);

  const allData: any = {};

  for (const [name, config] of Object.entries(POOLS)) {
    console.log(`\n=== Fetching ${name} ===`);
    const pool = new ethers.Contract(config.address, POOL_ABI, provider);
    const [fee, tickSpacing] = await Promise.all([
      pool.fee(),
      pool.tickSpacing(),
    ]);

    console.log(`Fee: ${fee}, TickSpacing: ${tickSpacing}`);

    // Try to get swaps in small batches
    const batchSize = 100;
    const allSwaps: any[] = [];
    let fromBlock = latestBlock - 5000;

    while (fromBlock < latestBlock && allSwaps.length < 50) {
      const toBlock = Math.min(fromBlock + batchSize, latestBlock);
      try {
        const swaps = await getSwapEvents(provider, config.address, fromBlock, toBlock);
        allSwaps.push(...swaps);
        console.log(`  Blocks ${fromBlock}-${toBlock}: ${swaps.length} swaps (total: ${allSwaps.length})`);
      } catch (e) {
        console.log(`  Blocks ${fromBlock}-${toBlock}: error - ${e.message}`);
      }
      fromBlock = toBlock + 1;
    }

    console.log(`Total swaps found: ${allSwaps.length}`);

    if (allSwaps.length === 0) {
      console.log("No swaps found, skipping...");
      continue;
    }

    // Get state before first swap
    const firstSwapBlock = allSwaps[0].blockNumber;
    console.log(`Getting pool state at block ${firstSwapBlock - 1}...`);
    const beforeState = await getPoolStateAtBlock(pool, firstSwapBlock - 1);

    if (!beforeState) {
      console.log("Failed to get pool state, skipping...");
      continue;
    }

    console.log(`Getting tick data...`);
    const ticks = await getTicksForPool(pool, Number(tickSpacing), firstSwapBlock - 1);
    console.log(`Found ${Object.keys(ticks).length} initialized ticks`);

    allData[name] = {
      poolAddress: config.address,
      fee: Number(fee),
      tickSpacing: Number(tickSpacing),
      decimals0: config.decimals0,
      decimals1: config.decimals1,
      fetchedAt: new Date().toISOString(),
      beforeState,
      ticks,
      swaps: allSwaps.slice(0, 50),
    };

    console.log(`Saved ${allSwaps.length} swaps for ${name}`);
  }

  mkdirSync("tests/fixtures", { recursive: true });
  writeFileSync("tests/fixtures/mainnet-swaps.json", JSON.stringify(allData, null, 2));
  console.log("\nSaved to tests/fixtures/mainnet-swaps.json");

  for (const [name, data] of Object.entries(allData)) {
    const d = data as any;
    console.log(`\n${name}:`);
    console.log(`  ${d.swaps.length} swaps`);
    console.log(`  ${Object.keys(d.ticks).length} ticks`);
    if (d.swaps.length > 0) {
      const s = d.swaps[0];
      console.log(`  First swap: block ${s.blockNumber}`);
      console.log(`    amount0: ${s.amount0}`);
      console.log(`    amount1: ${s.amount1}`);
      console.log(`    sqrtPriceX96: ${s.sqrtPriceX96}`);
      console.log(`    tick: ${s.tick}`);
    }
  }
}

main().catch(console.error);
