# shopsavvy-mcp

Pre-configured MCP server for ShopSavvy - connect your AI agent to tens of millions of products with prices from tens of thousands of retailers.

**Requires an API key.** Get one at [shopsavvy.com/data](https://shopsavvy.com/data).

## Quick Start

```bash
SHOPSAVVY_API_KEY=ss_live_xxx npx shopsavvy-mcp
```

That's it! Your AI agent can now search products, compare prices, and find the best deals.

## Installation

### Claude Code

```bash
claude mcp add --env SHOPSAVVY_API_KEY=ss_live_xxx --transport stdio shopsavvy -- npx shopsavvy-mcp
```

Verify:
```bash
claude mcp list
```

### Claude Desktop

Add to your `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "shopsavvy": {
      "command": "npx",
      "args": ["shopsavvy-mcp"],
      "env": { "SHOPSAVVY_API_KEY": "ss_live_xxx" }
    }
  }
}
```

Then restart Claude Desktop.

### Other MCP Agents

Connect to the SSE endpoint with both headers set on every request:
```
https://api.shopsavvy.com/mcp/sse
Authorization: Bearer ss_live_xxx
anthropic-beta: mcp-client-2025-04-04
```

## What You Can Do

Once connected, ask your AI:

- "What's the best price for AirPods Pro?"
- "Best gaming laptops under $1500"
- "Should I buy a TV now or wait?"
- "Compare iPhone 15 Pro vs Samsung S24"
- "Track this product for price drops"

## Available Tools

| Tool | Description |
|------|-------------|
| `product_lookup` | Find product by barcode, ASIN, URL, or name |
| `product_search` | Keyword search across tens of millions of products |
| `product_offers` | Get prices from all retailers |
| `product_price_history` | View historical pricing |
| `product_schedule` | Set up price monitoring |
| `content_best_picks` | Curated buying guides |
| `content_tldr_review` | Quick pros/cons verdicts |
| `content_buying_guide` | When-to-buy timing advice |

## Rate Limits

| Tier | Per Minute | Per Hour |
|------|------------|----------|
| API Key | 100 | Unlimited |
| Anonymous (no key) | 10 | 100 |

An API key is required for real use — get one at [shopsavvy.com/data](https://shopsavvy.com/data). The anonymous tier exists only as a fallback and isn't enough for a real research session.

## Links

- Website: [shopsavvy.com](https://shopsavvy.com)
- AI Agents: [shopsavvy.com/agents](https://shopsavvy.com/agents)
- API: [shopsavvy.com/data](https://shopsavvy.com/data)

## License

MIT
