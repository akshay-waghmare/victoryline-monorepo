# SEO Indexing Gate And Sitemap Decision

Date: 2026-07-09 IST
Spec: `044-cricket-decision-intent-acquisition`
Status: Release gate artifact

## Decision Right Now

`/match-intelligence/{slug}` should remain:

- `noindex,follow`
- out of all sitemaps
- internally discoverable from canonical match pages only

This is the correct decision today because the route is implemented, but the full SEO gate has not yet passed.

## Why It Stays Out Of Indexing Right Now

### Gate 1: Unique value

Partially passed.

What is now true:

- the page has a distinct prediction-intent layout
- it answers `what changed`, `why it changed`, and `what matters next`
- it is no longer only a generic shell

What is still weak:

- many explanation blocks still rely on fallback or derived frontend phrasing
- deeper contract-backed fields are not fully flowing from the model repo and explanation repo yet

### Gate 2: SSR and direct-refresh proof

Partially passed.

What is now true:

- SSR build passes
- the route has metadata and structured data handling

What is still missing:

- running local-stack proof on direct refresh
- sampled raw rendered HTML verification from the live local route

### Gate 3: Distinct search job proof

Conceptually passed, operationally not yet proved.

The route has a distinct search job:

- canonical `/cric-live/{slug}` = score, commentary, scorecard, match state
- `/match-intelligence/{slug}` = probability, explanation, turning point, next watchpoint

But it is not ready for indexing until that difference is proved on sampled rendered pages.

### Gate 4: Lifecycle parity

Not yet passed.

Still needs proof that:

- upcoming state shows prediction-intent value
- live state shows explanation and probability movement value
- completed state shows turning-point value
- metadata and visible content remain aligned through lifecycle changes on one stable URL

### Gate 5: Internal discovery and canonical safety

Partially passed.

What is now true:

- internal CTA from canonical match page exists

What still needs proof:

- the canonical score page remains primary for score-first jobs after rollout
- no accidental canonical confusion occurs between match page and intelligence page

## Current Sitemap Decision

### Keep out of sitemap now

Do not add `/match-intelligence/{slug}` URLs to:

- primary match sitemap
- any prediction sitemap
- any experiment sitemap

### Reason

Adding URLs before the route proves distinct, stable, and lifecycle-safe would create:

- thin-page risk
- canonical confusion
- wasted crawl budget
- weak query-to-surface mapping

## Exact Conditions To Move From Noindex To Indexable

All of these must be true:

1. Rendered HTML on sampled pages clearly contains:
   - probability or prediction answer
   - what changed
   - why it changed
   - what matters next

2. At least one upcoming, one live, and one completed page prove:
   - content is not a duplicate of the canonical page
   - metadata promise matches visible answer
   - route refresh and SSR are stable

3. The route is fed by stable public-safe contract fields instead of mostly fallback frontend wording.

4. Analytics prove that visitors use the intelligence route meaningfully:
   - `prediction_view`
   - `prediction_interaction`
   - `explanation_expand`

5. Search demand mapping is frozen for the first P1 clusters:
   - per-match prediction
   - live win probability
   - prediction update

## Recommended First Indexing Order

Once the gate passes:

1. keep only a small sampled cohort indexable first
2. monitor Search Console by landing page and query cluster
3. expand only after confirming impressions are prediction-intent aligned

Do not immediately index all intelligence URLs.

## First Cohort Recommendation

Only consider indexing when a sampled match page has:

- clear model availability
- fresh explanation content
- stable lifecycle state
- unique visible reasoning

Avoid indexing:

- delayed or low-data pages
- weak completed-match pages
- matches where prediction content is mostly fallback text

## Weekly SEO Gate Review

Review these every week:

- number of eligible intelligence pages
- number still blocked by weak explanation depth
- local/raw HTML proof samples
- query-to-event alignment
- decision:
  - keep noindex
  - index sampled cohort
  - expand cohort
  - stop and improve product depth first

## Current Recommendation

The right move now is:

- keep the route live but non-indexable
- verify it on the local stack
- complete deeper contract-backed data integration
- collect analytics evidence
- revisit sitemap and indexing only after that
