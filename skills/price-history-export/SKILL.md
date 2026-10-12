---
name: price-history-export
description: Use when asked to export, download or analyze price history for one or more products (by UPC/EAN, ASIN, URL or model number) over a date range, for example "get the last year of prices for these SKUs as a CSV" or "when was this cheapest?". Pulls quality-filtered history from the ShopSavvy Data API in 366-day slices and writes a CSV plus a short summary, with a credit estimate first.
user-invocable: true
argument-hint: [identifiers or file] [start YYYY-MM-DD] [end YYYY-MM-DD] [optional retailer domain]
---

# Price history export

Input: product identifiers, a start and end date (`YYYY-MM-DD`, end no later than today), and optionally one retailer domain. If the user gives no dates, ask; do not pick a long window silently, because each day costs a credit.

Output:

- `price-history-<start>-to-<end>.csv`: one row per price point.
- `price-history-<start>-to-<end>-SUMMARY.md`: per-product low, high, latest, and where the latest price sits in the range.

Read the `shopsavvy-data-api` skill for auth, errors and limits. With connected MCP tools and no key, use `product_price_history` (one product per call); otherwise use the REST API.

## Rules

- **Report zero as zero, never fabricate.** A product with no recorded history in the window gets a line saying so. Never interpolate missing days, extend a series past its last point, or infer history from current prices.
- **Never print or save the API key.** Read it from `SHOPSAVVY_API_KEY`.
- History points are quality-filtered (the same series ShopSavvy's own price chart shows), so some offers have no points. That is a real result, not an error.
- `currency` on a point can be `null`. Write it as empty; never assume USD for it.
- History reaches back to 2011 for some products and is dense from 2019. Say so if the user asks for earlier years and gets little back.

## Cost

Per request: 3 credits per product with offers (2 with a `retailer` filter) plus 1 credit per day of the window, charged once per request however many products it carries. Nothing is charged when no offers are found.

- The window is capped at 366 days per request, so a longer range is split into slices, and each slice pays its own day cost.
- Put up to 100 products in each request to pay the day cost once per slice, not once per product.
- Example: 40 products over 2 years = 2 slices x (40 x 3 + ~365) = about 970 credits. The same 40 products one at a time would cost about 30,000.

Before running, compute the estimate, check `GET /v1/usage` (0 credits), and if the estimate is over 100 credits or over 25% of `credits_remaining`, show both and wait for a go-ahead.

## Steps

1. Clean identifiers (trim, de-duplicate, keep as strings). Split into chunks of up to 100.
2. Split the date range into consecutive slices of at most 366 days (inclusive of both ends, no overlap, no gap).
3. For each chunk and slice:
   ```bash
   curl -s "https://api.shopsavvy.com/v1/products/offers/history?ids=$IDS&start=$START&end=$END${RETAILER:+&retailer=$RETAILER}" \
     -H "Authorization: Bearer $SHOPSAVVY_API_KEY"
   ```
   On `ERR_RATE_LIMIT` wait `Retry-After` seconds and retry; on `ERR_CREDITS_EXHAUSTED` stop and write what you have, clearly marked incomplete.
4. Flatten `data[].offers[].history[]` into CSV rows:
   `input_identifier, shopsavvy_id, title, barcode, asin, retailer, seller, condition, offer_url, point_timestamp, price, currency, availability`
   Points arrive newest first; sort the CSV by product, retailer, then `point_timestamp` ascending. De-duplicate identical points that appear in two adjacent slices.
5. Products not in `data` are "not found" (match on `match.identifier`); products found but with no points are "no recorded history in this window". List both in the summary.
6. Summary per product: number of retailers with points, the lowest and highest price (with retailer and date), the latest point, and whether the latest price is at, near (within 5%) or above the period low. Add credits used (sum of `meta.credits_used`).
7. Tell the user where the files are, the credits used, and which products had no history or were not found.
