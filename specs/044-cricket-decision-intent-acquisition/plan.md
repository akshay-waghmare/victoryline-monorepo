# Implementation Plan: Cricket Decision-Intent Acquisition

## Scope

Turn Crickzen's live-score SEO and acquisition model into a clearer decision-intent strategy built around:

- score-to-explanation conversion
- prediction and win-probability intent
- turning-point and post-match explanation
- alert and relationship capture
- API and widget monetization surfaces

This plan is strategy-first. It organizes the product and acquisition work into concrete surface families and rollout phases so implementation can stay aligned.

## Findings

- Crickzen should not depend on generic "live score" demand alone because incumbents are too strong there.
- The strongest wedge is not just live score, but live interpretation: why probability moved, where pressure changed, and where the match turned.
- Existing repo work already supports canonical match pages, lifecycle SEO, and freshness or explanation scaffolding, so the next gap is intent packaging and conversion flow.
- Alerts and B2B pages should not be treated as afterthoughts; they are part of the moat and monetization design.
- The current repo already has public-facing model inputs on canonical match pages, especially team-odds-style probability signals, session odds, commentary, score state, and match info, but they are not yet framed as a cohesive decision-intelligence product.
- The current Angular `dashboard` area is an internal monitoring or exposure-oriented surface, not the main public Crickzen prediction product; the implementation plan should center public match and intent surfaces instead.
- The immediate execution gap is operational: match-page template, daily SEO checklist, current pages under review, and the event model still need to exist as durable working artifacts.
- The user-facing prediction product should reuse the existing match-data and model pipeline, but it should not expose the legacy internal `/dashboard` UI or its operator-oriented language directly.
- The first public release should be free and reachable from each eligible match page. Its architecture must nevertheless separate free, registered, and future paid capabilities so monetization can be introduced without changing URLs or rebuilding the intelligence surface.

## Product Integration Decision

- Keep `/cric-live/{slug}` as the canonical score-first match page and primary SEO entry point.
- Add a visible `Match Intelligence` link or CTA for eligible matches. It opens a match-specific public intelligence surface inside Crickzen.
- Use a stable route such as `/match-intelligence/{slug}`. Final route naming is confirmed during Phase 1 before implementation.
- Reuse the existing match identity and model feeds that provide `team_odds`, `session_odds`, score state, commentary, and match metadata.
- Build a public presentation layer for win probability, model freshness, key changes, pressure or session signals, and what matters next. Do not embed or rebrand the internal exposure dashboard unchanged.
- Launch all approved intelligence modules free. Add capability flags and entitlement metadata from the start, but do not show a paywall in the initial release.
- Make the intelligence route self-canonical and indexable only after it passes the unique-value and SSR gates. Until then, keep it out of sitemaps and use the canonical match page as the search landing surface.
- Preserve the same intelligence URL when monetization begins; access rules change by module or depth, not by replacing the route.

## Prediction SEO Keyword Plan

The phrases below are candidate intent patterns, not final volume claims. They must be validated against Search Console, Google suggestions, and the repo's competitor-keyword discovery output before production metadata is frozen.

| Priority | Intent cluster | Candidate query patterns | Primary landing surface | Required answer |
|---|---|---|---|---|
| P1 | Per-match prediction | `{team a} vs {team b} prediction`, `{team a} vs {team b} match prediction`, `who will win {team a} vs {team b}` | `/match-intelligence/{slug}` when unique-value gates pass; otherwise prediction module on `/cric-live/{slug}` | Current model direction, probability context, freshness, and reasons |
| P1 | Live win probability | `{team a} vs {team b} win probability`, `live win probability`, `winning chances today match` | Live intelligence surface linked from the canonical match page | Current probability, movement, match phase, and next decisive factor |
| P1 | Prediction updates | `{team a} vs {team b} prediction update`, `live prediction update`, `today match prediction update` | Live intelligence surface plus relationship CTA | What changed since the previous model state and why |
| P2 | Today prediction discovery | `today cricket match prediction`, `today match prediction`, `cricket predictions today` | Curated prediction hub listing eligible matches | Today's eligible matches, freshness, and links to match-specific intelligence |
| P2 | Pre-match factors | `{team a} vs {team b} toss prediction`, `pitch report and prediction`, `playing 11 prediction` | Canonical match preview or intelligence surface, depending on available evidence | Toss, venue, conditions, lineup context, and uncertainty |
| P2 | Live explanation | `why win probability changed`, `who is ahead in match`, `required run rate prediction` | Match intelligence explanation module or a genuine reusable tool | Triggering event, pressure change, and what matters next |
| P2 | Post-match explanation | `{team} loss reason`, `match turning point`, `where match was lost` | Completed intelligence state or match report | Turning point, probability swing, and evidence from match state |
| P3 | Relationship intent | `cricket prediction alerts`, `live win probability alerts`, `match prediction updates` | Alert or follow capture surface | Channel, frequency, value, consent, and unsubscribe expectation |
| P3 | Commercial intent | `cricket prediction API`, `win probability API`, `cricket prediction widget` | Dedicated API or widget page | Coverage, freshness, delivery format, reliability, and enquiry path |

### Keyword Ownership Rules

- One primary keyword cluster owns each indexable URL; closely related variants are covered naturally on that surface rather than creating separate URLs.
- Team names, tournament, match format, and date are dynamic modifiers, not reasons to create parallel prediction routes.
- `Prediction`, `win probability`, and `prediction update` may share one match-intelligence URL when the page visibly satisfies all three; metadata chooses the strongest lifecycle-appropriate primary intent.
- The title and H1 must describe rendered value. They must not promise a prediction when model data is absent or stale.
- The canonical match page continues to own live score, scorecard, commentary, lineups, and broad match status intent.
- The intelligence surface owns model direction, probability movement, prediction updates, and explanation intent only after it contains unique SSR-visible value.
- The today-prediction hub is curated from eligible model-backed matches; it must not list empty or unsupported fixtures merely to target a keyword.

### Lifecycle Metadata Strategy

- **Upcoming**: lead with `{Team A} vs {Team B} Prediction` and support with model preview, venue, toss or lineup context when available.
- **Live**: lead with `{Team A} vs {Team B} Live Win Probability` and show freshness plus the latest prediction update.
- **Completed**: lead with `{Team A} vs {Team B} Turning Point and Prediction Review` and preserve the model movement or explanation record.
- Metadata changes with lifecycle on the same stable URL. Canonical URL and match identity do not change.
- Titles, descriptions, H1s, intro copy, anchor text, and structured data must remain consistent with the visible lifecycle state.

### SEO Measurement Loop

For every priority cluster, track:

- target query pattern and owning URL
- Search Console impressions, clicks, CTR, average position, and discovered query variants
- indexability, canonical selection, sitemap status, and SSR discovery source
- intelligence CTA clicks, prediction views, model interactions, relationship joins, and repeat visits
- decision: improve snippet, improve content, strengthen discovery, expand cluster, consolidate overlap, keep non-indexable, or stop

Traffic alone does not validate a prediction cluster. A successful cluster produces meaningful intelligence engagement or relationship capture.

## Phased Delivery

### Phase 0 - Contract And Baseline

Goal: remove ambiguity before product implementation.

Deliverables:

- model-output inventory and freshness rules
- match-ID and slug resolution contract
- keyword-to-intent ownership matrix
- event dictionary and intent-ledger schema
- baseline for organic match visits, intelligence engagement, repeat visits, and relationship joins
- free-versus-future-premium capability matrix
- prediction keyword inventory grouped by lifecycle and intent, with an owning URL decision for every P1 cluster

Exit gate: one upcoming, one live, and one completed match can be traced from source data through the canonical page, with analytics and fallback behavior defined.

### Phase 1 - Public Match Intelligence Foundation

Goal: create the Crickzen-native prediction dashboard as a match-specific product surface.

Deliverables:

- stable `/match-intelligence/{slug}` route and component shell
- shared data adapter using the existing cricket service rather than dashboard-only state
- match header, lifecycle state, model timestamp, win probability, explanation, and unavailable-data states
- clear probability and informational disclaimers
- SSR-safe title, H1, canonical policy, and social metadata
- capability configuration such as `free`, `registered`, and `premium`, with every launch module configured as `free`

Exit gate: the route works directly and after refresh for sampled match states, never exposes operator or betting-account controls, and handles stale or missing model data honestly.

### Phase 2 - Match-Page Entry And Free Launch

Goal: turn match attention into measurable prediction intent.

Deliverables:

- `Match Intelligence` link on eligible `/cric-live/{slug}` pages
- context-aware CTA copy for upcoming, live, and completed states
- return path from intelligence to score, commentary, scorecard, and lineups
- instrumentation for CTA impressions, clicks, intelligence views, interactions, and data-unavailable outcomes
- responsive and accessibility verification

Exit gate: a user can move match page -> intelligence -> match detail without losing match context, and the complete event sequence is visible in analytics.

### Phase 3 - SEO And Intent Expansion

Goal: earn prediction and explanation search demand without creating duplicate or thin pages.

Deliverables:

- lifecycle-specific content template answering what changed, why, and what matters next
- SSR discovery links from eligible match and hub pages
- indexability decision for the intelligence route based on unique rendered value
- sitemap inclusion only after the route passes the SEO gate
- Search Console monitoring by match, query cluster, and landing surface
- completed-match explanation and next-match links that preserve long-tail usefulness
- lifecycle-specific prediction titles, H1s, descriptions, intro copy, and internal-link anchors
- today-prediction hub only after enough eligible match-intelligence surfaces exist to make it useful
- query-to-event reporting that separates prediction discovery from generic score traffic

Exit gate: sampled raw SSR HTML proves useful unique content, correct canonical behavior, discovery, and no conflict with the score-first match page.

The first SEO release is limited to P1 clusters. P2 and P3 expansion starts only after P1 pages are indexed, receiving relevant impressions, and producing prediction engagement.

### Phase 4 - Relationship And Retention

Goal: convert free intelligence use into an owned repeat relationship.

Deliverables:

- match or team alert CTA after meaningful intelligence engagement
- Telegram, email, push, or account-follow flow selected by implementation readiness
- saved preference or privacy-safe relationship identifier
- repeat-visit and relationship-join attribution in the intent ledger

Exit gate: intelligence engagement can be connected to an owned-channel join and a later return visit.

### Phase 5 - Monetization Readiness

Goal: prepare monetization without reducing the value of the free acquisition layer.

Deliverables:

- measured free-value baseline and candidate premium features
- entitlement service boundary and server-side enforcement design
- free, registered, and premium module policy
- upgrade-interest events and non-blocking premium preview treatment
- API or widget packaging for suitable model outputs
- pricing experiment plan based on observed intent rather than assumed willingness to pay

Initial monetization hypothesis:

- Keep live score, headline win probability, basic explanation, and model freshness free.
- Candidate registered features: alerts, follows, saved matches, and personalized history.
- Candidate premium features: deeper probability history, advanced scenario analysis, richer turning-point timelines, comparison tools, and high-frequency alerts.
- Candidate B2B products: prediction or score API, embeddable intelligence widget, and publisher feeds.

Exit gate: payment can be added through entitlements without changing canonical URLs, breaking free SEO value, or moving model enforcement entirely into the browser.

### Phase 6 - Monetization Experiment And Optimization

Goal: introduce paid value only after free usage demonstrates repeat intent.

Deliverables:

- premium-interest cohort and conversion hypothesis
- limited upgrade experiment on one proven advanced capability
- retention, conversion, churn, and SEO-impact guardrails
- improve, expand, consolidate, stop, or monetize decision for each capability

Exit gate: monetization decisions are supported by engagement and retention evidence, while the free match-intelligence entry remains useful on its own.

## Workstreams

1. **Spec assets**
   - Add `spec.md`, `plan.md`, and `tasks.md` for Spec 044.

2. **Intent architecture**
   - Freeze the core intent families:
     - generic live score
     - prediction
     - turning point
     - live explanation
     - alerts or community
     - API or widget
   - Decide which surfaces should be hubs, match pages, tools, or commercial landing pages.
   - Define the explicit journey from search intent to live attention to decision intent to relationship capture to transaction.
   - Mark where intent becomes visible and where it should route next.

3. **Match-surface framing**
   - Keep `/cric-live/{slug}` score-first and canonical.
   - Strengthen explanation and probability movement modules.
   - Define how prediction pages differ from canonical live pages.
   - Translate existing model outputs into user-facing language:
     - what changed
     - why it changed
     - what matters next

4. **Turning-point and analysis surfaces**
   - Define post-match explanation templates.
   - Reuse real match-state data for "why the match changed" narratives.

5. **Alert capture**
   - Define analytics-safe CTA language.
   - Decide where to place alert capture inside hubs and match pages.
   - Keep alerts framed as intelligence, probability, and turning-point updates.

6. **B2B monetization**
   - Define API, widget, and publisher-solution pages.
   - Clarify demo or enquiry flows.

7. **Measurement loop**
   - Define the funnel from page visit to prediction interaction to alert join to repeat visit to B2B or premium intent.
   - Define Search Console and content-review checkpoints.
   - Define the intent events and transaction-adjacent events that make this measurable.
   - Define the intent-ledger schema joining source, query cluster, landing page, match lifecycle, event sequence, relationship outcome, and commercial outcome.

8. **Lifecycle SEO operations**
   - Build the keyword-to-intent-to-page ownership matrix before creating new URLs.
   - Use one canonical match URL across upcoming, live, and completed states.
   - Verify SSR discovery links, sitemap freshness, indexability, metadata, and visible intent satisfaction for sampled pages.
   - Add an improve, expand, consolidate, or stop decision to the weekly review.

9. **Operational bridge artifacts**
   - Create the match-page content template.
   - Create the daily SEO monitoring checklist.
   - Record current SEO priorities and live pages under review.
   - Publish the first event taxonomy draft.

10. **30-day rollout**
   - Sequence the first month into page creation, distribution, and measurement checkpoints.

## Proposed File Targets

- `specs/044-cricket-decision-intent-acquisition/spec.md`
- `specs/044-cricket-decision-intent-acquisition/plan.md`
- `specs/044-cricket-decision-intent-acquisition/tasks.md`
- Follow-on implementation likely touches:
  - `apps/frontend/src/app/cricket-odds/*`
  - `apps/frontend/src/app/features/seo-hubs/*`
  - `apps/frontend/src/app/seo/*`
  - alert CTA surfaces
  - publisher/API/widget landing pages
  - durable operator docs or checklists for SEO review and event tracking

## Constraints

- Keep `/cric-live/{slug}` canonical and central.
- Do not let SEO support modules retake above-the-fold ownership from score and current match state.
- Avoid policy-risky acquisition language.
- Avoid thin page creation for keyword volume alone.
- Keep consumer and B2B surfaces distinct enough that each one serves a clear job.

## Suggested Delivery Order

1. Freeze the strategy and acceptance rules in Spec 044.
2. Create the keyword-to-intent-to-surface ownership matrix and value gate.
3. Freeze the analytics event contract and intent-ledger fields.
4. Inventory existing model outputs and audit one upcoming, one live, and one completed match journey.
5. Create the match-page content template, SEO checklist, and current-priority board.
6. Build the public match-intelligence route and shared model-data adapter.
7. Link eligible canonical match pages to the free intelligence surface and validate analytics end to end.
8. Pass the SSR and unique-value gates before making the intelligence route indexable or adding it to sitemaps.
9. Add the first relationship-capture flow and validate attribution through a repeat visit.
10. Introduce entitlement seams and identify premium candidates from measured behavior.
11. Define API and widget packaging where commercial intent evidence supports it.
12. Run the weekly improve, expand, consolidate, stop, or monetize review.

## Delivery Gates

- **Architecture gate**: no new indexable route without an owning intent cluster, canonical policy, distinct job, and internal-link source.
- **Data gate**: no model-backed module without freshness, context, honest probability language, and a fallback state.
- **Analytics gate**: no CTA or intent surface is complete until its event trigger and required properties are validated.
- **SEO gate**: sampled raw SSR HTML must prove discovery links, canonical, title, H1, indexability, and useful visible content.
- **Outcome gate**: weekly reporting must connect search demand to deeper engagement and owned outcomes, not traffic alone.
- **Free-launch gate**: all approved launch intelligence is available without payment or account creation, and no placeholder premium treatment obstructs the core experience.
- **Monetization gate**: paid access is not introduced until a capability has repeat usage evidence, server-enforceable entitlement rules, and a free-value floor that protects SEO and user trust.
