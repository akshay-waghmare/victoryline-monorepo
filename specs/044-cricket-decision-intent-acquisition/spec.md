# Feature Specification: Cricket Decision-Intent Acquisition

**Feature Branch**: `044-cricket-decision-intent-acquisition`  
**Created**: 2026-07-08  
**Status**: Draft  
**Input**: User request: "this is what I am planning right now create a spec for this"

## Summary

Crickzen should not try to win only by being another generic live-score destination. The stronger moat is to capture live-match users, explain why the match state changed, move them toward prediction and alerts, and then monetize through repeat audience, premium utilities, API, and widget surfaces.

This spec defines Crickzen as a cricket decision-intent platform:

- live score is the entry point
- probability movement and turning points are the differentiator
- alerts and community capture create repeat behavior
- API and widget surfaces create stronger monetization than ads alone

The goal is to align SEO, product surfaces, social hooks, and acquisition funnels around that model instead of treating them as separate efforts.

The intended product flow is:

- search intent
- live match attention
- prediction or decision intent
- relationship capture
- monetizable insight

The guiding product questions are:

- What changed?
- Why did it change?
- What matters next?
- How do we keep the user after this visit?

## Current Evidence

- Crickzen already owns strong match-level surfaces around `/cric-live/{slug}` and related lifecycle support pages.
- The repo already contains work for canonical match coverage, match freshness support, query-surface authority, and above-the-fold SEO restraint.
- Current SEO work is strong on crawlability and lifecycle coverage, but weaker on explicitly packaging prediction intent, turning-point intent, and alert capture as first-class acquisition surfaces.
- The site already has the raw ingredients for score, commentary, match state, and SSR support, which means the next step is productized acquisition structure rather than generic keyword expansion.
- The repo already exposes live match model outputs such as `team_odds`, `session_odds`, commentary, score, and match-info data on canonical match pages, but those outputs are still under-packaged as public decision-intelligence surfaces.
- The implementation is now clearly split across three repos:
  - `victoryline-monorepo` owns the public Crickzen surface, canonical match pages, `/match-intelligence/{slug}`, SSR, SEO, and intent capture
  - `machine_learning_bbl_009-odi-mc-predictor` owns the model and dashboard brain, including probability generation, public-safe payload boundaries, and premium-vs-public separation work
  - `trueodds-video-studio` already contains reusable intelligence-packaging logic such as venue intelligence, player-role intelligence, probability reasons, match-intelligence cards, and prediction proof loops
- Therefore, Spec 044 is not only a frontend rollout. It also needs a shared payload contract so the public Crickzen product can consume model outputs and explanation modules without leaking dashboard-only or reel-only internals.

## Strategic Gaps To Close

- **Generic score utility gap**: live-score behavior alone is too easy to commoditize; Crickzen must compete on interpretation rather than pure score display.
- **Intent visibility gap**: the system still needs a clear map for where user intent becomes visible and how Crickzen keeps that intent from leaking away.
- **Relationship capture gap**: Telegram, subscription, and alert surfaces are strategically important but not yet operationalized as part of the main product loop.
- **Transaction gap**: premium, API, widget, or partner workflows are recognized as downstream control points but not yet defined as tracked product paths.
- **Feedback-loop gap**: outcome learning is part of the moat, but it is not yet represented as a measured event model that improves future prediction, content, and monetization decisions.
- **Execution gap**: the operational bridge is incomplete because the match-page content template, daily SEO monitoring checklist, current SEO priorities, and intent-event model are still missing.

## Product Shape

Crickzen should be shaped as an intent-to-transaction system around cricket decision intent.

Control points:

- SEO pages capture search intent.
- Live match pages capture match attention.
- Prediction surfaces capture stronger decision intent.
- Telegram, subscription, or alert surfaces capture repeat relationship.
- Premium, API, widget, or partner workflows capture transaction.
- Outcome data improves future prediction, content, and monetization decisions.

This spec therefore treats public product work, relationship capture, and measurement as one continuous loop rather than separate SEO, product, and monetization tracks.

### Repo Architecture

The current implementation should be treated as a three-layer system:

- `public product surface -> model brain -> intelligence packaging layer`

Repo responsibilities:

- `victoryline-monorepo`: public Crickzen product surface, SEO, SSR, canonical match journeys, `/match-intelligence/{slug}`, and product-event capture
- `machine_learning_bbl_009-odi-mc-predictor`: prediction model outputs, dashboard-private logic, public-lite API candidates, freshness and capability boundaries, and entitlement-aware data policy
- `trueodds-video-studio`: reusable explanation and packaging layer, including plain-language reasoning, venue and player-role intelligence, probability swing summaries, intelligence-card structures, and prediction tracking or proof loops

Spec 044 should therefore define not just public pages, but the contract between these layers.

## User Scenarios & Testing

### User Story 1 - Prediction Intent Lands On Dedicated Surfaces (Priority: P1)

As a user searching for today's match prediction, win probability, or who will win, I want to land on pages built around decision-making rather than thin score-only pages.

**Why this priority**: This is the clearest differentiation wedge against larger score incumbents.

**Independent Test**: Open a prediction hub and a per-match prediction page and verify they clearly explain outcome direction, probability context, and the next action for the user.

**Acceptance Scenarios**:

1. **Given** a user searches for a prediction-style query, **When** they land on Crickzen, **Then** they reach a page whose primary framing is prediction, probability, and match direction rather than generic score copy.
2. **Given** a prediction page renders, **When** a user scans the first viewport, **Then** they can identify the current probability view and the next best action such as live page, alert signup, or deeper analysis.
3. **Given** a match has a canonical live page and a prediction surface, **When** both are indexed, **Then** the pages have distinct intent and do not duplicate each other's primary purpose.

---

### User Story 2 - Live Match Users Get Explanation, Not Just Score (Priority: P1)

As a user coming for live score, I want Crickzen to explain why the match state changed so the product feels more useful than a normal scoreboard.

**Why this priority**: The product moat depends on converting score-check intent into interpretation and repeat usage.

**Independent Test**: Open a sample live match page and verify it contains live score, win probability, and a clear explanation block for probability movement or turning points.

**Acceptance Scenarios**:

1. **Given** a live match page loads, **When** the user reads above the fold, **Then** live score remains primary and a probability or "what changed" layer is visible without displacing the core match state.
2. **Given** probability shifts during a match, **When** explanatory content is rendered, **Then** it ties the shift to real match events such as wickets, required run rate, phase pressure, or momentum swing.
3. **Given** explanatory data is weak or missing, **When** the page renders, **Then** Crickzen degrades honestly instead of inventing thin explanation text.

---

### User Story 3 - Turning-Point And Post-Match Explanation Earns Discussion Traffic (Priority: P2)

As a user searching after a big match to understand where the game turned, I want a turning-point or loss-explanation page that gives a credible breakdown.

**Why this priority**: This is a differentiated post-match traffic and sharing surface, especially around emotionally debated matches.

**Independent Test**: Open a sample turning-point or result-analysis page and verify it clearly explains match swings, not just the final score.

**Acceptance Scenarios**:

1. **Given** a match has completed, **When** a turning-point page is available, **Then** it highlights key phases or events that changed the result.
2. **Given** a user searches "why X lost today", **When** they land on Crickzen, **Then** the page answers with event-backed reasoning rather than generic recap text.
3. **Given** a turning-point page exists, **When** related navigation is inspected, **Then** it links back to the canonical live page, prediction history, and relevant alert or next-match surfaces.

---

### User Story 4 - Alert Capture Builds Relationship Instead Of One-Off Traffic (Priority: P2)

As a user interested in live probability or turning-point updates, I want a clear way to subscribe to analytics alerts on Telegram, WhatsApp, email, or similar channels.

**Why this priority**: Repeat audience and relationship capture are central to the moat and monetization model.

**Independent Test**: Open an alerts landing page or live match CTA flow and verify that the messaging positions the offer as analytics alerts, not gambling claims.

**Acceptance Scenarios**:

1. **Given** a user shows prediction or live-analysis intent, **When** they encounter alert CTAs, **Then** the messaging uses safe analytics language such as win probability or turning-point alerts.
2. **Given** an alert capture page exists, **When** it is inspected, **Then** it explains what the user will receive and why it is useful during and between matches.
3. **Given** paid or organic acquisition sends users to alert surfaces, **When** policy-sensitive copy is reviewed, **Then** it avoids betting-tip, guaranteed-win, or sure-shot language.

---

### User Story 5 - API And Widget Pages Monetize B2B Demand (Priority: P3)

As a publisher, creator, or sports site operator, I want dedicated pages that explain Crickzen's score, probability, analytics, API, or widget offering.

**Why this priority**: B2B surfaces can monetize better than ad-only traffic and extend Crickzen beyond consumer pages.

**Independent Test**: Open a sample API or widget page and verify it is written for publisher or partner intent rather than consumer score intent.

**Acceptance Scenarios**:

1. **Given** a B2B-intent query lands on Crickzen, **When** the page renders, **Then** it clearly presents the API, widget, or publisher value proposition.
2. **Given** a widget or API page exists, **When** the page is reviewed, **Then** its CTA is oriented to demo, enquiry, or integration rather than match browsing.
3. **Given** B2B pages are added, **When** internal links are planned, **Then** they do not dilute the primary consumer match experience above the fold.

## Edge Cases

- Low-data or low-interest matches may support score and probability but not strong turning-point explanation.
- Some prediction queries may overlap heavily with canonical live pages; route purpose and metadata must stay distinct.
- Alert capture must remain policy-safe across SEO, social, and paid landing pages.
- Thin auto-generated prediction or turning-point pages must be avoided even if the keyword opportunity is attractive.
- B2B/API/widget pages should not hijack consumer match pages or clutter live-match above-the-fold space.
- Tournament-specific demand may spike faster than the site can build deep coverage, so hub pages and prioritization rules are needed.

## Requirements

### Functional Requirements

- **FR-001**: Crickzen MUST define decision-intent as a first-class acquisition model spanning SEO, social entry, alerts, and B2B surfaces.
- **FR-002**: The site MUST support dedicated hub pages for at least today prediction, live win probability, alerts, and widget or API intent.
- **FR-003**: The site MUST support distinct per-match surfaces for canonical live coverage, per-match prediction intent, and turning-point or post-match explanation when justified.
- **FR-004**: Canonical `/cric-live/{slug}` pages MUST remain the primary live match entity while also carrying score-first explanation layers such as probability movement or "what changed" summaries.
- **FR-005**: Prediction surfaces MUST explain likely outcome direction using real match context such as toss, venue, phase pressure, projected totals, required run rate, or model movement.
- **FR-006**: Turning-point surfaces MUST explain where a match shifted using event-backed narrative rather than generic recap copy.
- **FR-007**: Alert landing pages and CTAs MUST use safe analytics language such as win probability alerts, turning-point alerts, live analytics, or match intelligence.
- **FR-008**: Public acquisition copy MUST avoid restricted gambling-style language such as guaranteed winning tips, sure-shot profit, bet and earn, or fixed match claims.
- **FR-009**: API, widget, or publisher-solution pages MUST be written for B2B intent and include a distinct commercial CTA such as request demo or enquiry.
- **FR-010**: The information architecture MUST distinguish these intent families: generic live score, prediction, turning point, live explanation, alerts or community, and API or widget.
- **FR-011**: The spec MUST define which queries and surfaces should map to hubs versus per-match pages.
- **FR-012**: The spec MUST define a measurement loop connecting pageviews, prediction-tab or equivalent deeper engagement, alert joins, repeat visits, and B2B or premium intent.
- **FR-013**: Search Console and equivalent performance reporting MUST be used to decide which query clusters deserve deeper page expansion.
- **FR-014**: Social and paid acquisition content MUST be designed to create curiosity and route users back to Crickzen's owned surfaces rather than trying to fully explain everything off-platform.
- **FR-015**: For user-facing page changes, the spec MUST state what content owns the above-the-fold area and why.
- **FR-016**: Match pages MUST keep score and current match state primary in the first viewport; explanatory, support, or SEO-heavy modules MUST not retake the hero position.
- **FR-017**: Prediction, turning-point, and alert surfaces MUST be built as people-first pages with real explanations, examples, and product utility rather than thin keyword capture pages.
- **FR-018**: The first execution phase MUST identify a 30-day rollout slice with weekly deliverables and measurable checkpoints.
- **FR-019**: The operating model MUST explicitly map the user journey from search intent to live match attention to prediction or decision intent to relationship capture to monetizable insight.
- **FR-020**: Canonical match pages MUST answer the first three product questions in some combination: what changed, why it changed, and what matters next.
- **FR-021**: The operating plan MUST define where the fourth product question is handled: how Crickzen keeps the user after the visit through alerts, subscriptions, or other owned channels.
- **FR-022**: The spec MUST document the currently available public model outputs already present in the product stack, including team win-probability style data, session-odds style data, score state, commentary, and match context.
- **FR-023**: The plan MUST distinguish internal operator or monitoring dashboards from user-facing Crickzen decision-intelligence surfaces so implementation does not confuse observability tools with product pages.
- **FR-024**: The first operational rollout MUST produce these bridge artifacts: a match-page content template, a daily SEO monitoring checklist, current SEO priorities with live pages under review, and a defined intent plus transaction-adjacent event model.
- **FR-025**: The measurement model MUST define both intent events and transaction-adjacent events so Crickzen can learn which search and match journeys produce relationship capture or commercial outcomes.
- **FR-026**: Every prioritized keyword cluster MUST map to one primary search intent, one owning page family, one canonical URL policy, one primary intent event, and one owned next step.
- **FR-027**: SEO planning MUST distinguish pre-match, live, and completed-match demand, while preserving one canonical `/cric-live/{slug}` match URL across the lifecycle unless a genuinely different reusable intent requires a separate hub or tool.
- **FR-028**: New indexable surfaces MUST pass a value gate: unique intent, sufficient first-party data or explanation, a distinct job from the canonical match page, and an owned next step. Keyword variation alone MUST NOT justify a page.
- **FR-029**: The intent ledger MUST preserve acquisition source, query or cluster where available, landing page, match and lifecycle context, intent events, relationship outcome, commercial outcome, and rejection or failure reason using privacy-safe identifiers.
- **FR-030**: The initial analytics contract MUST include stable events for `match_view`, `prediction_view`, `prediction_interaction`, `explanation_expand`, `alert_cta_click`, `relationship_join`, `repeat_match_visit`, `premium_interest`, `api_interest`, and `commercial_enquiry`.
- **FR-031**: Each event MUST define its trigger, required properties, deduplication rule, owner, destination, and validation method before implementation is considered complete.
- **FR-032**: SEO operations MUST use Search Console query and page evidence, lifecycle discovery checks, SSR/indexability checks, engagement events, and relationship outcomes to decide whether to improve, expand, consolidate, or stop a surface.
- **FR-033**: Model-backed claims MUST show freshness and match context, distinguish model probability from fact, and avoid unsupported certainty.
- **FR-034**: Spec 044 MUST explicitly document the three-repo implementation split between the public Crickzen surface, the model/dashboard brain, and the intelligence-packaging layer.
- **FR-035**: Before deeper prediction SEO expansion, the team MUST define a shared public intelligence payload contract covering probability, freshness, what changed, why it changed, what matters next, and any safe venue or player factors.
- **FR-036**: The public intelligence payload MUST distinguish model-layer fields from explanation-layer fields so Crickzen can reuse them across web pages, alerts, content, and future API or widget surfaces.
- **FR-037**: Reel-specific or operator-specific fields MUST NOT leak into the public match-intelligence surface unless they are deliberately promoted into the shared public contract.

## Keyword-To-Intent Operating Map

| Intent family | Example query pattern | Owning surface | Primary intent event | Owned next step |
|---|---|---|---|---|
| Match status | `{team a} vs {team b} live score`, `scorecard`, `commentary`, `lineups` | Canonical `/cric-live/{slug}` with SSR-visible intent sections | `match_view`, then section-specific engagement | Prediction or explanation interaction |
| Pre-match decision | `{team a} vs {team b} prediction`, `win probability`, `who will win` | Canonical match page prediction module; a hub only when it serves reusable cross-match demand | `prediction_view` or `prediction_interaction` | Match alert or follow relationship |
| Live explanation | `why probability changed`, `required run rate`, `who is ahead` | Canonical live-page explanation module or a genuine calculator/tool | `explanation_expand` | Turning-point alert or repeat visit |
| Post-match explanation | `where match was lost`, `turning point`, `why team lost` | Completed state of the canonical match page plus reusable analysis hubs | `explanation_expand` | Next-match or team follow |
| Relationship | `cricket alerts`, `prediction updates` | Alert landing or in-product capture flow | `alert_cta_click`, then `relationship_join` | Repeat owned-channel visit |
| Commercial | `cricket API`, `live score widget`, `prediction API` | Dedicated API, widget, or publisher landing page | `api_interest` or `commercial_enquiry` | Qualified demo or partner workflow |

This map is a starting contract, not permission to manufacture every example as a separate URL. Search Console and product evidence decide which surfaces deserve expansion.

## SEO Operating Model

1. **Discover demand**: combine Search Console queries, competitor-specific match-page research, internal search or navigation behavior, and model capabilities into a prioritized keyword backlog.
2. **Assign ownership**: map each cluster to the canonical match page, an existing hub, a reusable tool, a relationship page, or a commercial page; reject clusters with no distinct user job.
3. **Publish by lifecycle**: expose upcoming matches early through SSR hub links and fresh sitemaps, update the same canonical page during live play, and retain useful result and explanation content after completion.
4. **Satisfy intent**: keep score and state first, then answer what changed, why it changed, and what matters next using current model and match data.
5. **Capture the next step**: give each surface one context-appropriate deeper action and one owned relationship action without crowding the first viewport.
6. **Measure outcomes**: connect query cluster and landing page to engagement, relationship, repeat-use, and commercial events in the intent ledger.
7. **Review and decide**: improve surfaces with impressions but weak clicks, strengthen pages with clicks but weak intent events, consolidate duplication, and stop pages that cannot provide unique value.

### Key Entities

- **Intent Cluster**: A search or acquisition theme such as live score, prediction, turning point, live explanation, alerts, or B2B API or widget demand.
- **Intent Surface**: A hub page, match page, tool page, landing page, or commercial page built to satisfy a specific intent cluster.
- **Decision-Intent Loop**: The acquisition sequence from live or prediction discovery to explanation, alert capture, repeat use, and monetization.
- **Explanation Module**: A visible page section that explains probability movement, pressure, turning points, or match-direction changes.
- **Alert Capture Surface**: A landing page or CTA flow that converts match or prediction interest into Telegram, WhatsApp, email, or push-style relationship channels.
- **B2B Monetization Surface**: A page for API, widget, or publisher solutions with lead capture or demo intent.
- **Model Surface**: A user-facing Crickzen page or module that translates existing model outputs into public product value such as win probability, session pressure, turning-point explanation, or what-matters-next guidance.
- **Intent Event Model**: The event taxonomy that marks where user intent becomes visible, deepens, converts into repeat relationship, or approaches a transaction.
- **Outcome Loop**: The measurement and review process that uses engagement, relationship, and commercial outcomes to improve future prediction, content, and monetization decisions.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Crickzen has a documented page framework covering at least these surfaces: canonical live page, prediction hub, live probability hub, alert capture page, and widget or API page.
- **SC-002**: For a sampled match page, a user can identify live score, probability direction, and explanatory context from the first viewport without needing to open a secondary tab.
- **SC-003**: Prediction and turning-point surfaces have distinct intent framing and do not read like duplicate copies of canonical live pages.
- **SC-004**: Alert capture surfaces use analytics-safe copy and avoid restricted gambling-style wording.
- **SC-005**: The execution plan defines a measurable funnel from match page visit to deeper engagement to alert join to repeat visit or commercial enquiry.
- **SC-006**: The first 30-day rollout plan identifies weekly page, content, promotion, and measurement milestones.
- **SC-007**: The information architecture keeps score-first live UX intact while still adding stronger explanation and acquisition layers.
- **SC-UI-001**: On changed match surfaces, users can identify the current match state and the reason Crickzen is useful beyond score from the first viewport.
- **SC-008**: The operating spec clearly documents where intent becomes visible inside Crickzen and how each important intent state can be routed into an owned next step rather than leaking away.
- **SC-009**: The first operational execution slice produces a usable match-page content template, daily SEO monitoring checklist, current SEO priority board, and intent-event model.

## Out Of Scope

- Building betting or gaming claims into public positioning.
- Replacing canonical live pages with generic prediction clones.
- Creating thin pages for every keyword variation without enough real explanatory value.
- Solving unrelated non-Crickzen product areas.
- Detailed ad-platform setup, budgets, or creative production workflows beyond the acquisition structure and surface requirements.

## Implementation Plan

### Phase 1 - Intent Architecture

Goal: define the acquisition model and map intent clusters to page families.

Work:

1. Freeze the six core intent families.
2. Map each family to hub, per-match, tool, alert, or B2B surfaces.
3. Prevent overlap between canonical live pages and prediction or turning-point pages.
4. Define the search intent -> live attention -> prediction -> relationship -> transaction loop explicitly.

Exit criteria:

- The team can explain which surface serves which query and why.
- The team can explain where intent becomes visible and where it moves next.

### Phase 2 - Match-Surface Productization

Goal: make live pages and prediction surfaces clearly express Crickzen's decision-intent value.

Work:

1. Keep live score and match state first.
2. Add or refine probability-movement and "what changed" explanation layers.
3. Define how prediction pages differ from canonical live coverage.
4. Inventory the model outputs already available in the current stack and map each one to public product language.
5. Separate model-brain outputs from explanation-layer outputs and identify which repo currently owns each one.

Exit criteria:

- Live and prediction pages each have a distinct, testable value proposition.
- The team knows which existing model outputs can already power public decision-intelligence surfaces.
- The team knows which explanation modules come from the model repo versus the packaging repo and which fields still need a shared contract.

### Phase 3 - Turning-Point And Explanation Surfaces

Goal: capture post-match discussion and explanation demand.

Work:

1. Define the turning-point or loss-explanation page structure.
2. Reuse match-state signals where possible.
3. Link result analysis back to live and next-match surfaces.

Exit criteria:

- Crickzen has a repeatable structure for "why the match changed" and "where the match was lost" content.

### Phase 4 - Alerts And Relationship Capture

Goal: convert one-off traffic into repeat channels.

Work:

1. Define analytics-safe alert messaging.
2. Add alert capture pages and in-product CTAs.
3. Decide where live pages, prediction pages, and post-match pages should route users next.
4. Define how Telegram, subscription, email, or push surfaces become part of the owned relationship loop.

Exit criteria:

- Alert capture is part of the product flow, not an isolated marketing add-on.

### Phase 5 - API And Widget Monetization Surfaces

Goal: package Crickzen's B2B value for publishers and creators.

Work:

1. Define API and widget landing pages.
2. Clarify the commercial CTA and audience.
3. Keep B2B positioning distinct from consumer match browsing.

Exit criteria:

- The site has a clear monetization surface beyond ads and one-off traffic.

### Phase 6 - Measurement And 30-Day Rollout

Goal: turn the strategy into an execution loop.

Work:

1. Define north-star funnel metrics.
2. Define weekly Search Console, page, social, and conversion review points.
3. Freeze the first 30-day delivery order.
4. Define intent events, relationship events, and transaction-adjacent events.
5. Produce the operational bridge artifacts for daily use.

Exit criteria:

- The team has a concrete short-term plan and can measure whether the strategy is working.
- Strategy gaps are converted into visible operating artifacts, not left as abstract direction.

## Verification Checklist

1. The spec covers live score, prediction, turning point, live explanation, alerts, and API or widget intent.
2. The spec keeps `/cric-live/{slug}` canonical live pages central rather than duplicating them.
3. Prediction and turning-point pages are defined as distinct intent surfaces.
4. Alert messaging stays in analytics-safe language.
5. The plan includes a clear acquisition loop from discovery to repeat usage.
6. The plan includes a first 30-day rollout slice with weekly focus areas.
7. Above-the-fold ownership is explicitly protected on match pages.
8. The spec distinguishes internal dashboards from public model surfaces.
9. The operational bridge artifacts are explicitly called out.
10. The spec documents the three-repo implementation split and the need for a shared public intelligence payload contract.

## Risks And Mitigations

- **Risk**: Crickzen chases large generic live-score traffic and gets buried by incumbents.  
  **Mitigation**: prioritize prediction, explanation, and turning-point intent where the site can differentiate.

- **Risk**: Keyword expansion produces thin pages with weak product value.  
  **Mitigation**: require real explanation modules, examples, and clear user utility before expanding a surface.

- **Risk**: Alert and acquisition copy drifts into restricted gambling language.  
  **Mitigation**: standardize on analytics-safe messaging and review CTA language together with landing pages.

- **Risk**: New monetization surfaces clutter core match UX.  
  **Mitigation**: keep match state and score primary above the fold, and route secondary monetization through intentional downstream CTAs.

- **Risk**: The team measures only traffic and misses whether the model creates repeat users or revenue.  
  **Mitigation**: track the full loop from page visit to deeper engagement to alert join to repeat visit or commercial intent.
