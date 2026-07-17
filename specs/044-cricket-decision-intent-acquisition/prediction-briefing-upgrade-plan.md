# Prediction Briefing Upgrade Plan

Updated: 2026-07-10

## Goal

Bring the strongest public-safe patterns from the production CrickenZen prediction page into Crickzen's `/match-intelligence/{slug}` route without redirecting users to the private dashboard or changing the homepage.

## Product Shape

The route becomes a public prediction briefing:

1. Match context: teams, lifecycle, series, freshness, and return link.
2. Prediction hero: public model direction, probability, meter, score, overs, and projected score.
3. Decision summary: what changed, why it changed, and what matters next.
4. Explanation modules: public-safe swings, reasons, pressure, venue, and turning-point context.
5. Trust layer: freshness, methodology, and model-proof links without operator controls.
6. Relationship CTA: follow the match or receive probability updates after meaningful value is consumed.

## Public Safety Boundary

Keep the following private: Monte Carlo internals, blend weights, raw dashboard state, operator controls, customer/account data, full private timelines, and unfiltered model diagnostics.

The public route may expose only rounded probability, safe projection, score state, freshness, plain-language insight, selected swings, and approved explanation fields.

## Intent-to-Transaction Flow

`search/discovery -> canonical match -> prediction briefing -> prediction interaction -> alert/follow CTA -> repeat visit -> future premium/API interest`

The first transaction-adjacent action is relationship capture, not payment. Every CTA must retain match ID, lifecycle, source surface, and originating intent properties.

## Execution Slices

### Slice 1: Prediction Briefing Shell

- [x] Add production-inspired public prediction band.
- [x] Add probability meter and score/overs/projection context.
- [x] Keep the route SSR-rendered and model-safe.

### Slice 2: Decision Modules

- [x] Preserve what changed, why it changed, and what matters next.
- [ ] Replace remaining generic copy with shared model/video-studio explanation fields.
- [ ] Add probability swing timeline when the public payload provides swing points.
- [ ] Add completed-match turning-point and loss-explanation content.

### Slice 3: Relationship Capture

- [x] Add a visible post-value relationship CTA.
- [x] Emit `alert_cta_click` with match and lifecycle context.
- [ ] Connect the CTA to the selected owned channel.
- [ ] Verify `relationship_join` and `repeat_match_visit` attribution.

### Slice 4: Proof And Release

- [ ] Add focused component/data-service tests.
- [ ] Verify mobile, keyboard, screen-reader, direct refresh, and back navigation.
- [ ] Verify analytics in the configured destination, not only console output.
- [ ] Complete canonical, SSR, discovery, and sitemap/indexing gates.
- [ ] Roll out to production after the gates pass.

## Verified Checkpoint

Local route: `http://localhost:8080/match-intelligence/gibraltar-vs-romania`

The rebuilt route renders the public model briefing, relationship CTA, no loading state, and no model-unavailable fallback while the local dashboard service is running.
