import type { ApiConfig } from "./shared";

export const API_CONFIG: ApiConfig = {
  name: "jupiter-quotes",
  slug: "jupiter-quotes",
  description: "Solana swap quotes via Jupiter aggregator -- best route, price impact, slippage, priority fees included.",
  version: "1.0.0",
  routes: [
    {
      method: "GET",
      path: "/api/quote",
      price: "$0.002",
      description: "Get best swap quote on Solana via Jupiter aggregator",
      toolName: "jupiter_get_swap_quote",
      toolDescription: `Use this when you need a swap quote on Solana. Returns the best route via Jupiter aggregator across all Solana DEXes with price impact and fee analysis.

1. inputToken: input token symbol and mint address
2. outputToken: output token symbol and mint address
3. inAmount: input amount in raw units
4. outAmount: expected output amount in raw units
5. priceImpact: price impact percentage (e.g. 0.12 = 0.12%)
6. minimumReceived: minimum output after slippage tolerance
7. route: array of DEX hops used (e.g. Raydium -> Orca)
8. priorityFee: recommended priority fee in lamports

Example output: {"inputToken":{"symbol":"SOL","mint":"So111..."},"outputToken":{"symbol":"USDC","mint":"EPjF..."},"inAmount":"1000000000","outAmount":"67450000","priceImpact":0.05,"minimumReceived":"67112750","route":["Raydium V4"],"priorityFee":5000}

Use this BEFORE executing any Solana token swap. Essential for getting the best price, understanding slippage, and choosing the optimal route.

Do NOT use for EVM swaps -- use dex_get_swap_quote. Do NOT use for Solana fees only -- use solana_get_priority_fees. Do NOT use for pool liquidity analysis -- use solana_scan_pool_liquidity.`,
      inputSchema: {
        type: "object",
        properties: {
          inputMint: {
            type: "string",
            description:
              "Input token mint address or symbol (SOL, USDC, USDT). e.g. So11111111111111111111111111111111111111112 or SOL",
          },
          outputMint: {
            type: "string",
            description:
              "Output token mint address or symbol (SOL, USDC, USDT). e.g. EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v or USDC",
          },
          amount: {
            type: "string",
            description:
              "Amount in raw lamports/smallest unit. e.g. 1000000000 = 1 SOL, 1000000 = 1 USDC",
          },
          slippage: {
            type: "number",
            description: "Slippage tolerance in basis points. Default 50 (0.5%). e.g. 100 = 1%",
          },
        },
        required: ["inputMint", "outputMint", "amount"],
      },
    },
  ],
};
