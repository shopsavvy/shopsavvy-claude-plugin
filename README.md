# ShopSavvy plugin for Claude

Shopping research and price comparison inside Claude, from [ShopSavvy](https://shopsavvy.com/agents?utm_source=github&utm_medium=referral&utm_campaign=claude_plugin): look up products by barcode, ASIN, URL or name across tens of millions of products, compare current prices from tens of thousands of retailers, check price history back to 2011, and read ShopSavvy's buying guides and quick reviews. Developers also get skills for the ShopSavvy Data API: competitor price reports, price-history exports and retailer coverage checks.

**No API key needed.** The plugin connects to ShopSavvy's hosted MCP server and works as soon as it's installed (10 tool calls a minute, 100 an hour). A ShopSavvy Data API key is optional and raises the limit.

## Install

### Claude Code

In a Claude Code session (v2.1.275 or later):

```
/plugin install shopsavvy --marketplace shopsavvy/shopsavvy-claude-plugin
```

Or from your shell, in two steps:

```bash
claude plugin marketplace add shopsavvy/shopsavvy-claude-plugin
claude plugin install shopsavvy@shopsavvy
```

When the plugin is enabled, Claude Code offers an optional **ShopSavvy Data API key** field. Leave it blank to use ShopSavvy free.

To add only the MCP server (no skills), without the plugin:

```bash
claude mcp add --transport http shopsavvy https://api.shopsavvy.com/mcp
```

### claude.ai and Claude Desktop

Go to **Settings → Connectors → Add custom connector**, name it ShopSavvy, paste `https://api.shopsavvy.com/mcp`, and leave authentication empty. On Team and Enterprise plans an owner adds it under Organization settings → Connectors.

### Other MCP clients

| Client can... | Use |
|---------------|-----|
| Connect to a remote server (Streamable HTTP) | `https://api.shopsavvy.com/mcp` |
| Only speak the older HTTP+SSE transport | `https://api.shopsavvy.com/mcp/sse` |
| Only launch a local command | `npx -y @shopsavvy/mcp-server` ([npm](https://www.npmjs.com/package/@shopsavvy/mcp-server), [source](https://github.com/shopsavvy/shopsavvy-mcp-server)) |

Step-by-step setup for ChatGPT, Codex, Gemini CLI, Cursor, VS Code and Windsurf: [shopsavvy.com/agents#install](https://shopsavvy.com/agents?utm_source=github&utm_medium=referral&utm_campaign=claude_plugin#install).

## What's in the plugin

### Skills

| Skill | For | What it does |
|-------|-----|--------------|
| `shopping-research` | Shoppers | Best price, buy now or wait, category picks, quick reviews |
| `shopsavvy-data-api` | Developers | Which Data API call answers which question, the order to try (MCP tools, then REST with `SHOPSAVVY_API_KEY`), limits, error codes and fixes, identifier tips, SDK install lines |
| `competitor-price-report` | Pricing and ops teams | A list of SKUs in; a dated CSV of every retailer's current price and a REPORT.md with price position and gaps out |
| `price-history-export` | Analysts | Price history for many products over any date range as CSV, split into 366-day slices |
| `retailer-coverage-check` | Anyone evaluating coverage | Which retailers have current offers for your products, how recently each was seen, and where the gaps are |

Every skill reports "not found" and "no offers" as exactly that: no skill fills a gap with a guessed price.

### MCP tools

The plugin connects Claude to the ShopSavvy MCP server, which provides these tools. Each tool carries MCP annotations (title, read-only, destructive, open-world) that clients use when deciding what to confirm with you.

| Tool | What it does | Access |
|------|--------------|--------|
| `product_lookup` | Find one product by barcode, ASIN, URL, model number or name | Read-only |
| `product_lookup_batch` | Look up several products at once | Read-only |
| `product_search` | Keyword search across the catalog | Read-only |
| `universal_search` | Ranked category search with short reviews | Read-only |
| `product_offers` | Current prices from every retailer we have, lowest first | Read-only |
| `product_offers_retailer` | Current prices at one retailer | Read-only |
| `product_price_history` | Recorded prices over a date range | Read-only |
| `content_best_picks` | ShopSavvy's "best of" buying guides | Read-only |
| `content_tldr_review` | Pros, cons and a verdict for one product | Read-only |
| `content_qa_answers` | Answers to common questions about a product | Read-only |
| `content_buying_guide` | When-to-buy timing advice | Read-only |
| `api_usage` | Credit usage for your API key | Read-only, needs a key |
| `scheduled_products_list` | Products you've scheduled for re-checks | Read-only, needs a key |
| `product_schedule` | Schedule hourly, daily or weekly price re-checks | Writes to your account, needs a key |
| `product_unschedule` | Stop scheduled re-checks | Deletes from your account, needs a key |

## Examples

> "What's the best price for AirPods Pro right now?"

> "Best gaming laptops under $1500"

> "Should I buy a TV now or wait for Black Friday?"

> "Compare prices for the PS5 at Best Buy and Target"

Or run the skill directly: `/shopping-research AirPods Pro`

## Rate limits and the optional API key

| | Per minute | Per hour |
|---|---|---|
| No key | 10 tool calls | 100 tool calls |
| ShopSavvy Data API key | 100 tool calls | No hourly cap |

Without a key, tool calls are free. With a key, tool calls use your Data API plan's credits. Keys come with a Data API plan at [shopsavvy.com/data](https://shopsavvy.com/data?utm_source=github&utm_medium=referral&utm_campaign=claude_plugin). To use one, paste it into the plugin's optional key field (it is stored in Claude Code's secure storage, not in `settings.json`), or for the MCP server alone:

```bash
claude mcp add --transport http shopsavvy https://api.shopsavvy.com/mcp \
  --header "Authorization: Bearer YOUR_API_KEY"
```

## What the plugin connects to and sends

- **One network destination: `https://api.shopsavvy.com`.** The plugin declares a single remote MCP server, `https://api.shopsavvy.com/mcp`, operated by ShopSavvy (Monolith Technologies, Inc.). It runs no local programs, hooks or scripts, and installs no packages.
- **What is sent:** when Claude calls a ShopSavvy tool, the tool name and its arguments (the product identifier, search text, retailer or date range in your request) go to that server over HTTPS, along with your API key if you set one. Nothing else from your conversation or files is sent.
- **What the server records:** each tool call is logged with the tool name, time, response status, IP address and user agent, for rate limits, abuse prevention and usage counts; with a key, calls are also counted against your plan. See ShopSavvy's [privacy policy](https://shopsavvy.com/privacy).
- **Data API skills:** `shopsavvy-data-api`, `competitor-price-report`, `price-history-export` and `retailer-coverage-check` call the REST API at `https://api.shopsavvy.com/v1` only when you have set `SHOPSAVVY_API_KEY` yourself, and send that key only to `api.shopsavvy.com`. They never print or save the key.
- **Links in answers:** shopsavvy.com links in tool answers carry `utm_source`, `utm_medium` and `utm_campaign` tags naming the assistant, so ShopSavvy can count visits that came from an assistant.

## Support

- Help and contact: [shopsavvy.com/support](https://shopsavvy.com/support)
- MCP server and install guide: [shopsavvy.com/agents](https://shopsavvy.com/agents?utm_source=github&utm_medium=referral&utm_campaign=claude_plugin)
- Data API documentation: [shopsavvy.com/data/documentation](https://shopsavvy.com/data/documentation?utm_source=github&utm_medium=referral&utm_campaign=claude_plugin)
- Issues with this plugin: [GitHub issues](https://github.com/shopsavvy/shopsavvy-claude-plugin/issues)

## License

MIT. See [LICENSE](LICENSE).
