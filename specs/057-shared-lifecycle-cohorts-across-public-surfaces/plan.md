# Plan

## 1. Establish the backend contract

- Extract cohort classification from `SitemapService` into a reusable backend resolver operating on `resolvedCanonicalCatalogue()` output.
- Define cohort DTOs and endpoint shapes for all, live, upcoming, recent, and archive with a single canonical owner per stable key.
- Carry lifecycle reason, semantic freshness, and indexability through the DTO.

## 2. Move public hubs to the contract

- Replace `LiveScoreHubComponent` local completed/upcoming filters with cohort responses.
- Replace homepage parallel live/upcoming/recent filtering with the same cohort data.
- Retain scorecards, discovery links, archive pagination, and schedule-specific ordering.

## 3. Align sitemap and SSR

- Make named sitemap shards consume the resolver rather than a duplicate classifier.
- Ensure SSR route cache fingerprints include the canonical lifecycle/cohort facts used by hubs.
- Preserve schema rules: cohort is an authority input, not a reason to synthesize content.

## 4. Verify and release

- Add format-boundary, alias, no-duplicate, hub/SSR parity, and sitemap parity tests.
- Run local browser/raw SSR checks.
- Deploy from a clean built image only; canary the exact AUS–BAN stable key and representative ODI/T20/Hundred rows.
- Record prod image digests, rollback pins, timings, and any remaining evidence gaps.
