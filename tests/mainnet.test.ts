import { describe, test, expect } from "bun:test";
import { UniswapV3Pool } from "../src/index.js";
import { getSqrtRatioAtTick, getTickAtSqrtRatio, FeeTier, TICK_SPACING, sqrtPriceX96ToPrice } from "../src/index.js";

describe("Mainnet Pool State Verification", () => {
  test("USDC/ETH 0.05% pool tick matches sqrtPrice", () => {
    const onChainState = {
      sqrtPriceX96: 1749148996937264846894763662369444n,
      tick: 200056,
      fee: 500,
      tickSpacing: 10,
      liquidity: 13806151088844428497n,
    };

    expect(getTickAtSqrtRatio(onChainState.sqrtPriceX96)).toBe(onChainState.tick);
    expect(getSqrtRatioAtTick(onChainState.tick)).toBeLessThan(onChainState.sqrtPriceX96);
    expect(getSqrtRatioAtTick(onChainState.tick + 1)).toBeGreaterThan(onChainState.sqrtPriceX96);
  });

  test("USDC/ETH 0.3% pool tick matches sqrtPrice", () => {
    const onChainState = {
      sqrtPriceX96: 1748353059440623783181523914223096n,
      tick: 200047,
      fee: 3000,
      tickSpacing: 60,
      liquidity: 896643957465061196n,
    };

    expect(getTickAtSqrtRatio(onChainState.sqrtPriceX96)).toBe(onChainState.tick);
    expect(getSqrtRatioAtTick(onChainState.tick)).toBeLessThan(onChainState.sqrtPriceX96);
    expect(getSqrtRatioAtTick(onChainState.tick + 1)).toBeGreaterThan(onChainState.sqrtPriceX96);
  });

  test("WBTC/ETH 0.3% pool tick matches sqrtPrice", () => {
    const onChainState = {
      sqrtPriceX96: 45184556482087980843469245561030032n,
      tick: 265091,
      fee: 3000,
      tickSpacing: 60,
      liquidity: 57177832705910689n,
    };

    expect(getTickAtSqrtRatio(onChainState.sqrtPriceX96)).toBe(onChainState.tick);
    expect(getSqrtRatioAtTick(onChainState.tick)).toBeLessThan(onChainState.sqrtPriceX96);
    expect(getSqrtRatioAtTick(onChainState.tick + 1)).toBeGreaterThan(onChainState.sqrtPriceX96);
  });

  test("DAI/USDC 0.01% pool tick matches sqrtPrice", () => {
    const onChainState = {
      sqrtPriceX96: 79230645126508839734671n,
      tick: -276324,
      fee: 100,
      tickSpacing: 1,
      liquidity: 8496190936406552698591n,
    };

    expect(getTickAtSqrtRatio(onChainState.sqrtPriceX96)).toBe(onChainState.tick);
    expect(getSqrtRatioAtTick(onChainState.tick)).toBeLessThan(onChainState.sqrtPriceX96);
    expect(getSqrtRatioAtTick(onChainState.tick + 1)).toBeGreaterThan(onChainState.sqrtPriceX96);
  });

  test("Pool creation matches on-chain state", () => {
    const onChainState = {
      sqrtPriceX96: 1748353059440623783181523914223096n,
      tick: 200047,
      fee: 3000,
      tickSpacing: 60,
      liquidity: 896643957465061196n,
    };

    const pool = new UniswapV3Pool(
      onChainState.fee,
      onChainState.tickSpacing,
      onChainState.sqrtPriceX96
    );

    expect(pool.slot0.sqrtPriceX96).toBe(onChainState.sqrtPriceX96);
    expect(pool.slot0.tick).toBe(onChainState.tick);
    expect(pool.fee).toBe(onChainState.fee);
    expect(pool.tickSpacing).toBe(onChainState.tickSpacing);
    expect(pool.liquidity).toBe(0n);
  });

  test("Simulated swap produces reasonable results with real pool parameters", () => {
    const pool = new UniswapV3Pool(
      3000,
      60,
      1748353059440623783181523914223096n
    );

    pool.mint({
      owner: "lp",
      tickLower: 199980,
      tickUpper: 200100,
      amount: 896643957465061196n,
    });

    const initialSqrtPrice = pool.slot0.sqrtPriceX96;

    const swapResult = pool.swap({
      recipient: "trader",
      zeroForOne: true,
      amountSpecified: 1000000000000000000n,
      sqrtPriceLimitX96: 0n,
    });

    expect(swapResult.amount0).toBeGreaterThan(0n);
    expect(swapResult.sqrtPriceX96).toBeLessThanOrEqual(initialSqrtPrice);
  });

  test("TickMath roundtrip for real mainnet ticks", () => {
    const mainnetTicks = [200056, 200047, 265091, -276324, 0, -1000, 1000];

    for (const tick of mainnetTicks) {
      const sqrtPrice = getSqrtRatioAtTick(tick);
      const recoveredTick = getTickAtSqrtRatio(sqrtPrice);
      expect(recoveredTick).toBe(tick);
    }
  });

  test("Price calculations for real mainnet pools with correct decimals", () => {
    const usdcEthSqrtPrice = 1749148996937264846894763662369444n;
    const ethPerUsdc = sqrtPriceX96ToPrice(usdcEthSqrtPrice, 6, 18);
    expect(ethPerUsdc).toBeGreaterThan(0.0001);
    expect(ethPerUsdc).toBeLessThan(0.001);
    const usdcPerEth = 1 / ethPerUsdc;
    expect(usdcPerEth).toBeGreaterThan(1500);
    expect(usdcPerEth).toBeLessThan(5000);

    const wbtcEthSqrtPrice = 45184556482087980843469245561030032n;
    const ethPerWbtc = sqrtPriceX96ToPrice(wbtcEthSqrtPrice, 8, 18);
    expect(ethPerWbtc).toBeGreaterThan(10);

    const daiUsdcSqrtPrice = 79230645126508839734671n;
    const usdcPerDai = sqrtPriceX96ToPrice(daiUsdcSqrtPrice, 18, 6);
    expect(usdcPerDai).toBeGreaterThan(0.99);
    expect(usdcPerDai).toBeLessThan(1.01);
  });
});
