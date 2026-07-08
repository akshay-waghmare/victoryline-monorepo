# Tasks: Cricket Decision-Intent Acquisition

- [x] Read the user's planning note and extract the core acquisition model.
- [x] Map the note onto Crickzen's existing spec language and match-surface strategy.
- [x] Create `specs/044-cricket-decision-intent-acquisition/spec.md`.
- [x] Create `specs/044-cricket-decision-intent-acquisition/plan.md`.
- [x] Create `specs/044-cricket-decision-intent-acquisition/tasks.md`.

## Strategy Tasks

- [ ] Freeze the six core intent clusters: live score, prediction, turning point, live explanation, alerts, and API or widget.
- [ ] Map each intent cluster to a page family: hub, per-match surface, tool page, alert landing page, or B2B page.
- [ ] Define the full control-point journey: search intent -> live match attention -> prediction or decision intent -> relationship capture -> monetizable insight.
- [ ] Define where user intent becomes visible and what owned next step should follow from each important intent state.
- [ ] Confirm what remains canonical on `/cric-live/{slug}` versus what deserves a separate prediction or turning-point route.
- [ ] Define the above-the-fold ownership rules for live match pages so score and match state stay primary.
- [ ] Define the required explanation modules for canonical live pages, including probability movement and "what changed" summaries.
- [ ] Inventory the existing model outputs already available in Crickzen public data flows, including `team_odds`, `session_odds`, commentary, score state, and match metadata.
- [ ] Translate current model outputs into user-facing product language for the four core questions: what changed, why it changed, what matters next, and how to keep the user after the visit.
- [ ] Define the per-match prediction template and clarify how it differs from the canonical live page.
- [ ] Define the turning-point or loss-explanation template for completed matches.
- [ ] Define the live explanation and calculator-style utility surfaces.
- [ ] Define alert capture positioning and analytics-safe CTA language for Telegram, WhatsApp, email, or push flows.
- [ ] Define API, widget, and publisher-solution page requirements and their demo or enquiry CTAs.
- [ ] Define the internal-link flow from live pages to prediction pages, turning-point pages, alerts, and B2B surfaces where appropriate.
- [ ] Distinguish internal dashboards and operator tooling from user-facing Crickzen model surfaces.

## Foundation Tasks

- [ ] Create the keyword-to-intent-to-surface matrix with query examples, lifecycle, canonical owner, primary event, and owned next step.
- [ ] Apply the indexable-surface value gate to every proposed prediction, explanation, alert, and commercial page.
- [ ] Define the intent-ledger schema: privacy-safe visitor key, source, query cluster, landing page, match ID, lifecycle, event sequence, relationship outcome, commercial outcome, and failure reason.
- [ ] Write the event dictionary for `match_view`, `prediction_view`, `prediction_interaction`, `explanation_expand`, `alert_cta_click`, `relationship_join`, `repeat_match_visit`, `premium_interest`, `api_interest`, and `commercial_enquiry`.
- [ ] For every event, record trigger, required properties, deduplication, owner, analytics destination, and QA method.
- [ ] Audit one upcoming, one live, and one completed canonical match page against discovery, SSR, content, intent, and next-step requirements.
- [ ] Record the current analytics baseline before product changes: organic landing sessions, prediction engagement, relationship joins, repeat visits, and commercial enquiries.
- [ ] Confirm the public route name for match intelligence; default proposal is `/match-intelligence/{slug}`.
- [ ] Define the match slug and match-ID resolution contract shared by `/cric-live/{slug}` and match intelligence.
- [ ] Create the free, registered, and future-premium capability matrix; mark every initial release capability as free.

## Prediction Keyword Tasks

- [ ] Export current Search Console queries containing prediction-intent modifiers: `prediction`, `who will win`, `win probability`, `winning chances`, `prediction update`, `turning point`, and `loss reason`.
- [ ] Run competitor-keyword discovery against specific competitor match and prediction URLs, not broad homepages, and filter output using prediction-intent tokens.
- [ ] Enrich candidate phrases with Google suggestions where available and record source, observed wording, match lifecycle, and evidence date.
- [ ] Group phrases into P1 per-match prediction, live win probability, prediction updates; P2 today discovery, pre-match factors, live explanation, post-match explanation; and P3 relationship and commercial intent.
- [ ] Assign every approved cluster one owning URL, lifecycle, canonical policy, search job, primary event, and owned next step.
- [ ] Mark each candidate as `target now`, `observe`, `merge`, or `reject`; do not create URLs for unvalidated variants.
- [ ] Create metadata templates for upcoming prediction, live win probability, and completed turning-point states.
- [ ] Define required visible modules for every metadata promise so title and H1 claims cannot exceed rendered model value.
- [ ] Define internal anchor patterns from match cards, canonical match pages, prediction hubs, and completed reports without keyword stuffing.
- [ ] Add a weekly query-to-event report that joins Search Console landing-page performance with prediction engagement and relationship events.

## Phase 1 - Public Intelligence Foundation

- [ ] Extract a reusable model-data adapter from the existing cricket service and match feeds; do not depend on legacy dashboard-only state.
- [ ] Create the match-specific public intelligence route and lazy-loaded component surface.
- [ ] Add match identity, lifecycle status, model freshness, win probability, key-change explanation, and what-matters-next sections.
- [ ] Add loading, missing-data, stale-data, model-unavailable, postponed, and completed-match states.
- [ ] Add plain-language probability and informational disclaimers without betting or guaranteed-outcome claims.
- [ ] Add SSR title, H1, canonical policy, Open Graph metadata, and direct-refresh support.
- [ ] Add capability metadata for `free`, `registered`, and `premium`, with launch capabilities configured as `free`.
- [ ] Verify that the public surface contains no operator exposure, bet history, customer-account, or internal control UI.

## Phase 2 - Match Integration And Free Launch

- [ ] Add a visible `Match Intelligence` link on eligible canonical match pages.
- [ ] Define eligibility based on model availability and match lifecycle; hide or explain the CTA when intelligence is unavailable.
- [ ] Use lifecycle-specific CTA copy for upcoming prediction, live intelligence, and completed turning-point analysis.
- [ ] Preserve match context and provide return links to score, commentary, scorecard, lineups, and match details.
- [ ] Track `intelligence_cta_impression`, `intelligence_cta_click`, `prediction_view`, `prediction_interaction`, and `model_unavailable` with match and lifecycle properties.
- [ ] Verify keyboard access, screen-reader labels, mobile layout, direct navigation, refresh, and browser-back behavior.
- [ ] Launch the approved intelligence modules free without requiring login or payment.

## Phase 3 - SEO Expansion

- [ ] Create the lifecycle match-intelligence content template for what changed, why it changed, and what matters next.
- [ ] Verify SSR-visible links from canonical match pages and appropriate hubs.
- [ ] Compare rendered intelligence content with the canonical match page and document its distinct search job.
- [ ] Keep the intelligence route out of sitemaps and non-indexable until unique-value, SSR, canonical, and data-availability gates pass.
- [ ] After gates pass, add the intelligence route to the correct sitemap and monitor Search Console by query cluster and landing page.
- [ ] Add completed-match explanation and next-match links so the surface remains useful after the live window.
- [ ] Confirm that match score and state remain primary on `/cric-live/{slug}` after adding the intelligence CTA.
- [ ] Launch SEO targeting in order: per-match prediction, live win probability, then prediction update.
- [ ] Apply lifecycle-specific title, description, H1, intro, and anchor templates to sampled eligible matches.
- [ ] Verify that upcoming-to-live-to-completed lifecycle changes preserve one intelligence URL and correct metadata-to-content parity.
- [ ] Create a curated `today cricket match prediction` hub only when it can list enough eligible, fresh, model-backed matches.
- [ ] Keep toss, pitch, playing-XI, turning-point, alert, API, and widget clusters in observation until their required data or product surface exists.
- [ ] Review Search Console query variants after indexing and update cluster language from observed demand rather than assumed wording.
- [ ] Join organic landing performance to `prediction_view`, `prediction_interaction`, `relationship_join`, and `repeat_match_visit` before expanding a cluster.

## Phase 4 - Relationship Capture

- [ ] Select the first owned channel: Telegram, email, push, or account follow.
- [ ] Add a context-aware follow or alert CTA after meaningful intelligence engagement.
- [ ] Attribute `alert_cta_click`, `relationship_join`, and `repeat_match_visit` to the originating match and intelligence surface.
- [ ] Define consent, unsubscribe, privacy-safe identity, and failed-join behavior.
- [ ] Validate the complete match visit -> intelligence use -> relationship join -> repeat visit sequence.

## Phase 5 - Monetization Readiness

- [ ] Preserve headline probability, basic explanation, freshness, and score access as the free-value floor.
- [ ] Rank candidate registered features: alerts, follows, saved matches, and personalized history.
- [ ] Rank candidate premium features using measured engagement: probability history, scenario analysis, turning-point timeline, comparisons, and high-frequency alerts.
- [ ] Define server-side entitlement enforcement; do not rely on hidden frontend controls for paid data.
- [ ] Add `premium_interest`, `upgrade_view`, `upgrade_start`, and `upgrade_complete` contracts without activating a paywall.
- [ ] Define API and widget packages, rate limits, lead capture, and commercial-enquiry attribution.
- [ ] Write the pricing experiment hypothesis only after the free baseline and repeat-use cohorts are available.

## Phase 6 - Monetization Experiment

- [ ] Select one proven advanced capability for a limited entitlement experiment.
- [ ] Define free-user, registered-user, and premium-user acceptance tests.
- [ ] Monitor conversion, retention, abandonment, organic engagement, and relationship joins before expanding paid access.
- [ ] Record an improve, expand, stop, keep free, or monetize decision for every tested capability.

## 30-Day Rollout Tasks

- [ ] Week 1: complete Phase 0 contracts, baseline, route decision, and capability matrix.
- [ ] Week 1: audit the existing prediction dashboard and model feeds for reusable versus internal-only behavior.
- [ ] Week 1: create the match-page content template.
- [ ] Week 1: create the daily SEO monitoring checklist.
- [ ] Week 1: create the first keyword-to-intent ownership matrix and reject unsupported page ideas.
- [ ] Week 1: freeze the intent-event dictionary and intent-ledger contract.
- [ ] Week 1: produce the evidence-backed prediction keyword inventory and approve the three P1 clusters.
- [ ] Week 2: build the Phase 1 intelligence shell, shared data adapter, lifecycle states, and SSR metadata.
- [ ] Week 2: add current SEO priorities and live pages under review.
- [ ] Week 3: add the match-page link, free access, return navigation, and end-to-end analytics.
- [ ] Week 3: define the first intent-event and transaction-adjacent event taxonomy.
- [ ] Week 4: run SEO and UX verification, establish the first relationship-capture experiment, and decide whether the intelligence route is ready for indexing.
- [ ] Week 4: publish the first query-to-event review and decide improve, expand, merge, observe, or reject for each P1 cluster.
- [ ] Week 4: record improve, expand, consolidate, or stop decisions for every priority cluster and reviewed page.

## Verification Notes

- The strategy is only successful if it measures more than traffic.
- Verification should prove the intended loop:
  - search or discovery entry
  - match page visit
  - deeper prediction or explanation engagement
  - alert join or relationship capture
  - repeat visit
  - premium, API, or widget intent
- Any implementation should fail review if it creates thin keyword pages without real explanatory value.
- Any implementation should fail review if it confuses internal dashboards with the public Crickzen product surface.
- Any new indexable route should fail review if it lacks a distinct intent, canonical policy, SSR discovery path, unique value, and owned next step.
- Analytics verification must prove events in the configured destination with the required match, lifecycle, surface, and source properties; DOM clicks alone are not sufficient.
- Prediction SEO verification must prove that the target query, title, H1, visible answer, canonical, internal link, and primary intent event all refer to the same user job.
