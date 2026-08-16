# Spec 056 — Fast Full-Information SSR and Truthful Sitemap Freshness

## Problem

Canonical match pages currently take far too long to render for crawlers. The AUS–BAN request on 2026-08-16 took 8.5 seconds end-to-end (5.2 seconds TTFB) after redirect, against a cached target below two seconds. The rich match document must remain complete: this work must not solve latency by removing score, lifecycle, venue, toss, scorecard, commentary, lineups, schema, internal links, or any existing match information.

Freshness is also inconsistent. The AUS–BAN canonical snapshot reported `INNINGS_BREAK`, `Stumps`, and `BAN lead by 153 runs`, while the public catalogue owner was completed and the raw page schema said EventInProgress. The current single sitemap manifest sorts all lifecycle states together and derives `lastmod` directly from a stored timestamp, which can either lag meaningful content or change after a no-op poll.

## Outcome

1. A warm canonical `/cric-live/{slug}` response has p95 total latency below two seconds and retains the full existing SSR document.
2. A cold render can refresh the full document asynchronously, but a crawler always receives the latest retained rich document rather than a reduced shell.
3. One resolved canonical record supplies lifecycle, identity, format, static facts, schema status, page content, hub membership, sitemap cohort, and lastmod.
4. Sitemap cohorts are explicit and mutually exclusive: `live`, `upcoming`, `recent`, and `archive`.
5. A match URL's sitemap `lastmod` changes only after meaningful indexable match content changes, never merely because the manifest regenerated or a poll repeated equivalent data.
6. The AUS–BAN record is reconciled end-to-end before rollout: one owner, one lifecycle, one schema event status, current retained rich content, and one sitemap cohort.

## Non-negotiable guardrails

- Preserve all current match information and routes. Defer expensive computation or reuse a retained full document; do not remove scorecards, commentary, lineups, match details, schema, or internal links to meet the latency target.
- Do not invent freshness. A source outage may serve the last-known rich document with its actual content timestamp, or a non-indexable availability response when none exists.
- Do not emit two lifecycle states for one stable CREX match ID.
- Do not place aliases, non-canonical children, or incomplete terminal records in any sitemap cohort.
- Do not treat HTTP 200, an SSR cache hit, or sitemap membership as proof of Google indexing/ranking.

## Acceptance criteria

- Three warmed public requests for the same canonical match prove p95 total response time under 2 seconds, with one cold-render observation recorded separately.
- Raw normal-browser and Googlebot HTML retain the existing meaningful match content and have matching canonical, lifecycle text, and JSON-LD event status.
- Cache invalidation occurs only on a semantic match-content fingerprint change; an equivalent poll preserves the document and sitemap lastmod.
- A score, result, lifecycle, venue, toss, lineup, or other indexable SSR-visible field change updates the retained document and its `lastmod` once.
- Live, upcoming, recent, and archive sitemap cohorts have no duplicate canonical URL and no lifecycle leakage between cohorts.
- AUS–BAN has a current evidence timestamp appropriate to its real lifecycle, and no page/schema/catalogue/sitemap contradiction remains.
