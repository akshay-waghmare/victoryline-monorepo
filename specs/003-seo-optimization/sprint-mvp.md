# MVP Sprint Plan — SEO Optimization for Crickzen

Branch: 003-seo-optimization
Scope: Deliver crawlable SSR pages for match/team/player with correct canonical/meta, JSON-LD, and social previews.
Duration: 1 sprint (7–10 working days)

## Outcomes (Exit Criteria)
- SSR for match, team, and player routes only (fallback to CSR on SSR failure; hydration errors logged).
- Canonical host always https://www.crickzen.com on SSR pages.
- JSON-LD valid for SportsEvent (match), SportsTeam/Organization (team), Person (player), + BreadcrumbList.
- Open Graph/Twitter tags present and correct; static OG images sized 1200×630.
- Quickstart checks pass for Canonical/JSON-LD/OG on sample pages.

## In-Scope (MVP)
- Setup and SSR for three routes + SEO services.
- Metadata + canonicals + JSON-LD + OG/Twitter tags.
- Snapshot tests for JSON-LD fixtures (match, team, player, breadcrumbs).

## Out-of-Scope (defer to next sprint)
- Sitemap and robots endpoints and gzipped partitions.
- CI budgets (Lighthouse, k6) beyond basic manual run.
- Live→final canonical flip job (policy documented; implement next).

## Task Checklist (exact IDs from tasks.md)

Phase A — Setup
- [ ] T001 Create SSR entry file apps/frontend/server.ts
- [ ] T002 Wire SSR Express adapter and helmet in apps/frontend/server.ts
- [ ] T003 Add SEO module scaffold apps/frontend/src/app/seo/seo.module.ts
- [ ] T004 Add MetaTagsService apps/frontend/src/app/seo/meta-tags.service.ts
- [ ] T005 Add StructuredDataService apps/frontend/src/app/seo/structured-data.service.ts
- [ ] T006 Add hydration error logger utility apps/frontend/src/app/seo/hydration-logger.ts
- [ ] T011 Update frontend package scripts apps/frontend/package.json

Phase B — SSR routing (US1 foundation)
- [ ] T031 [US1] Add match SSR route handler apps/frontend/server.ts
- [ ] T031a [US1] Add team SSR route handler apps/frontend/server.ts
- [ ] T031b [US1] Add player SSR route handler apps/frontend/server.ts

Phase C — Metadata + Canonical + Structured Data (US1)
- [ ] T032 [P] [US1] Implement match metadata in MetaTagsService apps/frontend/src/app/seo/meta-tags.service.ts
- [ ] T033 [P] [US1] Implement SportsEvent builder apps/frontend/src/app/seo/structured-data.service.ts
- [ ] T034 [US1] Inject BreadcrumbList on match pages apps/frontend/src/app/seo/structured-data.service.ts
- [ ] T035 [US1] Ensure canonical uses https://www.crickzen.com in SSR apps/frontend/src/app/seo/meta-tags.service.ts
- [ ] T036 [US1] Implement JSON-LD snapshot test tests/frontend/seo/jsonld-match.spec.ts
- [ ] T036a [US1] Implement JSON-LD snapshot test tests/frontend/seo/jsonld-team.spec.ts
- [ ] T036b [US1] Implement JSON-LD snapshot test tests/frontend/seo/jsonld-player.spec.ts

Phase D — Social Previews (US2)
- [ ] T039 [US2] Implement OG/Twitter tags in MetaTagsService apps/frontend/src/app/seo/meta-tags.service.ts
- [ ] T040 [P] [US2] Add static OG images mapping apps/frontend/src/app/seo/og-images.ts
- [ ] T042 [US2] Validate 1200x630 and safe margins apps/frontend/src/app/seo/og-images.ts
- [ ] T043 [US2] Add social preview e2e smoke test tests/frontend/seo/social-preview.spec.ts

Polish
- [ ] T065 Add error handling and CSR fallback guard apps/frontend/server.ts

Notes:
- T031a/T031b/T036a/T036b are additional granular tasks for team/player added within MVP scope even if not in base list.

## Sequencing and Owners
Day 1–2:
- Phase A (T001–T006, T011) — FE Dev A
- Phase B routes (T031, T031a, T031b) — FE Dev A

Day 3–5:
- Phase C metadata/JSON-LD (T032–T036b) — FE Dev B
- Snapshot tests + fixtures — FE Dev B

Day 6–7:
- Phase D social previews (T039–T043) — FE Dev C
- Polish (T065) — FE Dev A

Buffer / Spillover:
- Basic Lighthouse manual checks (devtools) on pages
- Quickstart verification for canonical/JSON-LD/OG

## Risks & Mitigations
- SSR regressions: Keep CSR fallback; test core flows manually.
- Incomplete data on entities: Use safe fallbacks for titles/descriptions/JSON-LD.
- Image assets missing: Use default OG image per FR-042.

## Demo Plan
- Show View Source on match/team/player page with canonical + meta tags
- Validate JSON-LD in Rich Results Test
- Validate OG preview in Facebook/Twitter validators

## Done Definition (MVP)
- All tasks above checked in and reviewed.
- Quickstart sections for Canonical/JSON-LD/OG pass on sample URLs.
- No 5xx on SSR routes; hydration errors logged but not blocking.
