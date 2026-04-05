import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { ethers } from "ethers";

const envContent = readFileSync(".env", "utf-8");
const apiKey = envContent.match(/ETHERSCAN_API_KEY=(.+)/)?.[1]?.trim();
if (!apiKey) throw new Error("ETHERSCAN_API_KEY not found in .env");

const SWAP_EVENT_TOPIC0 = "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67";

const POOLS = {
  USDC_ETH_500: {
    address: "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640",
    decimals0: 6,
    decimals1: 18,
  },
};

async function fetchLogsFromEtherscan(address: string, topic0: string, startBlock: number, endBlock: number, page: number = 1, offset: number = 1000) {
  const url = `https://api.etherscan.io/v2/api?chainid=1&module=logs&action=getLogs&address=${address}&topic0=${topic0}&startblock=${startBlock}&endblock=${endBlock}&page=${page}&offset=${offset}&apikey=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== "1") {
    throw new Error(`Etherscan API error: ${data.message} - ${data.result}`);
  }

  return data.result;
}

async function getBlockTimestamp(blockNumber: number) {
  const url = `https://api.etherscan.io/v2/api?chainid=1&module=block&action=getblockreward&blockno=${blockNumber}&apikey=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.status === "1") {
    return parseInt(data.result.timeStamp);
  }
  return 0;
}

async function main() {
  console.log("Fetching swap data from Etherscan...");

  const allData: any = {};

  for (const [name, config] of Object.entries(POOLS)) {
    console.log(`\n=== ${name} ===`);

    const latestBlock = 24806000;
    const startBlock = 24800000;

    console.log(`Fetching swaps from block ${startBlock} to ${latestBlock}...`);

    const logs = await fetchLogsFromEtherscan(
      config.address,
      SWAP_EVENT_TOPIC0,
      startBlock,
      latestBlock,
      1,
      1000
    );

    console.log(`Found ${logs.length} swap events`);

    if (logs.length === 0) {
      console.log("No swaps found, trying earlier blocks...");
      const earlierLogs = await fetchLogsFromEtherscan(
        config.address,
        SWAP_EVENT_TOPIC0,
        24700000,
        24701000,
        1,
        100
      );
      console.log(`Found ${earlierLogs.length} swap events in earlier range`);
      logs.push(...earlierLogs);
    }

    const swaps: any[] = [];
    const iface = new ethers.Interface([
      "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)"
    ]);

    for (let i = 0; i < Math.min(logs.length, 50); i++) {
      const log = logs[i];
      const parsed = iface.parseLog({
        topics: log.topics,
        data: log.data,
      });

      if (!parsed) continue;

      swaps.push({
        blockNumber: parseInt(log.blockNumber, 16),
        txHash: log.transactionHash,
        amount0: parsed.args[2].toString(),
        amount1: parsed.args[3].toString(),
        sqrtPriceX96: parsed.args[4].toString(),
        liquidity: parsed.args[5].toString(),
        tick: Number(parsed.args[6]),
      });

      if (i % 10 === 0) {
        console.log(`  Processed ${i + 1}/${Math.min(logs.length, 50)} swaps...`);
      }

      if (i < Math.min(logs.length, 50) - 1) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    if (swaps.length === 0) {
      console.log("No swaps found after parsing");
      continue;
    }

    allData[name] = {
      poolAddress: config.address,
      fee: 500,
      tickSpacing: 10,
      decimals0: config.decimals0,
      decimals1: config.decimals1,
      fetchedAt: new Date().toISOString(),
      swaps,
    };

    console.log(`\n${name}: ${swaps.length} swaps`);
    if (swaps.length > 0) {
      const s = swaps[0];
      console.log(`  First: block ${s.blockNumber}, amount0=${s.amount0}, amount1=${s.amount1}`);
      console.log(`  sqrtPriceX96=${s.sqrtPriceX96}, tick=${s.tick}`);
    }
  }

  mkdirSync("tests/fixtures", { recursive: true });
  writeFileSync("tests/fixtures/etherscan-swaps.json", JSON.stringify(allData, null, 2));
  console.log("\nSaved to tests/fixtures/etherscan-swaps.json");
}

main().catch(console.error);
