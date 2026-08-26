# Plan: CrickZen Public Prediction Product

## Continuity brief

CrickZen's current strategy keeps `/cric-live/{slug}` as the canonical score-first acquisition page and treats Match Intelligence as a differentiation and retention layer. The public prediction product should package existing model and TrueOdds capabilities for users, creators, and publishers without introducing duplicate match URL ownership.

The repository is broadly dirty with unrelated backend, scraper, frontend, artifact, and SEO changes. Implementation must remain additive and isolated from those files. Any production deployment must use an isolated clean snapshot and public artifact proof.

## Repo ownership

### VictoryLine monorepo

- Public host routing and public product UI.
- Public gateway/API adapter and safe response shaping.
- SSR, metadata, robots, canonical policy, hydration, analytics, and public route tests.
- Embed shell and developer/partner/media pages.

### Model repository

- Public-safe prediction payload and freshness/source semantics.
- Stable read-only public model endpoint or adapter.
- Model identity, probability, history, and explanation provenance.

### TrueOdds Video Studio

- Reusable pack/explanation/card/caption generation logic.
- Verified manifest and public artifact contract.
- Operator-facing Streamlit workflow and review boundary.

### Production routing and storage

- Split `prediction.crickzen.com` from `app.crickzen.com`.
- Keep dashboard/Streamlit operator routes private or authenticated.
- Provide a read-only public artifact location for approved cards and packs.

## Delivery phases

### Phase 0 - Contract and boundary (completed for the first implementation slice)

1. Approve this public-product spec and route ownership.
2. Freeze the public-safe response types by reusing Spec 044.
3. Define the host split: public prediction UI versus operator dashboard.
4. Inventory TrueOdds pack outputs, manifests, asset URLs, and verification commands.
5. Decide the first real match canary and the artifact storage boundary.

Exit gate: one reviewed contract maps every public route to an owner, source, cache/freshness rule, index policy, and analytics event. The host-aware shell and initial route ownership now satisfy this gate; the public API and verified-pack adapters remain later phase work.

### Phase 1 - Public prediction MVP (shell implemented; eligible-match production canary pending)

1. Add the public prediction landing page and eligible-match selector.
2. Add `/how-it-works` using the existing public-safe explanation/glossary concepts.
3. Add a public prediction result/card view with freshness, uncertainty, source line, disclaimer, and canonical match link.
4. Add stable share URLs and social metadata; keep share views `noindex`.
5. Add public analytics for prediction views, card shares, unavailable states, and canonical clicks.

Exit gate: one real eligible match passes normal/mobile/Googlebot SSR, hydration, public API, card, and canonical-link checks.

### Phase 2 - Creator and publisher surface

1. Extract or wrap the reusable TrueOdds pack contract without importing Streamlit into the public runtime.
2. Publish `/creator-packs` with three approved examples and explicit attribution/licensing rules.
3. Publish `/partners` and `/media-kit` with real screenshots, descriptions, formats, contact, and limitations.
4. Add approved pack listing/download endpoints backed by manifest verification.
5. Add pack-download, pack-use, partner-enquiry, and referral attribution events.

Exit gate: a creator can download a verified pack whose match identity, probability, caption, canonical URL, and assets agree.

### Phase 3 - Embed widget

1. Build a minimal iframe at `/embed/{slug}` from the same public-safe API.
2. Support responsive layout, accessible labels, loading/error/unavailable states, cache headers, and `Powered by CrickZen` attribution.
3. Add a copyable embed snippet on `/partners` or `/developers`.
4. Test cross-origin policy, rate limiting, stale-data handling, and failure isolation.

Exit gate: an external test page loads the widget without private endpoints or operator UI and shows correct data for an eligible canary.

### Phase 4 - Developer API

1. Publish versioned read-only endpoints and OpenAPI documentation.
2. Add examples for match listing, prediction reads, cards, and embed payloads.
3. Add response schemas, error codes, freshness semantics, rate limits, cache rules, and attribution requirements.
4. Add API-interest/enquiry tracking; keep API keys or higher quotas behind a later access process.

Exit gate: documentation and contract tests agree with the live endpoint, and abuse/capacity checks pass.

### Phase 5 - Distribution and measured expansion

1. Use the public product in five tailored creator/publisher pilots.
2. Offer the existing TrueOdds workflow as a recurring pack service before enabling public self-service rendering.
3. Publish one reproducible prediction audit or calibration study.
4. Review referral sessions, meaningful prediction interactions, pack use, embed loads, repeat visits, and partner renewal intent weekly.
5. Expand or stop features based on qualified use, not raw backlinks or page count.

## Technical sequence

1. Define TypeScript/JSON schemas for public prediction, share card, embed, and pack manifest responses.
2. Add a server-side adapter that reads the public model feed and verified pack artifacts.
3. Add route-level public UI components and host-aware canonical/robots metadata.
4. Add cache and freshness behavior per response type.
5. Add focused tests before touching production routing.
6. Split Caddy host routing in an isolated deployment slice.
7. Verify the public host, operator host, canonical match pages, API, widget, and Streamlit boundary together.

## Rollout gates

1. No public probability without exact identity, supported lifecycle, source, timestamp, and freshness state.
2. No public pack without a verified manifest and bounded public artifact URLs.
3. No public render queue until concurrency, storage, abuse, and cost limits exist.
4. No duplicate indexable match pages across `www.crickzen.com` and `prediction.crickzen.com`.
5. No production claim from source edits alone; verify running image/digest, host routing, public HTML, API responses, and widget behavior.
6. Preserve rollback copies for Caddy, frontend, gateway, and any model/pack adapter changed.

## Worktree boundary

Do not reset, clean, or stage unrelated dirty changes. The first implementation slice should touch only the new spec/contract files and isolated public-surface files. If host routing overlaps current production work, use the isolated CrickZen rollout workflow.
