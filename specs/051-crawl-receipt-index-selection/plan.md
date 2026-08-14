# Implementation Plan: Crawl receipt and index selection

## Technical approach

1. **Protect the data contract at ingress.** Capture venue from trusted schedule JSON-LD/ground elements, normalize placeholders to null, and let the existing source identity validation reject malformed rows. Enrich upcoming catalogue rows from the stored canonical snapshot only when identity facts are missing.
2. **Protect the page contract at SSR.** Keep the deterministic canonical fallback as the timeout/error path, verify the resolved-route 200 and unresolved-route 404/noindex behavior, and preserve the existing SportsEvent startDate+location guard.
3. **Add a bounded editorial-schema experiment.** Keep the ordinary Article/SportsEvent behavior for upcoming pages. Select NewsArticle only when the same substantive-update evidence that qualifies live coverage is present, with real dates and attribution. Do not use NewsArticle to bypass event-schema or crawl problems.
4. **Measure outcomes with the existing StartupOS monitor.** Keep the fixed URL cohort and append-only ledger as the source of timing evidence. Record technical readiness, sitemap/SSR-link first-seen timestamps, explicit GSC observations, and T−1h outcome. No ordinary SportsEvent Indexing API requests.
5. **Roll out in gates.** Run parser/backend/frontend focused tests, build the affected artifacts, deploy only the narrow validated slice, run the SSR/crawl guard against a real upcoming candidate, then collect GSC observations at the defined checkpoints. Do not call the experiment successful from local or HTTP evidence alone.

## Files and boundaries

- Scraper schedule parser and unit tests: venue extraction/normalization only.
- Backend `LiveMatchServiceImpl` and focused service/controller tests: upcoming snapshot enrichment only.
- Frontend `cricket-odds.component.ts` and lifecycle tests: NewsArticle eligibility only; preserve SportsEvent guard.
- `specs/051-crawl-receipt-index-selection/*`: requirements, data model, verification and rollout contract.
- `docs/seo/canonical-live-match-ranking-tasks.md` and Agentic OS wiki: durable status/evidence after verification.

## Non-goals

- No blanket `NewsArticle` schema for every match.
- No invented venue/location, start date, probability, toss, XI, or result.
- No Google Indexing API requests for ordinary SportsEvent pages.
- No claim that sitemap inclusion, 200 responses, schema validity, or ranking equals discovery/indexing.
- No broad frontend redesign or model-artifact promotion as part of this slice.

## Verification gates

1. Parser tests prove a real venue is retained and placeholders become null.
2. Backend tests prove missing upcoming venue can be hydrated from the canonical snapshot without changing a source-resolved identity.
3. Frontend tests prove upcoming pages do not emit NewsArticle and eligible live coverage does.
4. SSR guard proves deterministic fallback and venue/startDate schema behavior for normal and Googlebot requests.
5. StartupOS cohort ledger records the selected URLs and remains pending until explicit GSC observations are supplied.
