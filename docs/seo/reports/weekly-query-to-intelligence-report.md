# Weekly query-to-intelligence report

Use this report to decide whether to improve, expand, consolidate, or stop a search surface. Report a trailing 28-day window and compare it with the prior 28 days.

## 0. Controlled-cohort readiness

Do not freeze a cohort merely because its canonical URL returns `200`. Every proposed row must have stable identity, the required lifecycle state, a matching public-model row, and a model timestamp inside the product freshness window (currently five minutes for live use). Capture this table before shipping any canonical intelligence or changing indexability.

### 2026-08-02 live gate restored — cohort still open

The repeatable production guard now selects `cdk-vs-odw-4th-match-delhi-premier-t20-league-2026-match-updates-13B8` as the live cohort row. The `LIVE` catalogue record and public feed have the same exact CREX source URL. Its 49% public probability was updated at `2026-08-02T07:54:34.152176Z` and therefore passed the live five-minute freshness gate at the time of the check. Googlebot-requested canonical HTML was `200`, self-canonical, `index,follow`, and one H1; its visible body included `Live match intelligence` and a win-probability answer without stale `Upcoming 0/0` content. The same guard found retained completed PAK-W/SL-W eligible.

This is renewed live lifecycle evidence, not a Google indexing, ranking, crawl, or engagement result. The upcoming ARG-W/CAN-W candidate has no exact valid opening row and no SSR opening-intelligence answer, so the controlled three-lifecycle cohort remains unfrozen. Do not submit ordinary SportsEvent URLs through the Google Indexing API.

### 2026-08-02 live rotation — SRL-W/TR-W remains eligible

The production guard selected exact live SRL-W/TR-W (`srl-w-vs-tr-w-17th-match-the-hundred-2026-women-match-updates-ZKQ`). Its exact CREX URL resolves to a 47% `The Hundred all-gender v1` row updated `2026-08-02T10:06:10.189155` with 11 history points. Googlebot-requested canonical HTML is 200, self-canonical, `index,follow`, one H1, visibly includes `Live match intelligence` and `win probability`, and contains no stale `Upcoming 0/0` state. Upcoming remains the only lifecycle blocker; this is no Google visibility or ranking claim.

### 2026-08-02 opening-candidate ingress repair — candidates now reach the safety gate

CREX schedule discovery had parsed only the initially rendered date. The production upcoming catalogue therefore peaked at 5.5 hours ahead, while the opening policy deliberately accepts only exact T20 fixtures 12–48 hours before start. Scraper commit `150bbf8` adds one bounded next-date pass, canonical URL de-duplication, and two guards against the observed nested `/cricket-live-score/vs-...` malformed record. Focused discovery, schedule URL, and prematch-selection tests passed.

Production scraper image `macubex/victoryline-scraper:20260802-schedule-lookahead-r4` (digest `sha256:3d450bad761f5a79b3164550c5f41d1fa1d793900622d0ec925106a29c101c21`) is healthy. `/prematch-candidates` now returns three exact, 12–48-hour T20 source URLs: Asian Stars/Bangladesh Tigers, West Delhi Lions/Purani Dilli-6, and Charaideo Sunrisers/Tezpur Titans. This is ingress proof only—not an opening prediction, SSR result, or Google outcome. The next gate is still an exact candidate that passes deployed-artifact coverage, then one public opening row and normal/Googlebot/mobile SSR verification.

The configured local runtime artifact was also rebuilt from `data/t20_all_raw/matches`, correcting a stale July-2 copy to `as_of_date=2026-07-30` with 109 team states and 5,001 calibration rows. With the dashboard's declared requirements installed locally, focused dashboard opening/public tests pass 14 and the opening-baseline suite passes 15. The three currently eligible source fixtures still return `team_not_covered_by_artifact`, which is the required safe result.

### 2026-08-01 production snapshot — not eligible to freeze

### 2026-08-01 retained-source SSR repair — completed lifecycle restored, cohort still open

Production briefly lost public access to live/upcoming catalogue requests while the backend and scraper remained healthy on-host; the public path recovered without a service restart. The subsequent exact readiness run selected LS vs SB as live, ARG-W vs CAN-W as upcoming, and LS-W vs SB-W as completed. Scraper `/prediction-candidates` selected LS/SB and three other live T20 URLs. Its exact public model row was `57%`, updated `2026-08-01T16:43:20.927532`, and normal plus Googlebot canonical HTML visibly contained its live probability. It later fell outside the five-minute live SLA, so the next guard correctly marked it ineligible rather than reusing stale proof.

The completed LS-W/SB-W resolver returned the exact retained source URL with `status=stopped`, `100%`, long probability history, and `The Hundred all-gender v1`; the previous frontend could accidentally retain a same-team rolling-feed match instead of resolving this source. Frontend commit `474a005` was deployed as `macubex/victoryline-frontend:20260801-retained-intelligence-r3` (image `sha256:3e26683738761968f48d8569d9f4ec8c126598fbe42dfe5f0fff4474c57b742f`). Normal and Googlebot HTML for `/cric-live/ls-w-vs-sb-w-16th-match-the-hundred-2026-women-match-updates-ZKP` are 200, self-canonical, `index,follow`, one H1, visible `Completed match intelligence` and `Win probability 100%`, with no stale `Upcoming 0/0`. The next guard selected HT-W/MW-W as a completed eligible row, confirming the repair is generic rather than page-specific.

The cohort is not frozen. Current upcoming ARG-W/CAN-W has no exact opening row and no SSR answer; the opening artifact remains too old for valid August serving. No Google crawl, indexing, ranking, or GA destination receipt is implied by this release.

| Lifecycle needed | Candidate canonical URL | Production catalogue proof | Public-model proof | Decision / owner |
| --- | --- | --- | --- | --- |
| Live | `/cric-live/msg-vs-tr-14th-match-the-hundred-2026-men-match-updates-ZKN` | `LIVE`; fresh catalogue state; canonical page is `200`, self-canonical, `index,follow`, 1 H1, 5 JSON-LD blocks | No matching public-model row | Do not freeze. Model/scraper owner must publish a fresh exact-slug row. |
| Upcoming | `/cric-live/bp-vs-wf-15th-match-the-hundred-2026-men-match-updates-ZKO` | `UPCOMING`; stable scheduled record; canonical page is `200`, self-canonical, `index,follow`, 1 H1, 5 JSON-LD blocks | No matching public-model row | Do not freeze. Require a valid opening-probability policy and fresh exact-slug row before start. |
| Completed | `/cric-live/msg-w-vs-tr-w-14th-match-the-hundred-2026-women-match-updates-ZKI` | `COMPLETED`; canonical page is `200`, self-canonical, `index,follow`, 1 H1, 5 JSON-LD blocks | No matching retained public-model row | Do not freeze. Require retained result/turning-point history for the exact slug. |

Snapshot evidence: `/api/cricket-data/live-matches`, `/upcoming-matches`, and `/completed-matches` supplied the lifecycle records. `/prediction-api/api/public/matches` returned only the unrelated completed `bp-vs-sb-13th-match-the-hundred-2026-men-match-updates-ZKM` row; it did not contain any of the three candidates. Therefore the current public model feed fails the cohort's freshness and exact-identity gate. All three canonical HTML samples still lack SSR-visible `win probability` / `winning percentage`, as expected before R1.2–R1.3.

Repeatable check: run `powershell -ExecutionPolicy Bypass -File .\scripts\Assert-LiveMatchCohortReadiness.ps1 -SiteUrl https://www.crickzen.com -MaxModelAgeMinutes 5`. The initial production run selected supported upcoming/live/completed samples, found all canonical SSR contracts healthy, and correctly rejected all three because the exact public-model rows are missing. Use `-FailWhenNotReady` in release automation.

Next proof: restore the five-match handoff equality — selected scraper candidates = fresh public-model rows = canonical routes with a valid lifecycle payload — then replace this provisional table with a frozen 3–9-match cohort and begin fixed-time discovery inspections.

### 2026-08-01 recovery and recheck — infrastructure restored, cohort still blocked

The model dashboard had accumulated 14,253 processes under a stale predictor tree. It was restarted safely with a state archive and prior image preserved, then replaced with `macubex/crickzen-dashboard:20260801-predictor-cleanup-0425234`, which contains model-repo commit `0425234` for graceful process-group termination and SIGKILL escalation. The replacement is healthy at 13 PIDs. This restores the live-handoff prerequisite without making an SEO claim.

The immediate recheck found an empty live catalogue and zero scraper prediction candidates, which is consistent with the current overnight live slate rather than evidence of a broken handoff. The completed archive defect was then fixed and released: the exact `msg-vs-tr-14th-match-the-hundred-2026-men-match-updates-ZKN` replay now resolves in 0.81 seconds with 100% terminal probability, 16 history points, three reasons, and its Hundred model label. The upcoming `ap-vs-as-4th-match-asian-legends-league-t20-2026-match-updates-134S` still has no model row; there is no supported live candidate.

Critical SSR contradiction: raw canonical HTML for the completed match still renders stale `Upcoming` / `0/0` match state and has no visible win-probability text. The readiness script was corrected to ignore CSS, scripts, and metadata when testing visible SSR, so it rejects this page correctly. Keep R1.1 open: prove a fresh exact live row during the next eligible match, define an honest upcoming opening-prediction contract, and render the retained completed payload truthfully in canonical SSR before freezing the cohort.

### 2026-08-01 completed-SSR release — one lifecycle eligible, cohort remains open

The canonical page now independently renders valid public-model intelligence instead of relying on its inactive Match Intelligence tab. Production frontend image `macubex/victoryline-frontend:20260801-canonical-intelligence-r2-0bacca7` exposes the exact completed replay for `msg-vs-tr-14th-match-the-hundred-2026-men-match-updates-ZKN` in raw normal and Googlebot HTML: `Completed match intelligence`, `MSG finished with a 100% final model probability`, `The Hundred all-gender v1`, and one H1. The prior stale `Upcoming 0/0` live-hero output is absent when the validated completed replay is present.

The current repeatable readiness result is: completed = eligible; upcoming = not eligible (no exact public-model row); live = no supported candidate in the current catalogue. This is a content-quality milestone, not indexing or ranking proof. Keep the cohort unfrozen until the two remaining lifecycle rows meet the same identity, freshness, SSR, browser-parity, and GSC evidence gates.

#### Discovery ledger baseline — 2026-08-01

| Lifecycle | Canonical URL | Sitemap proof | SSR link proof | GSC URL Inspection | Next inspection |
| --- | --- | --- | --- | --- | --- |
| Completed | `/cric-live/msg-vs-tr-14th-match-the-hundred-2026-men-match-updates-ZKN` | `sitemap-matches-0001.xml`, `lastmod` `2026-07-31T21:04:03.054Z` | `/live-score` raw SSR contains the canonical href | `URL is unknown to Google` | 2026-08-08 or after Google first crawls |
| Upcoming | `/cric-live/ap-vs-as-4th-match-asian-legends-league-t20-2026-match-updates-134S` | `sitemap-matches-0001.xml`, `lastmod` `2026-07-31T21:04:03.055Z` | `/live-score` raw SSR contains the canonical href | `URL is unknown to Google`; no exact public model row | Inspect only after an eligible opening payload is live |

This ledger separates submitted/discoverable URLs from Google visibility. No manual submission is implied by the `URL is unknown` state; the sitemap scheduler and SSR links remain the discovery path.

#### Supporting-route indexability guard — 2026-08-01

The completed match's `/match-intelligence/{slug}` route returns `noindex,follow` to both normal and Googlebot requests and is absent from the match sitemap. Its corresponding `/cric-live/{slug}` canonical page remains sitemap-present. This preserves one indexable acquisition URL per match while retaining the child route as a useful interaction surface.

#### Discovery hubs and intent separation — 2026-08-01

Raw SSR from `/live-score`, `/cricket-schedule/today`, and `/matches` contains canonical links for both controlled rows. `/live-score` is titled/H1 `Live Cricket Matches & Scores Today`; `/cricket-schedule/today` is titled/H1 `Cricket Schedule Today`; neither body makes a probability or prediction promise. This keeps broad live-score/timing intent on its appropriate hub while eligible canonical match pages own decision-intent answers.

#### Historic indexed-page quality audit — 2026-08-01

Three Google-indexed canonical pages were sampled: DBS v ESS (1 click, 17 impressions, average position 7.1 in the current GSC slice), BAN v IRE, and BH-W v SYT-W. Each is self-canonical and indexable, but raw visible HTML presents stale `Upcoming 0/0` state and no SSR-visible team or series link. The decision is **improve**, not noindex, because the DBS/ESS completed catalogue record exists and has a definitive terminal status/result.

The root cause is a boundary mismatch: `/cricket-data/match-info/get` returned a stored CREX identity payload that contained pre-match information but no lifecycle field, while `/completed-matches` returned the same DBS/ESS slug as `COMPLETED`. Commit `71b4302` corrects that boundary: match-info enriches only the exact terminal catalogue record, then exposes `match_status`, `status`, result, and last-known state to canonical SSR. The targeted Java 17 regression test passes. Backend image `20260801-historic-lifecycle-r1` and frontend image `20260801-historic-terminal-r1` are live; raw normal and Googlebot HTML both show `COMPLETED` plus the final result, preserve self-canonical/`index,follow`/one-H1, and no longer render `0/0 (0.0 ov)`.

Follow-up is intentionally paused: frontend commit `2620b14` replaces an incorrectly parsed `2001` date in the newly visible terminal summary with the source date label. Its image build was cancelled at the user’s request before deployment. Resume by releasing that frontend-only correction and repeating the same normal/Googlebot raw HTML proof; no GSC indexing or ranking claim follows from this content-quality fix.

## 1. Acquisition evidence

### 2026-08-03 GSC query-to-page diagnostic (2026-05-04 to 2026-08-01, Web, all countries/devices)

The property earns its meaningful organic demand from exact fixture intent, not generic head terms. The leading query is `br vs sgr live score` (62 clicks, 644 impressions, position 5.77), split across two distinct canonical pages: the Afghanistan One Day Cup match (35 clicks, 388 impressions, position 5.62) and the Afghanistan National T20 Cup match (27 clicks, 256 impressions, position 6.00). This confirms that match pages can win for the team-pair + live-score job, but it also exposes entity ambiguity: the same pair recurring in different competitions makes Google distribute a generic query across multiple URLs.

Additional exact-fixture winners are `ar vs br live score` (5 clicks, position 4.35), `glm vs glcs live score` (3 clicks, position 3.83), and `lan vs tbz live score` (3 clicks, position 3.94). Series-qualified demand also appears for `nigeria t20 super league live score` (2 clicks, 27 impressions, position 6.19). In contrast, the trailing 28-day window (2026-07-06 to 2026-08-01) has only low-volume, zero-click broad timing queries: `today cricket match time` (43 impressions, position 62.74), `today cricket match timing` (28, position 84.25), and `timing of today's cricket match` (22, position 93.55), mapped to `/cricket-schedule/today`. These are weak early relevance tests, not evidence that the schedule page owns broad national demand.

Decision: preserve `/cric-live/{slug}` as the sole indexable match URL and use the next approved lifecycle template experiment to strengthen exact-match disambiguation in the visible SSR title/H1/description/answer: team pair + current state + competition + match number. Do not target generic `today` timing language on match pages and do not create duplicate team-pair pages. The existing `/cricket-schedule/today` hub owns timing intent; match pages own live-score and live-decision intent. Measure the same query-page pairs and intelligence events for 28 days before broadening the template.

Immediate correctness repair (2026-08-03): a raw-HTML audit found placeholder metadata on two of the ranking examples: the BR/SGR National T20 page appended `TEAM 1 vs TEAM 2` and emitted `No match name`, while a T20 Blast example reversed the long team order. `ea188c5` prevents placeholder short-team and series values from winning over canonical-slug parsing; `5e91ab6` complements it by keeping placeholder names out of match cards and deduplicating merged catalogue entries. The combined frontend image `20260803-placeholder-identity-r2-5e91ab6` is deployed and healthy. Normal and Googlebot SSR both now expose the real BR/SGR title, H1, and Afghanistan National T20 Cup description. This is a narrow identity repair, not the planned lifecycle-template experiment and not an indexing/ranking outcome claim.

| Query cluster | Landing-page family | Clicks | Impressions | CTR | Avg position | Change | Decision |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| Exact fixture live score | `/cric-live/{slug}` | | | | | | |
| Prediction / who will win | `/cric-live/{slug}` | | | | | | |
| Win probability / winning percentage | `/cric-live/{slug}` | | | | | | |
| Match schedule / discovery | `/live-score`, `/cricket-schedule/today` | | | | | | |

## 2. Intent funnel

| Landing-page family | `match_view` | `prediction_view` | `prediction_interaction` | `explanation_expand` | `alert_cta_click` | `relationship_join` | `repeat_match_visit` |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Canonical match pages | | | | | | | |
| Live-score hubs | | | | | | | |

## 3. Required event contract

### 2026-08-01 destination audit — measurement bridge exists, canonical page event is missing

Production HTML loads GA measurement `G-Y32H6PDB9Q`. The canonical `/cric-live/{slug}` surface now emits one browser-only `match_view` per match route with canonical slug/path, lifecycle, surface, anonymous session ID, landing path, referrer host, source attribution, and UTM fields. Frontend image `macubex/victoryline-frontend:20260801-canonical-match-view-r2-ec6de20` is deployed. The event bridge prefers `gtag`; it uses `dataLayer` only when `gtag` is unavailable or fails, preventing duplicate GA4 counts. The standalone Match Intelligence page continues to emit `prediction_view`, `prediction_interaction`, and `explanation_expand`.

The deployed bundle and normal/desktop/mobile Googlebot page probes are verified, but a real GA DebugView/destination receipt remains the evidence gate. Do not interpret browser-bridge code as confirmed engagement data until that receipt is captured.

All events need: `match_slug` when applicable, `match_path`, `lifecycle` (`upcoming|live|completed`), `surface`, `anonymous_session_id`, and landing/referrer attribution where permitted.

| Event | Trigger | Deduplication | Owner | Validation |
| --- | --- | --- | --- | --- |
| `match_view` | canonical match page becomes visible | once per page view | frontend | GA4 DebugView and dataLayer probe |
| `prediction_view` | probability module becomes visible | once per page view | frontend | GA4 DebugView and dataLayer probe |
| `prediction_interaction` | user expands/uses a prediction element | once per element/page view | frontend | GA4 DebugView and dataLayer probe |
| `explanation_expand` | explanation module opens | once per module/page view | frontend | GA4 DebugView and dataLayer probe |
| `alert_cta_click` | user selects the updates CTA | once per CTA/page view | frontend | GA4 DebugView and destination handoff |
| `relationship_join` | alert subscription completes | once per successful join | capture endpoint | persisted conversion record |
| `repeat_match_visit` | a later qualified match session occurs | once per session | analytics | session cohort query |
| `commercial_enquiry` | B2B lead submits | once per successful submit | lead endpoint | CRM/endpoint record |

## 4. Weekly decision rules

- Impressions with low CTR: improve lifecycle-specific title, H1, and the SSR-visible answer.
- Clicks with no prediction/explanation engagement: improve the first visible intelligence module; do not add pages yet.
- Engagement with no relationship join: test the owned next step and CTA placement.
- No recurring query demand and no engagement: consolidate or stop the surface.
- A new reusable page requires a distinct job, unique first-party explanation, and a canonical policy before development begins.
