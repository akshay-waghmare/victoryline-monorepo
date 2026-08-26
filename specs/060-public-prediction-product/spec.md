# Feature Specification: CrickZen Public Prediction Product

**Feature Branch**: `060-public-prediction-product`  
**Created**: 2026-08-26  
**Status**: In Progress - public shell implemented; gateway and verified-pack phases pending  
**Input**: Public distribution plan, existing Spec 044 payload contract, and the reusable TrueOdds Video Studio match-pack workflow

## Purpose

Turn CrickZen's existing prediction and creator-pack capability into a public, trustworthy product at `prediction.crickzen.com`.

The public product must make prediction intelligence easy to understand, share, embed, and use by cricket creators and publishers. It must not expose the Streamlit operator studio, private dashboard controls, raw model features, credentials, customer state, or unsupported prediction claims.

This is an additive product layer. The main CrickZen site remains the score-first acquisition surface, and `/cric-live/{slug}` remains the canonical match URL.

## Existing capability to reuse

- VictoryLine already owns canonical match pages, the `/match-intelligence/{slug}` surface, SSR, metadata, canonical policy, and product analytics.
- The public Match Intelligence payload contract already defines public-safe match identity, score context, probability, freshness, explanations, probability history, and provenance.
- The model repository already exposes a public-safe prediction feed and public model serializer.
- TrueOdds Video Studio already contains reusable probability, explanation, card, social-caption, pack, manifest, and verification flows.
- Streamlit already acts as an operator-facing pack and publishing studio; it remains internal and is not the public UI.
- Production Caddy configuration currently routes `app.crickzen.com` and `prediction.crickzen.com` to the prediction dashboard. The rollout must split the public prediction host from operator/dashboard access before exposing public product routes.

Relevant existing artifacts:

- `specs/044-cricket-decision-intent-acquisition/shared-intelligence-payload-contract.md`
- `docs/match-intelligence-public-surface.md`
- `Caddyfile.prod`
- `C:/Users/ADMINS/Documents/projects/trueodds-video-studio/scripts/build_match_day_pack.py`
- `C:/Users/ADMINS/Documents/projects/trueodds-video-studio/scripts/crickzen_match_intelligence_reel.py`
- `C:/Users/ADMINS/Documents/projects/trueodds-video-studio/docs/TRAFFIC_CONTENT_ENGINE.md`

## Product boundary

```text
CrickZen canonical pages  ->  public-safe prediction contract  <-  model service
                                      |
                                      +-> prediction.crickzen.com
                                      +-> iframe widget
                                      +-> creator packs
                                      +-> developer API

TrueOdds Streamlit studio  ->  verified pack artifacts and manifests
                               (operator-only; no direct public exposure)
```

### Host responsibilities

| Host | Responsibility | Public policy |
|---|---|---|
| `www.crickzen.com` | Live scores, schedules, entities, and canonical match pages | Existing public SEO surface |
| `prediction.crickzen.com` | Prediction product landing, public cards, creator/publisher information, and public-safe reads | Public; no operator controls |
| `app.crickzen.com` | Dashboard and operator workflows | Authenticated/operator-only |
| Streamlit studio | Pack creation, review, manifest verification, and publishing handoff | Internal only |

## Public route map

The first public release uses these routes:

| Route | Purpose | Indexing policy |
|---|---|---|
| `/` | Predictor landing and eligible-match selection | Indexable after SSR/content gate |
| `/how-it-works` | Model explanation, inputs, freshness, calibration, limitations, and responsible use | Indexable |
| `/history` | Public prediction/audit history and methodology examples | Indexable only when data is complete and reproducible |
| `/creator-packs` | Pack examples, formats, attribution, request/use policy | Indexable |
| `/partners` | Creator, publisher, widget, and data partnership offer | Indexable |
| `/media-kit` | Logos, screenshots, product description, approved wording, and contact | Indexable |
| `/developers` | API documentation, examples, limits, and enquiry path | Indexable when an API contract is live |
| `/share/{slug}` | Shareable prediction card/result view | `noindex`; links to the canonical match page |
| `/embed/{slug}` | Minimal iframe content for publishers | `noindex`; requires visible CrickZen attribution |

The public subdomain MUST NOT create a second indexable copy of `/cric-live/{slug}`. Match-specific score and lifecycle intent remains owned by the canonical main-domain match page. A public share/card view may exist for distribution, but it must be `noindex` and link clearly to the canonical page.

## User stories

### User Story 1 - A visitor can understand a prediction (P1)

As a cricket fan, I want to see a current probability, the reasons behind it, its timestamp, and what could change it.

**Independent Test**: An eligible live or completed match renders a numeric probability, model label, freshness timestamp, explanation, uncertainty language, source attribution, and canonical match link; an ineligible match renders a truthful unavailable state without an invented percentage.

### User Story 2 - A visitor can share a prediction card (P1)

As a user or creator, I want to share a clean probability card or link without copying text manually.

**Independent Test**: The share action produces a stable public URL or image whose match identity, probability, timestamp, CrickZen attribution, and canonical match link match the verified payload.

### User Story 3 - A publisher can embed a live card (P1)

As a cricket publisher, I want a small live score/probability card that I can embed on my site.

**Independent Test**: A publisher can load an iframe for an eligible match and see score, probability, freshness, a short explanation, responsive layout, fallback state, and `Powered by CrickZen` attribution without exposing internal dashboard endpoints.

### User Story 4 - A creator can use a verified match pack (P1)

As a cricket creator, I want ready-to-use graphics, talking points, captions, and a source link.

**Independent Test**: A public pack listing or approved request returns only a verified manifest whose assets, caption, canonical URL, source status, and match identity agree.

### User Story 5 - A developer can understand the public API (P2)

As a publisher or developer, I want documented read-only endpoints and examples before requesting access.

**Independent Test**: The developer page contains an executable example, field definitions, freshness semantics, rate-limit policy, error states, and a contact/enquiry route.

### User Story 6 - A partner can evaluate CrickZen (P1)

As a creator, newsletter, podcast, or sports website, I want to understand the available formats and the correct way to credit CrickZen.

**Independent Test**: The creator, partnership, and media-kit pages show real samples, allowed use, attribution, limitations, contact, and no unsupported audience or accuracy claims.

## Public-safe data contract

The first public API and UI MUST reuse the existing shared intelligence contract. The minimum public fields are:

- stable match slug and human-readable teams/competition;
- lifecycle and status;
- score, overs, innings, target, batting team, and bowling team when available;
- rounded win probability only when exact, fresh, and model-backed;
- model label, probability source, freshness timestamp, and freshness state;
- short insight, reasons, what changed, what matters next, and capped prediction history;
- source status and canonical main-domain match URL;
- public disclaimer and limitation text.

The public contract MUST exclude raw training features, operator controls, bet history, customer state, internal file paths, credentials, unverified current XI claims, and unsupported player or market recommendations.

## API shape

The initial API is read-only and public-safe:

```text
GET /api/v1/public/matches
GET /api/v1/public/matches/{slug}
GET /api/v1/public/matches/{slug}/prediction
GET /api/v1/public/matches/{slug}/card
GET /api/v1/public/packs/{pack_id}
```

Later, after usage and capacity evidence:

```text
GET  /api/v1/public/matches/{slug}/embed
POST /api/v1/public/packs/requests
GET  /api/v1/public/developer/usage
```

The public routes MUST apply rate limiting, bounded response size, caching appropriate to freshness, CORS restrictions for API use, structured errors, and observability. Anonymous users must not be able to trigger arbitrary browser scraping, model startup, or video rendering.

## Creator-pack contract

The public pack response must be derived from an operator-verified TrueOdds manifest and include:

- `pack_id` and `generated_at`;
- match slug, teams, competition, and canonical CrickZen URL;
- source and verification status;
- probability, timestamp, reasons, caveat, and post-match audit state where available;
- asset list with public URLs, MIME types, dimensions, and attribution requirements;
- caption and source line;
- expiry or freshness policy;
- skipped stages and reasons when a stage is not supported.

The first release exposes approved packs and downloads. Self-service heavy rendering is a later phase using a queue, concurrency limit, storage policy, abuse controls, and an operator review path.

## Functional requirements

- **FR-001**: `prediction.crickzen.com` MUST show a public product surface, not the operator dashboard.
- **FR-002**: The public surface MUST use a public-safe API boundary and MUST NOT proxy private dashboard routes directly.
- **FR-003**: Every probability MUST carry a model source and freshness timestamp; stale, missing, placeholder, or mismatched data MUST render an unavailable or non-probability state.
- **FR-004**: Every public prediction result MUST link to the canonical `www.crickzen.com/cric-live/{slug}` page.
- **FR-005**: Share cards MUST include match identity, probability, timestamp, CrickZen attribution, disclaimer, and canonical link metadata.
- **FR-006**: Embed output MUST be responsive, accessible, cache-aware, failure-tolerant, and visibly attributed.
- **FR-007**: Creator packs MUST be manifest-bound and must reuse verified TrueOdds artifacts rather than arbitrary local files.
- **FR-008**: The public UI MUST not expose Streamlit, operator controls, raw paths, private APIs, tokens, or render-triggering shell operations.
- **FR-009**: The API MUST be versioned, read-only in v1, rate-limited, documented, and covered by contract tests.
- **FR-010**: Public pages MUST have explicit ownership, support/contact, privacy/terms, and responsible-use language.
- **FR-011**: Public and canonical match pages MUST not create duplicate indexable match URL families.
- **FR-012**: Analytics MUST distinguish prediction views, card shares, embed loads, pack downloads, developer interest, partner enquiries, return visits, and failures.
- **FR-013**: The implementation MUST preserve the current CrickZen lifecycle, SSR, canonical, hydration, and public-data truth gates.

## Security and capacity requirements

- Keep Streamlit and dashboard operator routes on `app.crickzen.com` or another authenticated operator boundary.
- Use a server-side adapter for model and pack data; do not expose private service addresses to the browser.
- Store public artifacts in an explicit read-only public artifact location; never serve arbitrary files from the TrueOdds workspace.
- Do not accept arbitrary URLs, shell commands, local paths, or unvalidated match identifiers from public requests.
- Add response caching and stale-while-revalidate only when the cache state is visible and does not present stale probability as current.
- Add request, error, latency, cache, and artifact-verification metrics before partner outreach.

## SEO and distribution policy

- Index the public explanation, creator, partnership, media-kit, and reproducible history pages when they are complete.
- Keep share and embed views `noindex` unless a later evidence gate proves a distinct search job and unique value.
- Link from the public prediction product to canonical match pages; do not change canonical match ownership for backlink reasons alone.
- Use creator and publisher links to drive qualified sessions, prediction interactions, pack use, and repeat visits.
- Do not claim ranking, indexing, traffic, or revenue gains from a public page or backlink without timed evidence.

## Out of scope for v1

- A public version of the Streamlit interface.
- Arbitrary anonymous video generation.
- Premium entitlements, payments, or customer dashboards.
- Betting recommendations, guaranteed outcomes, or affiliate funnels.
- A second indexable page for every match.
- A fully open, unlimited API.
- Automatic publishing to creator accounts or communities.

## Definition of done

- `prediction.crickzen.com` serves the intended public product surface and no operator controls.
- `/how-it-works`, `/creator-packs`, `/partners`, and `/media-kit` are complete and truthful.
- One real eligible match passes the public prediction, share-card, and canonical-link contract.
- One approved TrueOdds pack passes manifest, artifact, attribution, and source verification.
- An iframe widget loads with score, probability, timestamp, explanation, fallback, and attribution.
- The v1 API and developer documentation pass contract tests and rate-limit checks.
- Normal, mobile, and Googlebot requests pass the relevant SSR, robots, canonical, hydration, and security checks.
- Analytics events are received at the real destination for prediction view, share, embed, pack download, and partner enquiry.
- The production rollout identifies the running image/digest, host routing, public endpoint responses, and exact rollback boundary.
- No claim is made that public exposure proves Google indexing, ranking, traffic, or business value.
