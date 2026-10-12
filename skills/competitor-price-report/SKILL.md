---
name: competitor-price-report
description: Use when asked to compare competitor prices for a list of products (SKUs, UPCs/EANs, ASINs or product URLs), build a price-comparison or price-position report, or check where a product is cheapest across retailers. Produces a dated REPORT.md and a CSV of every retailer's current price from the ShopSavvy Data API, with a credit estimate before it runs.
user-invocable: true
argument-hint: [file or list of SKUs/barcodes/ASINs] [optional: your retailer domain]
---

# Competitor price report

Input: a list of products (a file with one identifier per line, a CSV column, or identifiers in the message) and optionally the user's own retailer domain (for example `acme-outdoor.com`) to compare against.

Output, in the current directory unless the user names another:

- `competitor-prices-YYYY-MM-DD.csv`: one row per offer.
- `competitor-prices-YYYY-MM-DD-REPORT.md`: the summary.

Read the `shopsavvy-data-api` skill for auth, errors and limits. Use connected ShopSavvy MCP tools (`product_lookup_batch`, `product_offers`) if there is no `SHOPSAVVY_API_KEY`; otherwise call the REST API directly, which is cheaper on requests.

## Rules

- **Report zero as zero, never fabricate.** A product with no offers gets a row saying "no current offers found". An identifier that matches nothing is listed as not found. Never fill a price from memory, from another product, or from a different size or variant.
- **Never print or save the API key.** Read it from `SHOPSAVVY_API_KEY`.
- Keep identifiers as strings (leading zeros matter).
- Prices are US dollars. Do not convert or label them as another currency.

## Steps

1. **Collect and clean identifiers.** Trim whitespace, drop blanks and duplicates, keep the original order. Note how many there are.
2. **Estimate credits and confirm.** All-retailer offers cost 3 credits per product that has offers (not-found and no-offer products cost 0). Upper bound: `3 x N`. Example: 250 SKUs is at most 750 credits, in 3 requests. Check the balance with `GET /v1/usage` (0 credits). If the estimate is over 100 credits or over 25% of `credits_remaining`, tell the user the estimate and balance and wait for a go-ahead.
3. **Fetch offers in chunks of 100:**
   ```bash
   curl -s "https://api.shopsavvy.com/v1/products/offers?ids=$(paste -sd, chunk.txt)" \
     -H "Authorization: Bearer $SHOPSAVVY_API_KEY" > offers-chunk-1.json
   ```
   URL-encode any identifier that is a URL. On `ERR_RATE_LIMIT` wait `Retry-After` seconds and retry the same chunk; on `ERR_CREDITS_EXHAUSTED` stop and report what was fetched so far.
4. **Match results to input** by `data[i].match.identifier`. Anything in the input without a match is "not found". Flag rows where `match.by` is `name` as low confidence.
5. **Write the CSV** with these columns, one row per offer, sorted by input order then price ascending:
   `input_identifier, shopsavvy_id, title, brand, barcode, asin, retailer, seller, is_marketplace, condition, availability, price_usd, offer_last_seen, offer_url, match_by`
   Leave `availability` empty when the API omits it (unknown is not "in stock"). Add one row per product with no offers (retailer empty, `price_usd` empty, note in `retailer` column: `no current offers found`) and one per not-found identifier (`not found`), so every input appears.
6. **Write REPORT.md:**
   - Title with the date and the data source: "Prices from the ShopSavvy Data API, fetched YYYY-MM-DD HH:MM UTC."
   - Counts: identifiers submitted, matched, with at least one offer, not found, low-confidence matches. Credits used (sum of `meta.credits_used`).
   - Per product: lowest new-condition in-stock price and retailer, median price, number of retailers, and, if the user gave their own domain, their price, their rank among retailers, and the gap to the lowest price in dollars and percent. If their domain has no offer for a product, say "no offer from <domain> on file" rather than guessing their price.
   - A short list of the largest gaps (where the user is most undercut), and of products where they are the lowest price.
   - Oldest `offer_last_seen` per product, so the reader can see how fresh each price is.
   - A "Not found" section listing those identifiers and the tip to retry with an ASIN, model number or product URL.
7. **Tell the user** where the two files are, the credits used, and anything that needs their attention (not-found items, low-confidence matches, products with no offers).

## Re-running it

For a recurring report, suggest scheduling the products for refresh (`PUT /v1/products/scheduled?ids=...&schedule=daily`, 1 credit per product, refreshes not charged) and re-running this skill on the same input file; date-stamped filenames keep each run.
