---
name: shopsavvy-data-api
description: Use when asked for product prices, UPC/EAN/ISBN or ASIN lookup, current retailer offers, price history, scheduled price monitoring, or when writing code against the ShopSavvy Data API or one of its SDKs. Covers which call answers which question, the order to try (connected ShopSavvy MCP tools, then the REST API with SHOPSAVVY_API_KEY, then ask the user to connect), credit costs, limits, error codes and identifier tips.
user-invocable: true
argument-hint: [question about a product, or the code you are writing]
---

# ShopSavvy Data API

The ShopSavvy Data API turns a barcode (UPC/EAN/ISBN/GTIN), Amazon ASIN, product URL, model number, MPN or ShopSavvy product ID into a product record, current offers from tens of thousands of retailers, and price history back to 2011 (dense from 2019). Offers are returned in US dollars.

- Docs: https://shopsavvy.com/data/documentation
- OpenAPI 3.0 spec (no key needed): https://api.shopsavvy.com/v1/openapi.json. Read it when you need a field or parameter that is not in this file. Credit costs are in the table below (operations that carry `x-credit-cost` state the same thing).
- Base URL: `https://api.shopsavvy.com/v1`
- Auth: `Authorization: Bearer $SHOPSAVVY_API_KEY` (keys look like `ss_live_` plus 32 characters)

## Rules

1. **Never fabricate.** If a call returns no product, no offers or no history, say so plainly ("no current prices found", "no recorded history for that window"). Report zero as zero. Never estimate a price, fill a gap from memory, or swap in a different product or store.
2. **Never print or commit an API key.** Read it from `SHOPSAVVY_API_KEY`. Do not echo it, write it into files, or paste it into code you hand back. Code you write should read it from the environment.
3. **Cite the source.** When you quote a price, name ShopSavvy and the retailer, and say when the offer was last seen (`timestamp`).
4. **Watch the spend.** Estimate credits before a multi-product job (table below). For anything over ~100 credits, check the balance first with `GET /v1/usage` (0 credits) and tell the user the estimate.

## Which path to use (runtime order)

1. **ShopSavvy MCP tools are connected** (tool names like `product_lookup`, `product_offers`): use them. They need no key for light use (10 tool calls a minute, 100 an hour); with a Data API key the limit is 100 a minute with no hourly cap, and tool calls use plan credits.
2. **No MCP tools, but `SHOPSAVVY_API_KEY` is set**: call the REST API with `curl` or a short script, or use the SDK for the project's language.
3. **Neither**: tell the user how to connect and stop. Do not guess prices.
   - MCP, no signup: add the remote server `https://api.shopsavvy.com/mcp` (setup per client: https://shopsavvy.com/agents#install). In Claude Code: `claude mcp add --transport http shopsavvy https://api.shopsavvy.com/mcp`
   - REST: a Data API plan (14-day trial on Starter) at https://shopsavvy.com/data, then `export SHOPSAVVY_API_KEY=ss_live_...`

Check the environment without revealing the key:

```bash
[ -n "$SHOPSAVVY_API_KEY" ] && echo "key is set" || echo "no key"
```

## Intent to call

| The user wants | MCP tool | REST call | Credits (REST, with a key) |
|---|---|---|---|
| Identify a product from a barcode, ASIN, URL, model or name | `product_lookup` | `GET /products?ids=...` | 1 per product found |
| Several products at once | `product_lookup_batch` | `GET /products?ids=a,b,c` (up to 100) or `POST /products/batch` | 1 per product found |
| Keyword search ("samsung 65 inch tv") | `product_search` | `GET /products/search?q=...&limit=20&offset=0` | 1 per product returned |
| Every retailer's current price | `product_offers` | `GET /products/offers?ids=...` | 3 per product with offers |
| One store's price | `product_offers_retailer` | `GET /products/offers?ids=...&retailer=bestbuy.com` | 2 per product with offers |
| Price history / "is this a good price?" | `product_price_history` | `GET /products/offers/history?ids=...&start=YYYY-MM-DD&end=YYYY-MM-DD` | 3 per product with offers (2 with `retailer`) + 1 per day of the window, once per request |
| Keep a product's prices refreshed | `product_schedule` | `PUT /products/scheduled?ids=...&schedule=hourly\|daily\|weekly` | 1 per product |
| Stop or list schedules | `product_unschedule`, `scheduled_products_list` | `DELETE /products/scheduled?ids=...`, `GET /products/scheduled` | 0 |
| Short review (pros, cons, verdict) | `content_tldr_review` | `GET /products/reviews?id=...` | 1 (0 if no review) |
| Current deals | none | `GET /deals?sort=...&limit=...` | 1 per 10 deals |
| Credit balance | `api_usage` | `GET /usage` | 0 |
| CSV instead of JSON | none | add `&format=csv` to `/products` or `/products/offers` | same as JSON |

Not-found identifiers, products with no offers, and every error cost 0 credits. MCP-only tools (`content_best_picks`, `content_buying_guide`, `content_qa_answers`, `universal_search`) are for consumer research; see the `shopping-research` skill.

## Response shape

Every response is `{ "success": true, "data": [...], "meta": { "credits_used", "credits_remaining", "rate_limit_remaining" } }`.

- Product fields: `title`, `brand`, `model`, `mpn`, `barcode`, `amazon` (ASIN), `shopsavvy` (the ShopSavvy ID, e.g. `products/3ONn300xybP3y66ibqc1`; pass it to follow-up calls), `images`, `category`, and `match` (`identifier` as you sent it, `by` = which field matched, `candidates`).
- `match.by = "name"` is low confidence: a name can resolve to a different size or variant. Prefer barcodes, ASINs and URLs, and say so when you had to match by name.
- Identifiers that match nothing are left out of `data`. Line results up with your input using `match.identifier`, and report the missing ones as not found.
- Offers (`/products/offers`): `data[i].offers[]` with `retailer`, `price` (number, USD), `availability` (`"in"` or `"out"`; absent when unknown, so do not treat absent as in stock), `condition` (`new`/`used`/`refurbished`), `condition_grade`, `seller`, `is_marketplace`, `URL`, `timestamp` (when ShopSavvy last saw the offer).
- History (`/products/offers/history`): each offer also carries `history[]`, newest first, each point `timestamp`, `price`, `currency` (can be `null`; never assume USD for a null), `availability`. Points are quality-filtered (the same series ShopSavvy's own price chart shows), so some offers have an empty `history`.
- An empty `offers` array means no USD offers on file, not that the product is unsold everywhere.

## Limits

- 100 identifiers per request (`ids=` or `identifiers` on `POST /products/batch`). Split bigger lists.
- Price-history window: at most 366 days per request. Request longer ranges in consecutive slices; the per-day cost applies to each slice.
- 1,000 requests per rolling hour per account, across all its keys. Batch identifiers to save requests.
- `POST /products/batch`: up to 20 identifiers answer immediately; 21-100 return a `batch.id` to poll at `GET /batch/{id}` (0 credits) until `status` is `"completed"`.
- Scheduled refreshes run hourly, daily or weekly for retailers ShopSavvy can re-check through an official retailer API; other retailers update as ShopSavvy sees them.

## Errors

Branch on `error_detail.code`, never on the HTTP status (two codes share 429) or the message. `error_detail.action` is a one-line fix you can show the user. Quote `meta.request_id` if they contact support@shopsavvy.com.

| Code | HTTP | Fix |
|---|---|---|
| `ERR_AUTH_MISSING` | 401 | Send `Authorization: Bearer $SHOPSAVVY_API_KEY`. |
| `ERR_AUTH_INVALID` | 401 | Key is not `ss_live_` + 32 chars: check for a missing `Bearer `, stray quotes or whitespace from a .env file, or a truncated copy. |
| `ERR_AUTH_REVOKED` | 401 | Key was revoked or the account deleted. Create a new key at https://shopsavvy.com/data/api-keys. |
| `ERR_SUBSCRIPTION_REQUIRED` | 403 | No Data API plan on the account. Start one at https://shopsavvy.com/data#pricing. |
| `ERR_SUBSCRIPTION_INACTIVE` | 403 | Plan canceled or payment failed past the grace window. Fix billing at https://shopsavvy.com/data/billing. |
| `ERR_CREDITS_EXHAUSTED` | 429 | Monthly credits used up. Retrying will not help until the period resets or the plan is upgraded. Watch the `X-Credits-Warning` header (sent past 75%). |
| `ERR_RATE_LIMIT` | 429 | Over 1,000 requests in the rolling hour. Wait `Retry-After` seconds, then retry. |
| `ERR_INVALID_PARAMS` | 400 | The message names the parameter: over 100 ids, a window over 366 days, a date not `YYYY-MM-DD`, a bad `schedule`. |
| `ERR_IDENTIFIER_REQUIRED` | 400 | Identifiers go in `ids=` (comma-separated, any type). `barcode=`, `upc=`, `asin=` are not read. Reviews take a single `id=`. |
| `ERR_PRODUCT_NOT_FOUND` | 404 | Nothing matched. Check the barcode's check digit (missing or extra digit), or try the ASIN, model number or product URL. |
| `ERR_ENDPOINT_NOT_FOUND` | 404 | Unknown batch or webhook id. |
| `ERR_METHOD_NOT_ALLOWED` | 405 | Not available to this caller (for example the playground sandbox). |
| `ERR_INTERNAL` | 500 | Retry with exponential backoff; report the `request_id` if it persists. |

## Identifier tips

- Send identifiers as they are, mixed types allowed: `ids=611247373064,B07G14HTBZ,https://www.target.com/p/...`. URL-encode URLs and names.
- 12-digit UPC-A and 13-digit EAN are both fine. A leading zero matters; keep identifiers as strings, never numbers (spreadsheets drop leading zeros).
- After the first lookup, use the returned `shopsavvy` ID for every follow-up call. It is exact and cheaper to reason about than a name.
- Retailer filters take a domain (`amazon.com`, `bestbuy.com`, `walmart.com`), not a display name.

## Examples

```bash
# Every retailer's current price for one barcode (3 credits if offers exist)
curl -s "https://api.shopsavvy.com/v1/products/offers?ids=611247373064" \
  -H "Authorization: Bearer $SHOPSAVVY_API_KEY"

# 90 days of history at one retailer (2 + 90 = 92 credits if offers exist)
curl -s "https://api.shopsavvy.com/v1/products/offers/history?ids=611247373064&retailer=amazon.com&start=2026-07-01&end=2026-09-28" \
  -H "Authorization: Bearer $SHOPSAVVY_API_KEY"

# Balance check before a big job (0 credits)
curl -s "https://api.shopsavvy.com/v1/usage" -H "Authorization: Bearer $SHOPSAVVY_API_KEY"
```

## SDKs

Official open-source SDKs in 10 languages, all reading the same API. When writing code for a project, use the one for its language and read the key from the environment.

| Language | Install | Repo |
|---|---|---|
| Python | `pip install shopsavvy-sdk` | github.com/shopsavvy/sdk-python |
| TypeScript / JavaScript | `npm install @shopsavvy/sdk` | github.com/shopsavvy/sdk-typescript |
| Go | `go get github.com/shopsavvy/sdk-go` | github.com/shopsavvy/sdk-go |
| Rust | `cargo add shopsavvy-sdk` | github.com/shopsavvy/sdk-rust |
| Java | Maven `com.shopsavvy:shopsavvy-sdk` | github.com/shopsavvy/sdk-java |
| Kotlin | Gradle `com.shopsavvy:shopsavvy-sdk-kotlin` | github.com/shopsavvy/sdk-kotlin |
| Swift | SwiftPM `https://github.com/shopsavvy/sdk-swift.git` | github.com/shopsavvy/sdk-swift |
| PHP | `composer require shopsavvy/shopsavvy-sdk-php` | github.com/shopsavvy/sdk-php |
| Ruby | `gem install shopsavvy-sdk` | github.com/shopsavvy/sdk-ruby |
| C# / .NET | `dotnet add package ShopSavvy.Sdk` | github.com/shopsavvy/sdk-csharp |

## Related skills

- `competitor-price-report`: a SKU list in, a dated report and CSV of every retailer's price out.
- `price-history-export`: price history for a list of products over any date range, as CSV.
- `retailer-coverage-check`: which retailers have current offers for a list of products, and how recently each was seen.
- `shopping-research`: consumer questions ("best price for X", "buy now or wait?").
