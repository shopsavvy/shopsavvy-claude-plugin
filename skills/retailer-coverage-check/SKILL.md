---
name: retailer-coverage-check
description: Use when asked which retailers carry or have prices for a list of products, whether a specific store (by domain) has offers for them, how fresh those prices are, or to check ShopSavvy Data API coverage for a catalog before buying a plan or building on it. Produces a product x retailer coverage table with last-seen times, and reports gaps honestly.
user-invocable: true
argument-hint: [identifiers or file] [optional: retailer domains to check]
---

# Retailer coverage check

Input: product identifiers (UPC/EAN, ASIN, URL, model number), and optionally the retailer domains the user cares about (for example `bestbuy.com, target.com, walmart.com`).

Output:

- `retailer-coverage-YYYY-MM-DD.csv`: one row per product and retailer.
- `retailer-coverage-YYYY-MM-DD-REPORT.md`: coverage summary and gaps.

Read the `shopsavvy-data-api` skill for auth, errors and limits.

## Rules

- **Report zero as zero, never fabricate.** "Not found", "found, no current offers" and "no offer from this retailer" are three different results; keep them apart and never round any of them up into coverage.
- **Never print or save the API key.** Read it from `SHOPSAVVY_API_KEY`.
- Do not describe coverage beyond what the calls returned. If the user asks how many retailers ShopSavvy covers overall, the accurate answer is "tens of thousands of retailers"; this check only measures their products.
- Offers are US-dollar offers. An empty `offers` array means no USD offers on file, not that nobody sells it.

## Cost

- All retailers at once: `GET /v1/products/offers?ids=...` at 3 credits per product with offers. Usually the cheapest way to check several retailers.
- A single retailer: add `&retailer=<domain>` for 2 credits per product with offers. Only cheaper when the user cares about exactly one store.
- Not-found products and products with no offers cost 0. Check `GET /v1/usage` first and confirm with the user when the estimate (3 x products) is over 100 credits or over 25% of the balance.

## Steps

1. Clean identifiers (trim, de-duplicate, keep as strings) and chunk them by 100.
2. Fetch all-retailer offers per chunk. On `ERR_RATE_LIMIT` wait `Retry-After` and retry.
3. For each input identifier, classify: not found (absent from `data`), found with no offers, or found with offers. Note low-confidence matches (`match.by` = `name`).
4. Build the table: for each product, each retailer that has an offer, with the count of offers (marketplace sellers included), lowest price, availability of that offer (`in`, `out`, or unknown when absent), and the most recent `timestamp`. If the user named retailers, add a row for every named retailer even when it has no offer, marked `no offer on file`.
   Match retailer domains to the `retailer` field carefully; if you cannot tell whether a display name is the named domain, say so instead of guessing. When it matters, confirm with a `&retailer=<domain>` call for that product.
5. Report:
   - Totals: submitted, found, with at least one offer, not found.
   - Per named retailer: how many of the found products it has an offer for, and the share.
   - Retailers that appear most often across the list.
   - Freshness: the age of each product's most recent offer, bucketed (seen in the last 24 hours, 7 days, 30 days, older).
   - Gaps: products with no offers anywhere, and products missing from each named retailer.
   - Credits used (sum of `meta.credits_used`).
6. If the user wants fresher prices for some products, mention scheduled refreshes (`PUT /v1/products/scheduled?ids=...&schedule=hourly|daily|weekly`, 1 credit per product). They run on that cadence for retailers ShopSavvy can re-check through an official retailer API; others update as ShopSavvy sees them. Do not promise a refresh rate for a specific retailer.
