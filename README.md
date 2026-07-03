# Jupiter Solana Swap Quote API

[![MCP Server](https://img.shields.io/badge/MCP-server-blue)](https://jupiter-quotes.api.klymax402.com/mcp)
[![x402](https://img.shields.io/badge/payments-x402-6E56CF)](https://x402.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Solana swap quotes via Jupiter aggregator -- best route, price impact, slippage, priority fees included. Pay-per-call via [x402](https://x402.org) (USDC on Base L2) -- no API key, no signup, no rate-limit wall.

Part of the [klymax402](https://klymax402.com) marketplace -- 100 x402 micropayment APIs for AI agents, one wallet, USDC on Base.

## Quickstart -- MCP

Add to your MCP client config (Claude Desktop, Cursor, ElizaOS, etc.):

```json
{
  "mcpServers": {
    "jupiter-quotes": {
      "url": "https://jupiter-quotes.api.klymax402.com/mcp"
    }
  }
}
```

## Quickstart -- HTTP (x402)

```bash
curl "https://jupiter-quotes.api.klymax402.com/api/quote?inputMint=...&outputMint=...&amount=..."
# -> 402 Payment Required, with an x402 payment challenge in the response body
```

Any x402-aware client ([`@x402/fetch`](https://www.npmjs.com/package/@x402/fetch), [`x402-agent-tools`](https://www.npmjs.com/package/x402-agent-tools), ATXP) handles the 402 -> sign -> retry cycle automatically.

## Tools

| Tool | Method | Path | Price | Description |
|---|---|---|---|---|
| `jupiter_get_swap_quote` | GET | `/api/quote` | $0.002 | Get best swap quote on Solana via Jupiter aggregator |

### `jupiter_get_swap_quote`

Use this when you need a swap quote on Solana. Returns the best route via Jupiter aggregator across all Solana DEXes with price impact and fee analysis.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `inputMint` | string | yes | Input token mint address or symbol (SOL, USDC, USDT). e.g. So11111111111111111111111111111111111111112 or SOL |
| `outputMint` | string | yes | Output token mint address or symbol (SOL, USDC, USDT). e.g. EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v or USDC |
| `amount` | string | yes | Amount in raw lamports/smallest unit. e.g. 1000000000 = 1 SOL, 1000000 = 1 USDC |
| `slippage` | number | no | Slippage tolerance in basis points. Default 50 (0.5%). e.g. 100 = 1% |

**Returns**

- `inputToken` -- input token symbol and mint address
- `outputToken` -- output token symbol and mint address
- `inAmount` -- input amount in raw units
- `outAmount` -- expected output amount in raw units
- `priceImpact` -- price impact percentage (e.g. 0.12 = 0.12%)
- `minimumReceived` -- minimum output after slippage tolerance
- `route` -- array of DEX hops used (e.g. Raydium -> Orca)
- `priorityFee` -- recommended priority fee in lamports

Example response:

```json
{"inputToken":{"symbol":"SOL","mint":"So111..."},"outputToken":{"symbol":"USDC","mint":"EPjF..."},"inAmount":"1000000000","outAmount":"67450000","priceImpact":0.05,"minimumReceived":"67112750","route":["Raydium V4"],"priorityFee":5000}
```

**When to use**: executing any Solana token swap. Essential for getting the best price, understanding slippage, and choosing the optimal route.

## Example agent prompts

- "A swap quote on Solana"

## Payment

- Protocol: [x402](https://x402.org) -- HTTP-native pay-per-call, no signup, no API key
- Network: Base L2 (`eip155:8453`)
- Asset: USDC
- Facilitator: Coinbase CDP (primary), PayAI (fallback)
- Also reachable via [ATXP](https://atxp.ai) (OAuth-wrapped x402, RFC 9728 protected-resource metadata)

## Part of klymax402

100 x402 micropayment APIs for AI agents -- one wallet, USDC on Base, zero signup.

- Catalog: https://klymax402.com/llms.txt
- Full API reference: https://klymax402.com/llms-full.txt
- Live stats: https://klymax402.com/stats

## License

MIT
