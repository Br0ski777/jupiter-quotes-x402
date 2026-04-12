import type { Hono } from "hono";

// ── Cache ──────────────────────────────────────────────────────────────
interface CacheEntry {
  data: any;
  timestamp: number;
}

const QUOTE_CACHE_TTL = 5_000; // 5 seconds
const PRICE_CACHE_TTL = 30_000; // 30 seconds
const cache = new Map<string, CacheEntry>();

function getCached<T>(key: string, ttl: number): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < ttl) return entry.data as T;
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ── Token mint map ─────────────────────────────────────────────────────
const TOKEN_MINTS: Record<string, string> = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
};

const MINT_TO_COINGECKO: Record<string, string> = {
  So11111111111111111111111111111111111111112: "solana",
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "usd-coin",
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: "tether",
};

const MINT_DECIMALS: Record<string, number> = {
  So11111111111111111111111111111111111111112: 9,
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 6,
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: 6,
};

function resolveMint(input: string): string {
  const upper = input.toUpperCase();
  return TOKEN_MINTS[upper] || input;
}

function tokenSymbol(mint: string): string {
  for (const [sym, addr] of Object.entries(TOKEN_MINTS)) {
    if (addr === mint) return sym;
  }
  return mint.slice(0, 6) + "...";
}

// ── External APIs ──────────────────────────────────────────────────────
const JUPITER_API = "https://quote-api.jup.ag/v6/quote";
const SOLANA_RPC = "https://api.mainnet-beta.solana.com";

async function fetchJupiterQuote(
  inputMint: string,
  outputMint: string,
  amount: string,
  slippageBps: number
): Promise<any> {
  const url = `${JUPITER_API}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Jupiter API ${resp.status}: ${text}`);
  }
  return resp.json();
}

async function fetchPriorityFees(): Promise<{
  low: number;
  medium: number;
  high: number;
}> {
  const cacheKey = "solana_priority_fees";
  const cached = getCached<any>(cacheKey, QUOTE_CACHE_TTL);
  if (cached) return cached;

  try {
    const resp = await fetch(SOLANA_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getRecentPrioritizationFees",
        params: [],
      }),
    });
    const json = await resp.json();
    const fees: number[] = (json.result || [])
      .map((f: any) => f.prioritizationFee)
      .filter((f: number) => f > 0);

    if (fees.length === 0) {
      const fallback = { low: 1000, medium: 5000, high: 25000 };
      setCache(cacheKey, fallback);
      return fallback;
    }

    fees.sort((a, b) => a - b);
    const result = {
      low: fees[Math.floor(fees.length * 0.25)] || 1000,
      medium: fees[Math.floor(fees.length * 0.5)] || 5000,
      high: fees[Math.floor(fees.length * 0.75)] || 25000,
    };
    setCache(cacheKey, result);
    return result;
  } catch {
    return { low: 1000, medium: 5000, high: 25000 };
  }
}

async function fetchTokenPriceUsd(mint: string): Promise<number | null> {
  const geckoId = MINT_TO_COINGECKO[mint];
  if (!geckoId) return null;

  const cacheKey = `price_${mint}`;
  const cached = getCached<number>(cacheKey, PRICE_CACHE_TTL);
  if (cached !== null) return cached;

  try {
    const resp = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd`
    );
    const json = await resp.json();
    const price = json[geckoId]?.usd ?? null;
    if (price !== null) setCache(cacheKey, price);
    return price;
  } catch {
    return null;
  }
}

// ── Route registration ─────────────────────────────────────────────────
export function registerRoutes(app: Hono) {
  app.get("/api/quote", async (c) => {
    const rawInput = c.req.query("inputMint");
    const rawOutput = c.req.query("outputMint");
    const amount = c.req.query("amount");
    const slippage = parseInt(c.req.query("slippage") || "50", 10);

    if (!rawInput || !rawOutput || !amount) {
      return c.json(
        {
          error: "Missing required parameters",
          required: { inputMint: "token mint or symbol", outputMint: "token mint or symbol", amount: "raw amount in smallest unit" },
          example: "/api/quote?inputMint=SOL&outputMint=USDC&amount=1000000000&slippage=50",
        },
        400
      );
    }

    const inputMint = resolveMint(rawInput);
    const outputMint = resolveMint(rawOutput);

    // Check cache
    const cacheKey = `quote_${inputMint}_${outputMint}_${amount}_${slippage}`;
    const cached = getCached<any>(cacheKey, QUOTE_CACHE_TTL);
    if (cached) return c.json(cached);

    try {
      // Fetch quote + priority fees + prices in parallel
      const [jupQuote, priorityFees, inputPrice, outputPrice] = await Promise.all([
        fetchJupiterQuote(inputMint, outputMint, amount, slippage),
        fetchPriorityFees(),
        fetchTokenPriceUsd(inputMint),
        fetchTokenPriceUsd(outputMint),
      ]);

      // Parse route plan
      const routeLabels: string[] = (jupQuote.routePlan || []).map((step: any) => {
        const swap = step.swapInfo || step;
        return swap.label || swap.ammKey?.slice(0, 8) || "unknown";
      });

      // Calculate human-readable amounts
      const inDecimals = MINT_DECIMALS[inputMint] || 9;
      const outDecimals = MINT_DECIMALS[outputMint] || 6;
      const inAmount = parseFloat(jupQuote.inAmount) / Math.pow(10, inDecimals);
      const outAmount = parseFloat(jupQuote.outAmount) / Math.pow(10, outDecimals);
      const minReceived =
        parseFloat(jupQuote.otherAmountThreshold || jupQuote.outAmount) /
        Math.pow(10, outDecimals);

      // USD values
      const inUsd = inputPrice ? inAmount * inputPrice : null;
      const outUsd = outputPrice ? outAmount * outputPrice : null;

      // Priority fee in SOL
      const priorityFeeSol = priorityFees.medium / 1e9;
      const baseTxFeeSol = 0.000005;
      const totalFeeSol = baseTxFeeSol + priorityFeeSol;

      // Estimated total cost in USD (input amount + fees)
      const solPrice = inputMint === TOKEN_MINTS.SOL ? inputPrice : await fetchTokenPriceUsd(TOKEN_MINTS.SOL);
      const feeUsd = solPrice ? totalFeeSol * solPrice : null;

      const result = {
        inputToken: tokenSymbol(inputMint),
        inputMint,
        outputToken: tokenSymbol(outputMint),
        outputMint,
        amountIn: inAmount,
        amountInRaw: jupQuote.inAmount,
        amountOut: parseFloat(outAmount.toFixed(6)),
        amountOutRaw: jupQuote.outAmount,
        minReceived: parseFloat(minReceived.toFixed(6)),
        priceImpact: parseFloat(jupQuote.priceImpactPct || "0"),
        slippageBps: slippage,
        route: routeLabels.length > 0 ? routeLabels.join(" → ") : "direct",
        routeSteps: routeLabels.length || 1,
        pricing: {
          inputPriceUsd: inputPrice,
          outputPriceUsd: outputPrice,
          amountInUsd: inUsd ? parseFloat(inUsd.toFixed(2)) : null,
          amountOutUsd: outUsd ? parseFloat(outUsd.toFixed(2)) : null,
        },
        priorityFee: {
          low: priorityFees.low,
          medium: priorityFees.medium,
          high: priorityFees.high,
          recommendedMicroLamports: priorityFees.medium,
          estimatedFeeSol: parseFloat(totalFeeSol.toFixed(9)),
          estimatedFeeUsd: feeUsd ? parseFloat(feeUsd.toFixed(6)) : null,
        },
        estimatedTotalCostUsd:
          inUsd && feeUsd ? parseFloat((inUsd + feeUsd).toFixed(2)) : null,
        cachedFor: "5s",
        timestamp: new Date().toISOString(),
      };

      setCache(cacheKey, result);
      return c.json(result);
    } catch (err: any) {
      return c.json(
        { error: "Failed to fetch swap quote", details: err.message },
        502
      );
    }
  });
}
