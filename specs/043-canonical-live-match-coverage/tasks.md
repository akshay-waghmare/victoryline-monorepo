# Tasks: Canonical Live Match Coverage

- [x] Audit the current `/cric-live/{slug}` implementation against the live-coverage SEO brief.
- [x] Confirm existing canonical, metadata, structured-data, and internal-link foundations already in place.
- [x] Identify the primary gaps: visible H1, curated live updates, conditional FAQ, trust layer, selective live-blog schema, and richer SSR text.
- [x] Create `specs/043-canonical-live-match-coverage/spec.md`.
- [x] Create `specs/043-canonical-live-match-coverage/plan.md`.
- [x] Create `specs/043-canonical-live-match-coverage/tasks.md`.

## Implementation Tasks

- [ ] Expose a visible canonical-page H1 near the top of `CricketOddsComponent`.
- [ ] Strengthen the above-the-fold summary layer to include live score, status, toss, venue, tournament, start time, innings context, chase context, and updated time where available.
- [ ] Define a shared `LiveMatchUpdate` interface or equivalent typed model.
- [ ] Reuse or extract meaningful-commentary classification logic from freshness-page code.
- [ ] Build a canonical-page update mapper that combines commentary and match-state signals into curated update cards.
- [ ] Add rules for toss, start, over-summary, wicket, milestone, innings-break, chase-equation, result, and general updates.
- [ ] Add dedupe and visible-volume limits so the updates section stays readable.
- [ ] Render a visible `Live Match Updates` section on `/cric-live/{slug}`.
- [ ] Keep commentary as the deeper ball-by-ball layer instead of the only live-text layer.
- [ ] Replace hardcoded canonical-page FAQ items with a data-driven FAQ builder.
- [ ] Render visible FAQ content only when the current match data can answer it.
- [ ] Emit `FAQPage` schema only from the same visible FAQ source.
- [ ] Add match-value and visible-content gating for canonical-page `LiveBlogPosting`.
- [ ] Map visible update cards into `LiveBlogPosting` entries only when eligibility rules pass.
- [ ] Audit existing trust/legal routes and create missing pages for About, Contact, Editorial Policy, and Corrections Policy.
- [ ] Update the footer to link the full trust-page set.
- [ ] Add sitewide `Organization` structured data.
- [ ] Enrich `apps/frontend/scripts/prerender.js` canonical match output with stronger summary and live-update text.
- [ ] Add or extend tests for live-update mapping, FAQ visibility/schema parity, and selective `LiveBlogPosting` gating.
- [ ] Validate sample canonical match pages via raw HTML inspection and structured-data inspection.

## Verification Notes

- Sample checks should prove visible content and schema parity on at least one real canonical match page.
- `LiveBlogPosting` should be considered a failed verification if it appears on a page without enough meaningful visible update cards.
- Canonical route strategy must remain `/cric-live/{slug}` throughout verification.
