# Execution Prompt: Homepage CrickZen Brand Identity and Site Name Signals

Act as CrickZen's senior technical SEO and frontend SSR engineer. Implement a narrow,
truthful brand-identity slice for `https://www.crickzen.com/` so Google receives a
consistent preferred site name, without claiming that any search engine can be forced
to remove a spelling suggestion or index a page.

## Context

The user reports that Google suggests `cricket` when searching for `crickzen`. The
homepage is live and discoverable, but the current source uses `Crickzen` in many public
strings and its homepage JSON-LD has a `WebPage` with nested `isPartOf.WebSite` rather
than a first-class homepage `WebSite` item. The SEO-health baseline on 2026-09-01
reported 2,188 unique sitemap URLs, zero duplicates, and zero failures. The repository
worktree is dirty with unrelated user work; preserve it.

## Objective

Make the homepage and shared public brand surfaces consistently identify:

- preferred display name: `CrickZen`;
- optional alternate site name: `crickzen.com`;
- canonical site URL: `https://www.crickzen.com/`;
- verified logo URL: `https://www.crickzen.com/assets/img/logos/crickzen-circular-logo-512.png`.

## Required implementation

1. Inspect the existing `StructuredDataService`, homepage schema composition, metadata
   service, SSR fallback/prerender path, logo component, navbar, footer, About, Contact,
   Terms, public prediction, match metadata, and tests before editing.
2. Add a deterministic `StructuredDataService.website()` factory supporting `name`,
   `url`, optional `alternateName`, and optional `description`. Omit undefined values
   using the existing cleaner.
3. Add exactly one first-class homepage `WebSite` JSON-LD item:

   ```json
   {
     "@context": "https://schema.org",
     "@type": "WebSite",
     "name": "CrickZen",
     "alternateName": "crickzen.com",
     "url": "https://www.crickzen.com/",
     "description": "Live cricket scores, match schedules, results, and match intelligence from CrickZen."
   }
   ```

4. Add one first-class homepage `Organization` item with `name = CrickZen`, the
   canonical URL, and the verified logo URL. Do not add `sameAs` until a profile is
   verified as owned by CrickZen and its exact URL is recorded.
5. Keep the existing homepage `WebPage`, discovery `ItemList` items, and canonical
   ownership. Change `WebPage.isPartOf.name` and shared public publisher/author/
   organizer names to `CrickZen` so the graph is consistent.
6. Update static and runtime homepage title/meta/OG values, logo defaults and explicit
   logo labels, navbar/footer/splash/login/error labels, About/Contact/Terms copy, and
   public SEO/schema copy where `Crickzen` is the product brand. Preserve lowercase
   URLs, hostnames, filenames, analytics keys, storage keys, and technical IDs.
7. Do not create keyword pages, add hidden text, add keyword stuffing, invent social
   profiles, change sitemap/canonical/robots/lifecycle/model behavior, or call the
   Google Indexing API.

## Focused tests required

- Website factory emits the exact required fields and omits undefined optional fields.
- Homepage schema composition contains one first-class Website and one Organization.
- Repeated page-schema replacement does not duplicate first-class Website items.
- Shared WebPage `isPartOf` uses `CrickZen` and the canonical root URL.
- Public brand-facing source strings use `CrickZen` while lowercase technical tokens are
  unchanged.
- Local production SSR homepage exposes title, description, canonical, one H1,
  `index,follow`, exactly one Website item, and one Organization item.
- Normal, desktop Googlebot, and mobile Googlebot raw homepage responses agree on the
  above contract.
- The existing SEO-health audit remains zero-failure.

## Rollout gate

Run focused tests, TypeScript checks, production browser/server build, raw SSR parsing,
and diff checks first. Because the worktree is dirty, use an isolated clean snapshot
with an explicit frontend overlay for production. Verify the image tag/digest and exact
public homepage after rollout. Keep a named previous frontend image as rollback. Do
not touch backend, scraper, model, persistent storage, or unrelated dirty files.

## External activation checklist

After the code is live:

1. Inspect `https://www.crickzen.com/` in Search Console and request recrawl once.
2. Verify real official profiles before linking them from the footer or adding them to
   `Organization.sameAs`.
3. Use natural, user-driven brand mentions; do not purchase links or manufacture
   searches/reviews.
4. Measure `crickzen` and `crickzen cricket` as separate Search Console queries.
5. Allow days to weeks for Google to recrawl/process the site name. A request is not an
   indexing or ranking result.

## Evidence boundary

Report separately:

- **Technical proof**: source contract, focused tests, raw SSR, Googlebot parity,
  canonical/robots/H1, schema counts, image/digest, and SEO-health audit.
- **Search outcome**: Google's displayed correction, crawl, index selection, rankings,
  impressions, clicks, CTR, traffic, AI citations, and brand demand.

The implementation is successful only when the technical contract is proven. The search
engine may still keep the correction, and that remains an observation rather than a code
failure.

