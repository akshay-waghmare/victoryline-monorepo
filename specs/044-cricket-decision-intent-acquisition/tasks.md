# Tasks: Cricket Decision-Intent Acquisition

- [x] Read the user's planning note and extract the core acquisition model.
- [x] Map the note onto Crickzen's existing spec language and match-surface strategy.
- [x] Create `specs/044-cricket-decision-intent-acquisition/spec.md`.
- [x] Create `specs/044-cricket-decision-intent-acquisition/plan.md`.
- [x] Create `specs/044-cricket-decision-intent-acquisition/tasks.md`.

## Strategy Tasks

- [ ] Freeze the six core intent clusters: live score, prediction, turning point, live explanation, alerts, and API or widget.
- [ ] Map each intent cluster to a page family: hub, per-match surface, tool page, alert landing page, or B2B page.
- [ ] Confirm what remains canonical on `/cric-live/{slug}` versus what deserves a separate prediction or turning-point route.
- [ ] Define the above-the-fold ownership rules for live match pages so score and match state stay primary.
- [ ] Define the required explanation modules for canonical live pages, including probability movement and "what changed" summaries.
- [ ] Define the per-match prediction template and clarify how it differs from the canonical live page.
- [ ] Define the turning-point or loss-explanation template for completed matches.
- [ ] Define the live explanation and calculator-style utility surfaces.
- [ ] Define alert capture positioning and analytics-safe CTA language for Telegram, WhatsApp, email, or push flows.
- [ ] Define API, widget, and publisher-solution page requirements and their demo or enquiry CTAs.
- [ ] Define the internal-link flow from live pages to prediction pages, turning-point pages, alerts, and B2B surfaces where appropriate.

## 30-Day Rollout Tasks

- [ ] Week 1: define and prioritize the first hub and landing pages.
- [ ] Week 1: improve `/cric-live/{slug}` explanation framing.
- [ ] Week 2: define or implement recurring pre-match, live turning-point, and post-match content formats.
- [ ] Week 3: define match-day, retargeting, and B2B funnel landing flows.
- [ ] Week 4: define the recurring measurement review using Search Console, engagement, alert joins, and commercial interest.

## Verification Notes

- The strategy is only successful if it measures more than traffic.
- Verification should prove the intended loop:
  - match page visit
  - deeper prediction or explanation engagement
  - alert join
  - repeat visit
  - premium, API, or widget intent
- Any implementation should fail review if it creates thin keyword pages without real explanatory value.
