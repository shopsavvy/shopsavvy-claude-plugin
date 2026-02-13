# shopsavvy-mcp

Pre-configured MCP server for ShopSavvy - connect your AI agent to 100M+ products across 40,000+ retailers.

## Quick Start

```bash
npx shopsavvy-mcp
```

That's it! Your AI agent can now search products, compare prices, and find the best deals.

## Installation

### Claude Code

```bash
claude mcp add shopsavvy -- npx shopsavvy-mcp
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
      "args": ["shopsavvy-mcp"]
    }
  }
}
```

Then restart Claude Desktop.

### Other MCP Agents

Use this SSE endpoint:
```
https://api.shopsavvy.com/mcp/sse
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
| `product_search` | Search 100M+ products |
| `product_offers` | Get prices from all retailers |
| `product_price_history` | View historical pricing |
| `product_schedule` | Set up price monitoring |
| `content_best_picks` | Curated buying guides |
| `content_tldr_review` | Quick pros/cons verdicts |
| `content_buying_guide` | When-to-buy timing advice |

## Rate Limits

| Tier | Per Minute | Per Hour |
|------|------------|----------|
| Free | 10 | 100 |
| API Key | 100 | Unlimited |

No signup required for free tier. Get an API key at [shopsavvy.com/data](https://shopsavvy.com/data) for higher limits.

## Links

- Website: [shopsavvy.com](https://shopsavvy.com)
- AI Agents: [shopsavvy.com/agents](https://shopsavvy.com/agents)
- API: [shopsavvy.com/data](https://shopsavvy.com/data)

## License

MIT
