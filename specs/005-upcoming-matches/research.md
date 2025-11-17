# Research: Upcoming Matches Feed

Date: 2025-11-16

This document resolves Technical Context clarifications and captures key decisions with rationale and alternatives.

## Decisions

1) Scraping approach for fixtures pages
- Decision: Prefer HTTP fetching with requests + BeautifulSoup (or lxml) for static fixture pages; enable optional Playwright fallback for pages that require JS evaluation.
- Rationale: Fixture listings are relatively stable and often static; avoiding headless browsers prevents the known PID/thread leak class of failures and reduces resource usage. Playwright will be gated behind strict context managers and finally-cleanup when needed.
- Alternatives considered:
  - Playwright-only: Simpler selector logic but heavier, higher resource cost, greater risk for orphan processes.
  - Scrapy: Powerful, but adds framework overhead; not necessary for 1–2 fixture sources.

2) Redis TTL for upcoming lists
- Decision: 10 minutes TTL for GET /upcoming list responses; background refresh on the scraper every 10 minutes.
- Rationale: Success criteria target <15 minutes freshness; 10 minutes balances freshness and backend query load. Users rarely need second-level precision for fixtures.
- Alternatives considered:
  - 5 minutes TTL: Fresher but increases cache churn and DB hits.
  - 30 minutes TTL: Too stale; risks missing late scheduling changes.

3) Backend Java version
- Decision: Java 11 with Spring Boot 2.x.
- Rationale: Constitution references Spring Boot 2.x (Java 8/11). Java 11 is the long-term baseline and compatible with modern base images and toolchains.
- Alternatives considered:
  - Java 8: Wider compatibility but increasingly deprecated in base images and libraries.
  - Java 17: Requires Spring Boot upgrade path; out of scope.

4) Source of truth and conflict handling
- Decision: Primary source crex.com fixtures; ignore secondary sources in Phase 1. Include fields for `source` and `source_key` to enable future multi-source reconciliation.
- Rationale: Faster delivery with a single well-understood source. Schema anticipates future multi-source blending.
- Alternatives considered:
  - Dual-source merge (crex + espncricinfo): Higher complexity, requires reconciliation rules and confidence scoring.

5) Data refresh cadence
- Decision: Scraper sync every 10 minutes; forced refresh on 4xx/5xx soft failures with exponential backoff (max 1 retry per cycle).
- Rationale: Matches freshness goal while being respectful to source rate limits.
- Alternatives considered:
  - 1–5 minute cadence: Unnecessary pressure on source and infra for fixtures.

6) Identifiers and keys
- Decision: Stable `source_key` from the provider plus local `id` (auto-increment) for persistence; unique index on (`source`, `source_key`).
- Rationale: Avoids accidental duplication and supports idempotent upserts by scraper.
- Alternatives considered:
  - Hash of URL: Works but opaque and brittle to URL changes.

7) Playwright cleanup safety
- Decision: Use `with sync_playwright() as p:` and ensure `browser.close()` in finally; PID monitoring in scraper health endpoint; set Docker PID limit for scraper container in production compose.
- Rationale: Addresses the active incident of thread/PID leaks; keeps service stable.
- Alternatives considered:
  - Remove Playwright entirely: Risks breaking pages that require JS.

## Outcomes

- All NEEDS CLARIFICATION items in plan.md are resolved by the decisions above.
- Design artifacts (data model, contracts) reflect these choices.
