# Implementation Plan: Homepage CrickZen Brand Identity and Site Name Signals

## Continuity brief

The CrickZen constitution is v1.3.0 and the wiki mirror is synchronized on 2026-08-27.
The current SEO strategy maps each intent to one useful owning surface and requires
technical crawl/SSR proof to remain separate from Google indexing, ranking, traffic,
and business outcomes. The current production SEO-health baseline completed on
2026-09-01 with 2,188 unique sitemap URLs, zero duplicates, and zero failures.

The current worktree is already dirty with unrelated Spec Kit prompts, constitution
changes, OpenCode agents, and SEO-health artifacts. This plan does not reset, clean,
stage, or overwrite those changes.

## Target intent and page type

- **Page type**: homepage/site identity surface.
- **Observed query**: `crickzen` and the user's Google correction toward `cricket`.
- **Primary answer**: CrickZen is the product/site name; the homepage provides live
  cricket scores, schedules, results, and match intelligence.
- **Owning URL**: `https://www.crickzen.com/`.
- **Secondary evidence**: About/Contact/trust pages, public match metadata, verified
  external references, and natural user mentions.

## Implementation workstreams

### 1. Structured-data contract

1. Add `StructuredDataService.website()` with cleaned optional fields.
2. Add one homepage `WebSite` item before the existing `WebPage` item.
3. Add one homepage `Organization` item using the verified public logo URL and no
   unverified `sameAs` entries.
4. Change the shared `WebPage.isPartOf` name and URL to the same brand contract.
5. Standardize schema publisher/author/organizer names in the touched frontend source.

### 2. Metadata and visible brand consistency

1. Update static and runtime homepage title/description/OG site name to `CrickZen`.
2. Update logo defaults and explicit navbar/footer/splash/login/error labels.
3. Update About, Contact, Terms, and other public SEO copy where the exact product
   name is displayed.
4. Preserve all lowercase URLs, hostnames, asset filenames, analytics keys, and
   technical identifiers.
5. Do not turn placeholder footer social links into real links without ownership proof.

### 3. Focused test coverage

1. Test `website()` required and optional properties.
2. Test homepage schema composition contains one Website and one Organization with the
   exact contract.
3. Test `setPageSchemas()` emits one Website script and does not duplicate it on repeat.
4. Test brand-facing source strings and raw local SSR metadata/schema.
5. Run TypeScript, focused Angular tests, and production browser/server builds.

### 4. External activation and measurement

1. Deploy only after local gates pass, using an isolated frontend snapshot because the
   worktree is dirty.
2. Inspect the exact homepage in Search Console and request recrawl once; do not submit
   rotating match URLs for this brand issue.
3. Verify real owned profiles before adding any `sameAs` or footer URLs.
4. Track `crickzen` and `crickzen cricket` query impressions/clicks separately from
   technical schema readiness.
5. Recheck the homepage after a reasonable crawl interval; do not expect an immediate
   correction change.

## Scope boundaries

- Frontend homepage metadata, public brand labels, shared structured-data factory, and
  focused tests only.
- No backend, scraper, model, sitemap, canonical, robots, lifecycle, or analytics
  changes.
- No Google Indexing API calls, fake `sameAs` URLs, paid links, fake reviews, or bulk
  outreach.
- Production rollout is frontend-only and rollbackable; persistent data and unrelated
  services remain untouched.

## Verification matrix

| Gate | Pass condition | Evidence |
|---|---|---|
| Website factory | Required name, URL, alternate name, and optional description are emitted and cleaned | service spec |
| Homepage schema | Exactly one first-class Website and one Organization item are present | component/service spec + raw SSR |
| Metadata | Title, description, OG site name, logo labels, About/Contact/Terms use `CrickZen` | source audit + raw SSR |
| SSR parity | Normal, desktop Googlebot, and mobile Googlebot agree on brand identity | request matrix |
| SEO baseline | Sitemap/crawl audit remains zero-failure | timestamped audit JSON |
| Build | Frontend TypeScript and production browser/server build pass | command output |
| External signal | Only verified profiles/mentions are activated | operator evidence |
| Outcome boundary | No claim that Google changed its correction or indexed/ranked the site | final report |

## Rollback

Rollback is a frontend-only source/image rollback. Remove the homepage Website and
Organization additions, restore the prior brand strings, and redeploy the previous
frontend image. No backend, scraper, model, database, or persistent storage rollback is
required.

## Execution checkpoint — 2026-09-01

- Local app/spec TypeScript checks, JavaScript syntax checks, browser build, and server
  build passed.
- Local SSR returned `200` for normal, Googlebot, and Android user agents with one H1,
  `index,follow`, the canonical root URL, exactly one first-class `WebSite`, and one
  `Organization`.
- The first isolated image built from `HEAD` was `sha256:8492801784b7b...`; it was not
  promoted because another task had advanced production to `live-catalog-player-r2`.
- A combined player-preserving staging build was attempted but the shared legacy Docker
  client became idle during the server build and was cancelled before any production
  change.
- Production currently remains owned by the concurrent frontend/backend rollout. The
  public homepage was observed serving an 8,115-byte SSR fallback during that rollout;
  production deployment and Search Console observation remain open gates.
- The pre-deploy SEO audit at `20260901-072155` had zero failures. A later audit at
  `20260901-081856` had 9 transient failures during the shared rollout, so it is not
  treated as a clean post-change result.
