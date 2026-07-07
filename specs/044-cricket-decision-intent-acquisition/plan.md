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

3. **Match-surface framing**
   - Keep `/cric-live/{slug}` score-first and canonical.
   - Strengthen explanation and probability movement modules.
   - Define how prediction pages differ from canonical live pages.

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

8. **30-day rollout**
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

## Constraints

- Keep `/cric-live/{slug}` canonical and central.
- Do not let SEO support modules retake above-the-fold ownership from score and current match state.
- Avoid policy-risky acquisition language.
- Avoid thin page creation for keyword volume alone.
- Keep consumer and B2B surfaces distinct enough that each one serves a clear job.

## Suggested Delivery Order

1. Freeze the strategy and acceptance rules in Spec 044.
2. Define hub and page-family architecture.
3. Refine live page explanation layers.
4. Define prediction and turning-point templates.
5. Add alert capture surfaces and CTA strategy.
6. Define API and widget pages.
7. Add funnel measurement and 30-day checkpointing.
