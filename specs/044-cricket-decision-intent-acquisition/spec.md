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

## Current Evidence

- Crickzen already owns strong match-level surfaces around `/cric-live/{slug}` and related lifecycle support pages.
- The repo already contains work for canonical match coverage, match freshness support, query-surface authority, and above-the-fold SEO restraint.
- Current SEO work is strong on crawlability and lifecycle coverage, but weaker on explicitly packaging prediction intent, turning-point intent, and alert capture as first-class acquisition surfaces.
- The site already has the raw ingredients for score, commentary, match state, and SSR support, which means the next step is productized acquisition structure rather than generic keyword expansion.

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

### Key Entities

- **Intent Cluster**: A search or acquisition theme such as live score, prediction, turning point, live explanation, alerts, or B2B API or widget demand.
- **Intent Surface**: A hub page, match page, tool page, landing page, or commercial page built to satisfy a specific intent cluster.
- **Decision-Intent Loop**: The acquisition sequence from live or prediction discovery to explanation, alert capture, repeat use, and monetization.
- **Explanation Module**: A visible page section that explains probability movement, pressure, turning points, or match-direction changes.
- **Alert Capture Surface**: A landing page or CTA flow that converts match or prediction interest into Telegram, WhatsApp, email, or push-style relationship channels.
- **B2B Monetization Surface**: A page for API, widget, or publisher solutions with lead capture or demo intent.

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

Exit criteria:

- The team can explain which surface serves which query and why.

### Phase 2 - Match-Surface Productization

Goal: make live pages and prediction surfaces clearly express Crickzen's decision-intent value.

Work:

1. Keep live score and match state first.
2. Add or refine probability-movement and "what changed" explanation layers.
3. Define how prediction pages differ from canonical live coverage.

Exit criteria:

- Live and prediction pages each have a distinct, testable value proposition.

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

Exit criteria:

- The team has a concrete short-term plan and can measure whether the strategy is working.

## Verification Checklist

1. The spec covers live score, prediction, turning point, live explanation, alerts, and API or widget intent.
2. The spec keeps `/cric-live/{slug}` canonical live pages central rather than duplicating them.
3. Prediction and turning-point pages are defined as distinct intent surfaces.
4. Alert messaging stays in analytics-safe language.
5. The plan includes a clear acquisition loop from discovery to repeat usage.
6. The plan includes a first 30-day rollout slice with weekly focus areas.
7. Above-the-fold ownership is explicitly protected on match pages.

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
