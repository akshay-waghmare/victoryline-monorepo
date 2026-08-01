# Canonical Live-Match Ranking Tasks

Status legend: `[ ]` queued, `[-]` in progress, `[x]` verified, `[!]` blocked.  
Rule: do not mark a task complete on source edits alone. Record the requested evidence in the task before moving forward.

## Current focus

**Current active tasks: R1.1, R1.3, and R4.2 — complete the remaining upcoming cohort contract, prove browser parity, and recheck the terminal date-label correction.** R0.6 is live and verified. Live and completed lifecycle samples now have exact, eligible model rows and truthful canonical SSR intelligence; upcoming has no exact opening-model row. The first upcoming baseline is explicitly shadow-only because its female calibration and competition-segment gates fail. Do not claim indexing or ranking improvement until the three-lifecycle cohort and outcome gates pass.

## R0 — Baseline and decisions

- [x] **R0.1** Create India/English OpenSEO research project and connect GSC.  
  Evidence: `Crickzen India SEO` project `222ae85a-48fd-451b-956a-8ccb20c57fb4`; GSC reads 38 rows for 2026-06-30→2026-07-28.
- [x] **R0.2** Define P1 demand clusters and prohibited language.  
  Evidence: `docs/seo/keywords/intent-backlog-2026-07.md`.
- [x] **R0.3** Freeze one-canonical-page-per-match policy.  
  Evidence: Spec 044 and `docs/seo/canonical-live-match-ranking-program.md`.
- [x] **R0.4** Inspect the current production live catalogue in GSC and verify raw page eligibility.  
  Evidence: 2026-07-31 sample of five live URLs: four `Discovered - currently not indexed`, one `URL is unknown to Google`; two raw samples were 200/self-canonical/indexable with one H1 and JSON-LD, but lacked win-probability language in SSR. Production scheduler is healthy but had used its 180-URL daily budget. No manual per-URL submission is approved today.
- [x] **R0.5** Verify scheduler, sitemap, and Googlebot parity.  
  Evidence: production status reports GSC/sitemap scheduler healthy; all five sampled URLs are in the live sitemap shard with current `lastmod`, `hourly`, and `0.9` priority; focused Maven suite passed 20 tests. Googlebot receives a 200, self-canonical, `index,follow`, one-H1 `SportsEvent` page. It still lacks SSR win-probability content.
- [x] **R0.6** Correct the discovery transport contract before treating automatic URL requests as indexing.  
  Reason: Google restricts the Indexing API to JobPosting or genuine livestream pages with `BroadcastEvent` inside `VideoObject`; the sampled Crickzen page contains `SportsEvent` only. The scheduler's former "Indexed" counter meant a notification was accepted, not that Google indexed the URL.  
  Local implementation (2026-08-01): `LiveMatchIndexingScheduler` defaults `gsc.live-match-indexing.indexing-api-notifications-enabled` to `false`; controller/status terms now report notifications rather than indexed URLs; the manual trigger explains the standard sitemap + SSR-link + URL-Inspection path. Focused Maven suite passed 21 tests, including the disabled-notification guard.  
  Production proof (2026-08-01): backend image `macubex/victoryline-backend:20260801-seo-discovery-r0-6` (registry digest `sha256:c5751290fe3a7c18657acc7e5e82cadda4acef52420af0ddc6a64d2775c21db4`) is healthy. The public status endpoint reports `indexingApiNotificationsEnabled=false`, `notificationCount=0`, and standard discovery as sitemap + crawlable SSR links + URL Inspection. The sitemap scheduler remains healthy. This proves the operational counter no longer claims Google indexing.

## R1 — Canonical match-page intelligence

- [-] **R1.1** Select 3–9 controlled samples: at least one upcoming, live, and completed match with stable match identity and model eligibility.  
  Depends on: R0.1–R0.3.  
  Current evidence (2026-08-01): the dashboard handoff was recovered after a stale predictor tree grew to 14,253 PIDs. The predictor group-termination guard is now deployed in dashboard image `macubex/crickzen-dashboard:20260801-predictor-cleanup-0425234`; the replacement is healthy at 13 PIDs and the prior image is retained as `machine_learning_bbl-dashboard:rollback-20260801-0202`. The guard source is committed as model-repo commit `0425234` and its focused suite passed 19 tests. This is an availability safeguard, not cohort proof.  
  Latest readiness run (2026-08-01, live window): scraper selected the exact live EDR/SDS source URL and the public feed resolved it with a current T20 all-gender v2 probability/history row. The readiness guard originally misread its timezone-less UTC timestamp as IST; `213d973` now interprets that legacy form as UTC. The canonical live SSR handoff then exposed a stale-precedence defect: a numeric score-feed `lastUpdated` masked the fresh model `updated_at`; `41423f9` now prefers the model timestamp and supports numeric epochs. Production frontend image `macubex/victoryline-frontend:20260801-live-intelligence-ssr-r4` (image `sha256:cb93b5c4cd9504c29d0ec9aa55d3bbe6d2e3bc34fa5bd7f277aff6e2423cf265`) is healthy. Direct frontend SSR plus normal and Googlebot public HTML all visibly show `Live match intelligence`, EDR's live 69% win probability, model label, and updated timestamp; the readiness guard marks this live row eligible. Completed `msg-vs-tr-14th-match-the-hundred-2026-men-match-updates-ZKN` remains eligible.  
  Repeatable verification: `scripts/Assert-LiveMatchCohortReadiness.ps1` checks the production upcoming/live/completed catalogues, exact `match_url` model identity, five-minute freshness, and the canonical SSR contract. Its first run rejected all three lifecycle samples for absent exact model rows.  
  Opening-model checkpoint (2026-08-01): model commit `8db1021` runs a prior-only, whole-date temporal holdout with Platt calibration fit only on earlier OOF rows. Its 1,491-row calibrated final holdout improves Brier (`0.2258` versus neutral `0.2500` and historical rate `0.2444`) and log loss, but female ECE is `0.0705` above the written `0.050` gate. Follow-up model commit `b6aa282` restores exact-ID Cricsheet event names for 5,300/5,363 fixtures; current named holdout events are individually small (largest 49), so they remain diagnostic. Decision: **shadow-only revise**; it authorizes no fixture ingress, public model row, or SSR change.  
  Blocker: pass a revised female temporal-calibration holdout, then restore the local frontend dependency set and deploy/recheck the isolated 390px canonical-route parity guard before freezing the three-lifecycle cohort.  
  Proof: exact URLs, slugs, lifecycle, model freshness, and test owner recorded in `docs/seo/reports/weekly-query-to-intelligence-report.md`.
- [ ] **R1.2** Define the canonical SSR intelligence payload for the cohort: probability, updated timestamp, what changed, why, what matters next, lifecycle-specific fallback.  
  Depends on: R1.1.  
  Proof: payload contract and fallback behavior are represented in tests.
- [-] **R1.3** Render the lifecycle-appropriate intelligence block in canonical `/cric-live/{slug}` HTML without displacing score/state from the first viewport.  
  Depends on: R1.2.  
  Progress (2026-08-01): frontend commits `10b18ea` and `0bacca7`; production image `macubex/victoryline-frontend:20260801-canonical-intelligence-r2-0bacca7`. Raw normal and Googlebot SSR HTML prove the completed sample's final-answer module and one H1, with no stale `Upcoming 0/0` conflict.  
  Live SSR proof (2026-08-01): image `20260801-live-intelligence-ssr-r4` returns the same compact live intelligence answer to direct SSR, normal public, and Googlebot requests for EDR/SDS. Remaining proof: a 390px browser screenshot and an eligible upcoming lifecycle sample.
- [ ] **R1.4** Verify hydration parity and stale/unavailable model fallbacks.  
  Depends on: R1.3.  
  Mobile progress (2026-08-01): a real 390px production-browser check shows the live BP-W/WF-W page with visible live intelligence (44%, label, timestamp) and the completed MSG/TR page with visible final intelligence (100%, label, timestamp), self-canonical `index,follow`, one H1, and no stale `Upcoming 0/0`. The completed bare canonical URL then client-navigated to `/scorecard` when Material emitted its lifecycle-default tab event. The narrow source guard and regression spec now prevent programmatic completed/upcoming default tabs from writing a supporting-route URL; compilation is still pending because the local checked-in TypeScript compiler is truncated (`Unexpected end of input`).  
  Remaining proof: restore a valid local frontend dependency set, run the lifecycle spec/build, deploy the isolated guard, and repeat 390px parity on the canonical base URL. An eligible upcoming sample remains unavailable until the shadow-only opening model is revised.

## R2 — Search intent and discovery

- [ ] **R2.1** Apply lifecycle title, H1, description, and visible-answer templates to the cohort only.  
  Depends on: R1.3.  
  Proof: each metadata promise maps to a visible SSR module on the same URL.
- [-] **R2.2** Verify SSR discovery links from live-score/schedule/series/entity surfaces into the cohort.  
  Depends on: R1.1.  
  Progress (2026-08-01): raw production HTML for `/live-score`, `/cricket-schedule/today`, and `/matches` contains contextual canonical hrefs for both controlled completed and upcoming URLs. Both URLs are also in `sitemap-matches-0001.xml`; the completed page is self-canonical and indexable.  
  Remaining proof: retain a live cohort sample and verify its series/entity-surface links before treating the full lifecycle discovery graph as complete.
- [x] **R2.3** Keep Match Intelligence and other child routes noindex and out of sitemaps during the experiment.  
  Depends on: R2.1.  
  Production proof (2026-08-01): normal and desktop Googlebot raw HTML for `/match-intelligence/msg-vs-tr-14th-match-the-hundred-2026-men-match-updates-ZKN` both return `noindex,follow`. The child route is absent from `sitemap-matches-0001.xml`; the matching canonical `/cric-live/{slug}` URL is present. The child keeps a self canonical because it is explicitly excluded from indexing, while the canonical match page remains the discovery owner.
- [x] **R2.4** Define hub separation: `/live-score` owns live scores; `/cricket-schedule/today` owns timing; neither makes unsupported prediction promises.  
  Depends on: R2.1.  
  Production proof (2026-08-01): `/live-score` renders `Live Cricket Matches & Scores Today` in title/H1; `/cricket-schedule/today` renders `Cricket Schedule Today`. Neither raw SSR body makes `win probability`, `match prediction`, or `who will win` promises. Prediction intent stays on eligible canonical match pages.
- [-] **R2.5** Add an auditable discovery ledger for every controlled match: sitemap shard/lastmod, SSR-link source, GSC coverage state, last crawl, and follow-up inspection date.  
  Depends on: R1.1 and R2.2.  
  Progress (2026-08-01): the weekly report now has baseline ledger rows for the completed and upcoming controlled URLs. Both are in `sitemap-matches-0001.xml` and linked from `/live-score` SSR, but GSC reports `URL is unknown to Google`; no manual URL submission follows from this.  
  Remaining proof: add a fresh live row, actual GSC first-crawl/index details, and follow-up inspections before broad rollout.
- [ ] **R2.6** Replace the false "indexed today" operating signal with separate counters for sitemap inclusion, eligible discovery candidates, notification submitted (if ever eligible), GSC discovered, crawled, and indexed.  
  Depends on: R0.6.  
  Proof: production status and report labels cannot imply Google indexing from a successful API call.

## R3 — Query-to-intelligence measurement

- [-] **R3.1** Implement `match_view` with canonical URL, slug, lifecycle, surface, anonymous session ID, referrer/UTM, and source attribution where available.  
  Depends on: R1.3.  
  Deployment (2026-08-01): frontend commits `2926471` and `ec6de20`, deployed as `macubex/victoryline-frontend:20260801-canonical-match-view-r2-ec6de20` (digest `sha256:c9179f320d9f5282eac173e3aa5537a461d797220cd4969a91b01906257785dc`), add one browser-only canonical `match_view` per match route. The event carries `match_slug`, `match_path`, `lifecycle`, `surface`, anonymous session ID, landing path, referrer host, source attribution, and UTM fields. `gtag` is preferred and `dataLayer` is now a fallback so one interaction is not double-counted. The dependency-complete Docker SSR build passed; local Karma could not start because this checkout lacks the Angular CLI executable.  
  Production artifact proof: the served lazy bundle includes the event and session contract; normal, desktop Googlebot, and mobile Googlebot canonical-page probes remain 200/self-canonical/`index,follow`/one-H1 with the completed answer and valid `SportsEvent.startDate`/`location`.  
  Remaining proof: validate one real `match_view` receipt in GA DebugView or the configured analytics destination before using engagement data for SEO decisions.
- [ ] **R3.2** Validate existing intelligence events with the same attribution contract.  
  Depends on: R3.1.  
  Proof: `prediction_view`, `prediction_interaction`, and `explanation_expand` validated in the destination.
- [ ] **R3.3** Implement relationship and return outcomes: `relationship_join` and `repeat_match_visit`.  
  Depends on: owned-channel decision.  
  Proof: completed join and later qualified session link back to an originating match/surface.
- [ ] **R3.4** Populate the weekly GSC query/page → event funnel report.  
  Depends on: R3.1–R3.2.  
  Proof: first report has a dated baseline and cohort rows.

## R4 — Historic match-page quality

- [x] **R4.1** Sample historic indexed match URLs and classify each as retain, improve, noindex, or consolidate.  
  Depends on: R2.4.  
  Inventory (2026-08-01): three GSC-indexed canonical samples — `dbs-vs-ess-33rd-match-t20-blast-2026-match-updates-ZUV` (the report has 1 click, 17 impressions, 7.1 average position), `ban-vs-ire-1st-t20-ireland-tour-of-bangladesh-2025-match-updates-0S8`, and `bh-w-vs-syt-w-8th-match-womens-big-bash-league-2025-match-updates-WQ6` — return indexable canonical HTML but visibly present stale `Upcoming 0/0` state and have no SSR-visible series or team link. All are classified **improve**, not noindex: the first has evidenced demand and the archive problem should be repaired at its authoritative lifecycle boundary before any exclusion decision.
- [-] **R4.2** Implement and test the approved weak-record policy.  
  Depends on: R4.1.  
  Production checkpoint (2026-08-01): commit `71b4302` is deployed as backend `macubex/victoryline-backend:20260801-historic-lifecycle-r1` (digest `sha256:ba7601bc0a839c177fe773d2d97ceabeb68390322160f6ea070f26fa3b8c2f00`) and frontend `macubex/victoryline-frontend:20260801-historic-terminal-r1` (digest `sha256:f41fe65750e4a0bd10a1685eff89d43a91470a5548191a617272882beb324eb5`). The targeted Java 17 regression test `CricketDataControllerTerminalLifecycleTest` passes. Both normal and Googlebot raw HTML for DBS/ESS are `200`, self-canonical, `index,follow`, and one-H1; they visibly show `COMPLETED` and the final ESS result with no `0/0 (0.0 ov)` shell.
  Follow-up: commit `2620b14` corrects the terminal summary's ambiguous legacy date label (previously parsed as 2001). It is now bundled into the live frontend r4 image, but DBS/ESS date-label proof was deferred while the live-cohort window took priority. Recheck normal + Googlebot raw HTML preserves the source date label, terminal result, no `0/0`, canonical, indexability, and one H1. Keep the Bangladesh/Ireland and Brisbane Heat/Sydney Thunder samples as improvement backlog until their catalogue lifecycle can be confirmed.
  Recheck complete (2026-08-01): normal and Googlebot raw HTML both return `200`, self-canonical, `index,follow`, and one H1 for DBS/ESS. The visible terminal state is `COMPLETED`, ESS `179/5 (19.4)` with no `0/0 (0.0 ov)` shell, and the source label is `Thu, May 31, 8:30 PM` rather than the former fabricated 2001 date. This confirms the deployed label repair for this sample; it does not yet prove retained team/series links (R4.3).
- [ ] **R4.3** Ensure retained completed matches link to teams, series, and next relevant match.  
  Depends on: R4.2.  
  Proof: SSR entity links and route 200 checks.

## R5 — Learning and expansion decision

- [ ] **R5.1** Wait for and export the first 28-day post-rollout India GSC cohort.  
  Depends on: R2 and R3 release date.  
  Proof: query+page comparison with baseline date range.
- [ ] **R5.2** Decide per P1 cluster: improve, expand, consolidate, or stop.  
  Depends on: R5.1.  
  Proof: decision and evidence added to the weekly report and wiki.
- [ ] **R5.3** Consider an indexable reusable prediction hub only if canonical-page demand and engagement prove a separate repeatable user job.  
  Depends on: R5.2.  
  Proof: written value gate, non-duplicate page contract, and approval before implementation.

## Stop conditions

- Stop a proposed page if it has no distinct user job, no unique first-party explanation, or no owned next step.
- Stop rollout for a lifecycle if identity, freshness, or SSR parity fails.
- Do not claim ranking success from crawlability, a submitted sitemap, or a URL inspection pass alone.
- Do not deploy broad catalogue changes until the controlled cohort passes its evidence gates.
