# Canonical Live-Match Ranking Program

Status: active  
Started: 2026-07-31  
Primary market: India, English  
Owner: Crickzen product and SEO workstream  
Source of truth: this program for execution; `specs/044-cricket-decision-intent-acquisition/` for product architecture.

## Outcome

Make each eligible canonical match URL, `/cric-live/{slug}`, the authoritative Google result for its match's score, prediction, who-will-win, winning-percentage, and live win-probability intent. It must remain score-first while providing useful, fresh, server-rendered decision intelligence.

This program does **not** create separate indexable prediction, who-will-win, or Match Intelligence routes for every match. Those routes remain noindex unless a later evidence gate proves a distinct reusable job and unique value.

## Current baseline

- India/English OpenSEO project: `Crickzen India SEO`, GSC-connected on 2026-07-31.
- First verified GSC window: 2026-06-30 to 2026-07-28; 38 query rows, mainly schedule/timing phrasing, zero clicks, positions about 54–99.
- Existing GSC evidence proves selected fixture live-score queries can rank, but prediction intent is not yet visible.
- P1 India clusters: winning percentage, match prediction, who-will-win, and live win probability.
- Existing public Match Intelligence is a differentiation layer; canonical `/cric-live/{slug}` stays the indexable acquisition page.

### Current live-URL inspection (2026-07-31)

Five URLs returned by the production live-match catalogue were inspected in GSC. Four are `Discovered - currently not indexed`; one is `URL is unknown to Google`. Two raw-page samples returned `200`, self-canonical, `index,follow`, one H1, and five JSON-LD blocks, but neither had `win probability` or `winning percentage` in the server HTML. This proves that the immediate gap is not only discovery: canonical pages must first carry the lifecycle-specific intelligence they are meant to rank for.

The production indexer is healthy, runs every 15 minutes, considers upcoming matches up to 120 hours ahead, and submits a sitemap hourly. It had already used its 180-URL daily budget at inspection time. Do not manually submit the sampled live URLs today. Use the existing scheduler/sitemap after the canonical content gate passes; inspect the controlled cohort rather than submitting every rotating live match.

### Discovery-transport correction checkpoint (2026-08-01, deployed)

The code defaults ordinary match-page Indexing API notifications to disabled and renames operational counters from “indexed” to “notification submitted.” It preserves the sitemap scheduler, crawlable SSR-link route, and GSC URL Inspection as the standard discovery and measurement path. Focused scheduler/sitemap tests passed locally (21 tests). Backend image `macubex/victoryline-backend:20260801-seo-discovery-r0-6` is now healthy in production; its public status reports `indexingApiNotificationsEnabled=false`, `notificationCount=0`, and the standard discovery path. No scheduler call or sitemap submission may be reported as a Google-indexed URL.

### Cohort-readiness checkpoint (2026-08-01)

The first current-lifecycle candidate set cannot yet be frozen. Production has live, upcoming, and completed canonical Hundred samples, each returning an indexable canonical document, but the public prediction API contains no exact row for any of them. It returns only an unrelated completed match. The controlled experiment therefore pauses before content or metadata work: a fresh exact-slug model payload is a precondition for promising a probability answer in SSR. The precise candidates and evidence are recorded in `docs/seo/reports/weekly-query-to-intelligence-report.md`.

`scripts/Assert-LiveMatchCohortReadiness.ps1` now performs this check repeatably against production and can fail a release with `-FailWhenNotReady`. It validates lifecycle presence, a supported format, exact source-URL model identity, five-minute model freshness, and the canonical SSR document contract. It is a readiness measure; it does not send any Google request.

### Model-handoff recovery checkpoint (2026-08-01)

The public-model dashboard was found exhausted by a stale predictor process tree (14,253 PIDs), which made its feed stale or empty despite healthy scraper candidates. The running dashboard was safely restarted with its state archive and prior image preserved, then its process-group termination hardening was released as `macubex/crickzen-dashboard:20260801-predictor-cleanup-0425234`. The deployed container is healthy at 13 PIDs; the rollback image is retained as `machine_learning_bbl-dashboard:rollback-20260801-0202`. The safeguard source is model-repo commit `0425234` and its focused test suite passed 19 tests.

This fixes the handoff reliability prerequisite, not the SEO-content gate. At the latest readiness run there was no supported live candidate; the selected upcoming and completed pages still lacked exact public-model rows and canonical SSR probability content. The cohort must therefore remain unfrozen until upcoming opening, live freshness, and completed retention are all proven for exact canonical identities.

### Completed canonical-SSR checkpoint (2026-08-01, deployed)

The inactive Match Intelligence tab was not part of Angular Material's initial server render, so its model answer could not help the canonical page rank. Frontend commits `10b18ea` and `0bacca7` now render a compact lifecycle-aware intelligence summary beside the canonical first screen when the public model payload is valid: live/upcoming requires the normal freshness rule; completed requires a final probability and retained history. Frontend image `macubex/victoryline-frontend:20260801-canonical-intelligence-r2-0bacca7` (digest `sha256:fdc65bb2af8a90a03def9e2b3ca9fed2614a0a7f4c9f4134a37066712aecb0c4`) is healthy in production.

Raw normal and Googlebot HTML for `/cric-live/msg-vs-tr-14th-match-the-hundred-2026-men-match-updates-ZKN` now contain `Completed match intelligence`, `MSG finished with a 100% final model probability`, the Hundred model label, and one H1. The former stale `Upcoming 0/0` hero is suppressed when this validated completed replay is present. The readiness gate reports this completed row eligible; it intentionally keeps the overall cohort unfrozen because the current slate has no supported live candidate and the upcoming sample has no exact public-model row.

### Live canonical-SSR handoff checkpoint (2026-08-01, deployed)

The next genuine live cohort exposed two timestamp-boundary defects rather than a missing model. The scraper selected EDR vs SDS and the public model resolver held an exact current T20 all-gender v2 row with score, probability, history, explanation, and source URL, but its timezone-less UTC `updated_at` was parsed as local India time. Frontend commit `213d973` and the readiness guard now interpret that legacy representation as UTC. A second handoff issue then surfaced: the merged score feed's numeric `lastUpdated` won over the model's fresh `updated_at`; `Date.parse` rejected the numeric value and falsely marked the live model stale. Commit `41423f9` makes the model timestamp authoritative for model freshness and supports numeric epochs as the fallback.

Frontend image `macubex/victoryline-frontend:20260801-live-intelligence-ssr-r4` (image `sha256:cb93b5c4cd9504c29d0ec9aa55d3bbe6d2e3bc34fa5bd7f277aff6e2423cf265`) is healthy in production. Direct frontend SSR, normal public HTML, and Googlebot public HTML for `/cric-live/edr-vs-sds-2nd-match-delhi-premier-t20-league-2026-match-updates-13B6` each showed a live, updated EDR probability with `Live match intelligence`, `Win probability`, a model label, and one H1. `Assert-LiveMatchCohortReadiness.ps1` now marks both this live sample and the retained completed sample eligible. This proves a production content gate, not Google indexing or ranking; the cohort remains open until an exact upcoming opening-model row, mobile hydration parity, GSC coverage evidence, and analytics receipt are complete.

## Page contract

| Lifecycle | Canonical page must answer | Required SSR-visible evidence | Primary next step |
| --- | --- | --- | --- |
| Upcoming | Who is favoured and why? | opening probability, match context, evidence/freshness, uncertainty | follow the match or prediction updates |
| Live | What changed, why, and what matters next? | current probability, updated time, movement/reason, pressure factor | expand explanation or follow updates |
| Completed | Where did the match turn and what happened? | final result, turning point, probability history/summary, next-match link | team/series or next-match discovery |

The live score, innings state, and immediate match status remain the first viewport. Intelligence supports them; it must not replace them.

### Upcoming-opening model decision (2026-08-01)

The current model is a live ball-state predictor. The dashboard's older pre-match
brief can display fixture and venue context, but its probability lookup only
finds a running live predictor; it is not a valid opening estimator. Do not
substitute `50%`, a venue prior, or a fixture placeholder for a model answer.

The next implementation is tracked in the model workspace at
`C:\Users\ADMINS\Documents\projects\machine_learning_bbl_009-odi-mc-predictor\specs\025-upcoming-opening-intelligence\`.
It creates a separate 12–48-hour fixture ingress and a chronology-tested,
calibrated pre-match team-strength experiment. `/prediction-candidates` remains
live-only: mixing upcoming rows into the finite scraper slate can retire healthy
live predictors. An upcoming probability may reach canonical SSR only after
identity, coverage, calibration, TTL, and exact-source evidence pass.

### Opening-model temporal holdout checkpoint (2026-08-01)

Model-repo commit `8db1021` establishes the first actual opening-model quality
gate: its expanding team-strength baseline uses only outcomes prior to each
fixture date, reserves whole recent dates for a final holdout, and fits Platt
calibration only on older OOF rows. On 1,491 final eligible T20 fixtures the
calibrated result is Brier `0.2258` and log loss `0.6430`, better than neutral
(`0.2500`, `0.6931`) and simple historical-rate (`0.2444`, `0.6819`) baselines.

The experiment is nevertheless **shadow-only revise**, not a serving approval:
the female holdout has 680 rows but ECE `0.0705` exceeds the written `0.050`
gate, and the source has no named competition values for a competition segment.
Do not add an opening percentage to the public API, build fixture ingress, or
change canonical SSR based on this result. Reopen the upcoming lifecycle only
after reliable competition identity and a revised calibration approach pass a
new untouched female/competition temporal holdout.

## Program gates

1. **Eligibility gate**: Only selected matches with stable identity, lifecycle data, fresh model data, and a valid canonical route receive intelligence promises.
2. **SSR gate**: Raw server HTML for upcoming, live, and completed samples proves title, H1, canonical, indexability, and the lifecycle-appropriate intelligence answer before rollout.
3. **Parity gate**: Browser hydration cannot weaken the server title, canonical, visible intelligence, or match identity.
4. **Measurement gate**: `match_view`, `prediction_view`, `prediction_interaction`, `explanation_expand`, `alert_cta_click`, `relationship_join`, and `repeat_match_visit` are emitted with the required attribution and validated at their real destination.
5. **Index-quality gate**: Historic URLs either retain a result plus useful explanation and entity links, are improved, or are intentionally excluded/consolidated. Do not keep generic/stale records indexable by default.
6. **Expansion gate**: No new indexable route or hub until GSC shows recurring query demand and canonical pages show meaningful intelligence engagement.
7. **Notification-legitimacy gate**: Do not use Google's Indexing API for ordinary match pages. Google limits that API to JobPosting pages or livestream pages with a `BroadcastEvent` embedded in a `VideoObject`; Crickzen's current match pages expose `SportsEvent`, not that eligible video schema. Sitemap/internal-link discovery is the standard path unless the product later publishes a genuine qualifying livestream page.
8. **Coverage-verification gate**: A successful sitemap submission or scheduler notification is not an indexing result. Every controlled URL must record its GSC inspection coverage state, sitemap presence, first inspection date, and follow-up outcome.
9. **Capacity gate**: The auto-indexer may not burn its daily request budget across an unqualified catalogue. Before any future notification path is retained, it must select only pages that pass the canonical-content, lifecycle, and discovery checks, with an auditable reason for every request.
10. **Rollout gate**: The corrected discovery-status contract must be deployed and publicly verified before it is relied on operationally. The expected production configuration is `GSC_LIVE_MATCH_INDEXING_API_NOTIFICATIONS_ENABLED=false` (or unset); only a future genuine qualifying video-livestream surface may opt in separately.

## Delivery sequence

### Phase R0 — Baseline and scope (complete)

- India keyword research and GSC connection are complete.
- The one-canonical-page decision, P1 clusters, exclusions, and weekly reporting shape are documented.

### Phase R1 — Canonical page value

Build and prove one lifecycle-specific SSR intelligence block on canonical pages. Start with a controlled cohort, not the entire catalogue.

### Phase R2 — Discovery and metadata

Use lifecycle-specific title/H1/description and contextual SSR links only where the promised intelligence is visibly present. Preserve distinct jobs for live-score and schedule hubs.

### Phase R2a — Discovery transport correction

Use sitemap inclusion, SSR links, and URL Inspection evidence as the standard live-match discovery system. The current per-URL Indexing API path is not valid for ordinary `SportsEvent` match pages and must not be counted as proof of indexing. Do not fabricate video schema merely to qualify for the API.

### Phase R3 — Intent ledger

Implement the missing outcomes and record query/page → engagement → relationship/repeat evidence. This decides whether the product is useful after the click.

### Phase R4 — Historic index quality

Classify historic match pages and protect the site's quality signals: retain strong records, improve recoverable ones, and noindex/consolidate weak records under a tested policy.

### Phase R5 — 28-day learning loop

Review the first full 28-day post-rollout window. Improve canonical pages with impressions and weak CTR, improve placement when clicks do not produce intelligence use, and stop unsupported ideas.

## Success measures

The first milestone is not a top-ten claim. The milestones are:

1. P1 prediction terms begin generating India GSC impressions against canonical match pages.
2. Those impressions produce clicks without weakening existing fixture-score performance.
3. A material share of those match sessions trigger prediction/explanation engagement.
4. Engagement produces attributable follow/return behavior.
5. Only then does the team approve expansion beyond canonical pages.

## Operating cadence

- **Per release:** run SSR, browser-parity, analytics-destination, and canonical/indexability checks on sampled upcoming/live/completed matches.
- **Weekly:** update `docs/seo/reports/weekly-query-to-intelligence-report.md`; choose improve, expand, consolidate, or stop per cluster.
- **Every 28 days:** compare India GSC query/page evidence with the prior window and decide whether the cohort becomes broader.

## References

- `docs/seo/keywords/intent-backlog-2026-07.md`
- `docs/seo/reports/weekly-query-to-intelligence-report.md`
- `specs/044-cricket-decision-intent-acquisition/spec.md`
- `specs/044-cricket-decision-intent-acquisition/plan.md`
- `specs/044-cricket-decision-intent-acquisition/tasks.md`
