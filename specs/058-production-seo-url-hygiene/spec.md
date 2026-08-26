# Spec 058 — Production SEO URL hygiene and schedule-first match SSR

## Problem

The August production crawl found canonical match URLs returning a mixture of
404, intermittent 503, and slow 200 responses while malformed and stale
locations remained in published sitemap cohorts. The existing lifecycle and
canonical work is present, but a bare human-readable slug can fail the
stable-key resolver and sitemap/catalogue validators accept placeholder
identities such as `null-vs-null`.

The problem is not solved by making every historical URL return 200 or by
deleting all historical URLs. A valid retained result is an indexable entity;
an invalid identity is a retired URL; a valid upcoming match is a schedule
page even when model or live-score data does not exist yet.

## Decision

Use one URL policy for the resolved canonical catalogue, match SSR, hubs, and
sitemap publication:

1. A real canonical match slug is backed by a resolved catalogue record and
   has two non-placeholder teams separated by `-vs-`.
2. A bare legacy slug is resolvable by exact canonical slug as well as by the
   stable `-match-updates-{id}` key. Stable-key aliases still redirect to the
   one canonical owner.
3. Upcoming pages render from schedule/lifecycle metadata without waiting for
   live score, model, commentary, or retained-result enrichment. Missing model
   data is honest page copy, not a 503.
4. Completed pages remain eligible only when they have a trustworthy retained
   result or terminal state. Invalid, duplicate, placeholder, or unresolved
   URLs are excluded from the sitemap and return an intentional 404/noindex.
5. Sitemaps are regenerated from the current authoritative catalogue. `lastmod`
   is freshness metadata and is never used as a deletion mechanism.

## Non-goals

- Bulk conversion of old 404 URLs into 200 pages.
- Removing valid historical canonical match pages.
- New route families, News sitemap coverage, or blanket NewsArticle markup.
- A claim about Google indexing, ranking, or traffic before timed GSC evidence.

## Release gate

Before production sitemap submission, prove with a bounded canary and a full
sitemap reconciliation:

- valid upcoming bare and pre-generated URLs return 200 repeatedly;
- invalid and placeholder URLs return 404 with noindex and are absent from
  every advertised sitemap shard;
- valid retained completed pages remain 200 and canonical;
- no canonical URL occurs in more than one lifecycle cohort;
- normal and Googlebot raw HTML agree on canonical, robots, H1, and JSON-LD;
- sitemap generation publishes one complete, internally consistent manifest.
