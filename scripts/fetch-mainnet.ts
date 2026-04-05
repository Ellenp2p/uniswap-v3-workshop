import { ethers } from "ethers";
import { UniswapV3Pool } from "../src/index.js";
import { getSqrtRatioAtTick, getTickAtSqrtRatio, FeeTier, TICK_SPACING } from "../src/index.js";

const RPC_URLS = [
  "https://eth.llamarpc.com",
  "https://rpc.ankr.com/eth",
  "https://ethereum-rpc.publicnode.com",
  "https://1rpc.io/eth",
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
      console.log("Failed:", url);
      continue;
    }
  }
  throw new Error("Failed to connect to any RPC endpoint");
}

const UNISWAP_V3_POOL_ABI = [
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

async function main() {
  const provider = await getProvider();

  const POOL_ADDRESSES = {
    "USDC/ETH 0.05%": "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640",
    "USDC/ETH 0.3%": "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
    "WBTC/ETH 0.3%": "0xCBCdF9626bC03E24f779434178A73a0B4bad62eD",
    "DAI/USDC 0.01%": "0x5777d92f208679DB4b9778590Fa3CAB3aC9e2168",
  };

  for (const [name, poolAddress] of Object.entries(POOL_ADDRESSES)) {
    console.log(`\n=== ${name} (${poolAddress}) ===`);

    try {
      const pool = new ethers.Contract(poolAddress, UNISWAP_V3_POOL_ABI, provider);

      const [slot0, fee, tickSpacing, liquidity, feeGrowthGlobal0X128, feeGrowthGlobal1X128] =
        await Promise.all([
          pool.slot0(),
          pool.fee(),
          pool.tickSpacing(),
          pool.liquidity(),
          pool.feeGrowthGlobal0X128(),
          pool.feeGrowthGlobal1X128(),
        ]);

      const blockNumber = await provider.getBlockNumber();

      console.log(`  Block: ${blockNumber}`);
      console.log(`  Fee: ${fee}, TickSpacing: ${tickSpacing}`);
      console.log(`  sqrtPriceX96: ${slot0.sqrtPriceX96}`);
      console.log(`  Tick: ${slot0.tick}`);
      console.log(`  Liquidity: ${liquidity}`);
      console.log(`  feeGrowthGlobal0X128: ${feeGrowthGlobal0X128}`);
      console.log(`  feeGrowthGlobal1X128: ${feeGrowthGlobal1X128}`);

      const swapTopic = ethers.id(SWAP_EVENT);
      const latestBlock = await provider.getBlockNumber();
      const logs = await provider.getLogs({
        address: poolAddress,
        topics: [swapTopic],
        fromBlock: latestBlock - 500,
        toBlock: latestBlock,
      });

      const iface = new ethers.Interface([SWAP_EVENT]);
      const swaps = logs.slice(-5).map((log) => {
        const parsed = iface.parseLog(log);
        return {
          blockNumber: log.blockNumber,
          txHash: log.transactionHash,
          amount0: parsed?.args[2],
          amount1: parsed?.args[3],
          sqrtPriceX96: parsed?.args[4],
          liquidity: parsed?.args[5],
          tick: Number(parsed?.args[6]),
        };
      });

      console.log(`\n  Recent swaps (${swaps.length}):`);
      for (const s of swaps) {
        console.log(`    Block ${s.blockNumber}: amount0=${s.amount0}, amount1=${s.amount1}, tick=${s.tick}`);
      }
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }
}

main().catch(console.error);
