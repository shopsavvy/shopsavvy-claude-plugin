# ShopSavvy AI Agent Plugin

A Claude Code plugin for shopping research and price comparison, powered by ShopSavvy's database of 100M+ products across 40,000+ retailers.

## Features

### Product Research
- **Product Lookup** - Find products by barcode, ASIN, URL, or name
- **Product Search** - Full-text search across 100M+ products
- **Universal Search** - Enhanced search with rankings and reviews

### Price Intelligence
- **Price Comparison** - Current prices from ALL retailers
- **Price History** - Historical trends to find the best time to buy
- **Price Monitoring** - Set up alerts for price drops

### Expert Content
- **Best Picks** - Curated "Best Of" buying guides
- **TLDR Reviews** - Quick pros/cons/verdict summaries
- **Q&A Answers** - Product-specific questions answered
- **Buying Guides** - When-to-buy timing advice

## Installation

### Claude Code (Recommended)

```bash
claude mcp add --transport sse shopsavvy https://api.shopsavvy.com/mcp/sse
```

Verify installation:
```bash
claude mcp list
```

### Claude Desktop

Add to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "shopsavvy": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://api.shopsavvy.com/mcp/sse"]
    }
  }
}
```

Then restart Claude Desktop.

### Claude Cowork

Add to your Cowork MCP settings:

```json
{
  "mcpServers": {
    "shopsavvy": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://api.shopsavvy.com/mcp/sse"]
    }
  }
}
```

### Other MCP-Compatible Agents

For any agent that supports MCP (Model Context Protocol), connect to:

```
https://api.shopsavvy.com/mcp/sse
```

Transport: Server-Sent Events (SSE)

Or simply instruct your agent:
> "Connect to the ShopSavvy MCP server at https://api.shopsavvy.com/mcp/sse to enable shopping research tools."

## Usage

### Using the Skill

```
/shopping-research AirPods Pro
```

### Natural Language

Just ask Claude naturally:

> "What's the best price for a PS5 right now?"

> "Best gaming laptops under $1500"

> "Should I buy a TV now or wait for Black Friday?"

> "Compare iPhone 15 Pro vs Samsung S24 Ultra"

Claude will automatically use ShopSavvy tools to research products, compare prices, and provide recommendations.

## Available Tools

### Product Research Tools

| Tool | Description | Credits |
|------|-------------|---------|
| `product_lookup` | Find product by barcode, ASIN, URL, model, or name | 1/product |
| `product_lookup_batch` | Find multiple products at once | 1/product |
| `product_search` | Full-text keyword search | 1/result |
| `universal_search` | Enhanced search with rankings and reviews | 2+ credits |

### Price Intelligence Tools

| Tool | Description | Credits |
|------|-------------|---------|
| `product_offers` | Current prices from ALL retailers | 3/product |
| `product_offers_retailer` | Price from a SPECIFIC retailer | 2/product |
| `product_price_history` | Historical pricing data | 3 + 1/day |
| `product_schedule` | Set up price monitoring | 1/product |
| `product_unschedule` | Stop monitoring | Free |
| `scheduled_products_list` | View monitored products | Free |

### Expert Content Tools

| Tool | Description | Credits |
|------|-------------|---------|
| `content_best_picks` | Curated "Best Of" buying guides | 1/article |
| `content_tldr_review` | Quick pros/cons/verdict | 1/review |
| `content_qa_answers` | Product Q&A answers | 1/5 answers |
| `content_buying_guide` | When-to-buy timing advice | 1/guide |

### Utility Tools

| Tool | Description | Credits |
|------|-------------|---------|
| `api_usage` | Check usage statistics | Free |

## Rate Limits

| User Type | Per Minute | Per Hour | Notes |
|-----------|------------|----------|-------|
| Anonymous | 10 | 100 | No signup required |
| API Key | 100 | Unlimited | Get key at shopsavvy.com/data |

**For most users, anonymous limits are plenty.** A typical shopping research session uses 5-20 requests.

## API Key (Optional)

For higher rate limits, get an API key at [shopsavvy.com/data](https://shopsavvy.com/data).

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "shopsavvy": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://api.shopsavvy.com/mcp/sse"],
      "env": {
        "SHOPSAVVY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Example Workflows

### Find the Best Price
1. Ask: "What's the best price for AirPods Pro?"
2. Claude uses `product_lookup` → `product_offers`
3. You get: Best price, all retailers, buy recommendation

### Research a Category
1. Ask: "Best gaming laptops under $1500"
2. Claude uses `content_best_picks` → `universal_search` → `product_offers`
3. You get: Top picks with prices, pros/cons, and quick reviews

### Timing Advice
1. Ask: "Should I buy a TV now?"
2. Claude uses `product_price_history` → `content_buying_guide`
3. You get: Price trends, best time to buy, upcoming sale predictions

## Support

- Website: [shopsavvy.com](https://shopsavvy.com)
- AI Agents: [shopsavvy.com/agents](https://shopsavvy.com/agents)
- Data API: [shopsavvy.com/data](https://shopsavvy.com/data)

## License

MIT License - see [LICENSE](LICENSE) for details.
