import type { ApiConfig } from "./shared";

export const API_CONFIG: ApiConfig = {
  name: "jupiter-quotes",
  slug: "jupiter-quotes",
  description: "Solana swap quotes via Jupiter aggregator with priority fees and slippage analysis.",
  version: "1.0.0",
  routes: [
    {
      method: "GET",
      path: "/api/quote",
      price: "$0.002",
      description: "Get best swap quote on Solana via Jupiter aggregator",
      toolName: "jupiter_get_swap_quote",
      toolDescription:
        "Use this when you need a swap quote on Solana. Returns best route via Jupiter aggregator across all Solana DEXes (Raydium, Orca, Meteora, Phoenix), with price impact, minimum received, recommended priority fee, and route explanation. Do NOT use for EVM swaps — use dex_get_swap_quote. Do NOT use for Solana fees only — use solana_get_priority_fees.",
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
