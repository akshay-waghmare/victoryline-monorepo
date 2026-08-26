# Tasks: CrickZen Public Prediction Product

## 0. Contract and ownership

- [x] T001 Review and approve the public route map and host boundary.
- [x] T002 Define public prediction, share-card, embed, pack, and API response schemas.
- [x] T003 Map every public field to the existing Spec 044 contract and source repository.
- [x] T004 Define freshness, cache, unavailable, error, and expiry semantics.
- [ ] T005 Define analytics events, required properties, and real-destination validation.

## 1. Public host and gateway

- [x] T101 Split `prediction.crickzen.com` public routing from `app.crickzen.com` operator routing.
- [ ] T102 Add a server-side public gateway that never exposes private dashboard/model URLs.
- [ ] T103 Add rate limiting, bounded response sizes, CORS policy, structured errors, and request metrics.
- [x] T104 Add public artifact storage/read-only serving for verified cards and packs.
- [ ] T105 Add host-aware canonical, robots, sitemap, and social metadata behavior.

## 2. Prediction and share card

- [x] T201 Build the public prediction landing page and eligible-match selector.
- [x] T202 Build `/how-it-works` with model inputs, explanation, freshness, uncertainty, limitations, and responsible use.
- [x] T203 Build the public result/card view from the public-safe model payload.
- [x] T204 Add stable `/share/{slug}` URLs with `noindex`, canonical match link, Open Graph image, and attribution.
- [ ] T205 Cover eligible, stale, unavailable, placeholder, and mismatched identity states.
- [ ] T206 Verify normal, mobile, Googlebot, SSR, hydration, and analytics behavior.

## 3. TrueOdds creator packs

- [ ] T301 Inventory the existing TrueOdds pack schemas, output assets, manifests, captions, and verification commands.
- [ ] T302 Extract a non-Streamlit pack adapter or service boundary.
- [x] T303 Define the public pack manifest and artifact URL policy.
- [x] T304 Publish `/creator-packs` with three verified sample-pack previews and a controlled sample-request path.
- [ ] T305 Publish `/partners` with attribution, formats, use cases, and enquiry path.
- [ ] T306 Publish `/media-kit` with approved logos, screenshots, descriptions, contact, and limitations.
- [ ] T307 Add approved pack listing/download and pack-verification tests.

## 4. Embed widget

- [x] T401 Build `/embed/{slug}` as a minimal public iframe surface.
- [x] T402 Add score, probability, timestamp, short explanation, fallback, and `Powered by CrickZen` attribution.
- [ ] T403 Add responsive/accessibility, cache, rate-limit, and cross-origin tests.
- [ ] T404 Add copyable embed code and integration instructions.

## 5. Developer API

- [ ] T501 Implement the v1 read-only public API endpoints.
- [ ] T502 Generate or maintain OpenAPI schemas and examples.
- [ ] T503 Document freshness, field meanings, errors, limits, attribution, and support.
- [ ] T504 Add API-interest and commercial-enquiry analytics.
- [ ] T505 Add external consumer contract tests and a bounded load test.

## 6. Production proof and distribution

- [x] T601 Run local focused tests and public SSR checks.
- [x] T602 Verify the public host does not expose Streamlit/operator controls.
- [x] T603 Deploy through an isolated snapshot with image/digest and rollback evidence.
- [ ] T604 Verify public HTML, API responses, share cards, widget, pack artifacts, robots, canonical, and sitemap behavior.
- [ ] T605 Run five creator/publisher pilot outreaches using verified samples.
- [ ] T606 Review qualified sessions, prediction engagement, pack use, embed loads, repeat visits, and partner enquiries.

## Definition of done

- [ ] Public product is live at `prediction.crickzen.com` without exposing operator tooling.
- [ ] Public prediction, methodology, share card, creator-pack, partner, media-kit, widget, and developer surfaces pass their relevant gates.
- [ ] TrueOdds remains the reusable pack-generation source, with verified manifests and no arbitrary public file access.
- [ ] Canonical match ownership remains on `www.crickzen.com/cric-live/{slug}`.
- [ ] Production proof distinguishes technical readiness from Google discovery, rankings, traffic, engagement, and business outcomes.
