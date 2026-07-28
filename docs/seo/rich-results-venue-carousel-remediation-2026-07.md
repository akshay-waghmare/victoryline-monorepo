---
title: "Rich Results venue and carousel remediation"
date: 2026-07-28
status: deployed
---

# Rich Results venue and carousel remediation

## Verified production issue

Google's Rich Results Test reported a `SportsEvent` missing `location` and two invalid Carousel candidates. The recurring venue loss was caused by the canonical snapshot merge: stored match-info supplied the venue, then a sparse live payload overwrote it with `null`.

The Carousel candidates were not editorial collections. They were support and freshness navigation links emitted as `ItemList` objects. Each `ListItem` also combined `url` and nested `item`, which Google treated as mutually exclusive Carousel properties.

## Changes shipped

- Canonical snapshot identity fields are monotonic: live state can fill missing values but cannot erase stored series, schedule, venue, or toss values.
- `SportsEvent` is emitted only when a reliable start date and venue are present.
- Yearless CREX-style labels such as `Tuesday, 28 July, 5:30 AM` are normalized with the four-digit year from the canonical slug. If no year can be established, the event is omitted instead of publishing an arbitrary historic date.
- Support and freshness links remain visible SSR links but are no longer represented as Google Carousel `ItemList` structured data.

## Production proof

Target: `/cric-live/aut-vs-isr-7th-match-eca-mens-european-cup-2026-match-updates-138M`

- Canonical snapshot venue: `Moara Vlasiei Cricket Ground, Ilfov County`
- Googlebot HTML: HTTP 200, self-canonical, one H1
- `SportsEvent.startDate`: `2026-07-28T05:30:00Z`
- `SportsEvent.location.name`: `Moara Vlasiei Cricket Ground, Ilfov County`
- `ItemList` count: `0`
- Support/freshness Carousel candidates: `0`
- Backend and frontend containers: healthy after rollout

## Release references

- Backend fix: `7624d8f`
- Frontend schema/date fix: `f34ec75`
- Frontend image: `macubex/victoryline-frontend:20260728-richresults-f34ec75`
- Backend image: `macubex/victoryline-backend:20260728-richresults-7624d8f`

## Follow-up gate

Re-run the Google Rich Results Test after Google's crawl completes. Treat the raw Googlebot HTML contract above as the immediate production acceptance gate; do not add fabricated optional Event fields merely to silence non-critical warnings.
