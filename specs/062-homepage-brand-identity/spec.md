# Feature Specification: Homepage CrickZen Brand Identity and Site Name Signals

**Feature ID**: `062-homepage-brand-identity`
**Status**: Implemented locally; production rollout and Google observation pending
**Target surface**: `https://www.crickzen.com/`
**Current worktree**: Existing feature branch `052-newsarticle-schema-eligibility`; no branch switch is performed because the worktree contains unrelated user changes.

## Problem statement

When a user searches Google for `crickzen`, Google may suggest `cricket` because the
brand is still a low-frequency, unfamiliar query. This is a brand-entity recognition
problem, not evidence that the CrickZen domain, sitemap, or match canonical policy is
broken.

The current public homepage is reachable and discoverable, but its brand signal is not
fully consistent:

- the title, description, and Open Graph metadata use `Crickzen` rather than the
  preferred display name `CrickZen`;
- the homepage emits a `WebPage` JSON-LD item with a nested `isPartOf` `WebSite`, but
  does not emit a first-class homepage `WebSite` item;
- several public brand surfaces use the old casing in logo labels, trust pages,
  metadata helpers, and schema defaults;
- footer social links are placeholders, so they must not be advertised as real brand
  references until verified accounts exist.

Google's site-name system is automated. It considers the homepage and references to the
site elsewhere, and Google recommends a homepage `WebSite` structured-data item with a
preferred `name`, canonical `url`, and optional `alternateName`. This implementation
can improve the evidence Google receives; it cannot force removal of a spelling
suggestion, indexing, ranking, or a knowledge panel.

## Goals

1. Give Google one explicit, valid homepage site identity:
   - `@type`: `WebSite`
   - `name`: `CrickZen`
   - `alternateName`: `crickzen.com`
   - `url`: `https://www.crickzen.com/`
2. Keep the existing homepage `WebPage` and discovery JSON-LD useful while relating it
   to the same preferred `CrickZen` site name.
3. Add a truthful top-level `Organization` identity on the homepage using the verified
   CrickZen logo URL, without unverified `sameAs` profiles.
4. Standardize `CrickZen` casing across public logo labels, title/meta copy, trust pages,
   schema publishers/authors, and generated SSR fallback copy.
5. Preserve the existing canonical route, lifecycle rules, SSR/hydration behavior,
   sitemap partitions, and evidence boundary.

## Non-goals

- Do not create a `/cricket` or brand-keyword landing page.
- Do not add keyword stuffing, hidden text, fake searches, fake reviews, or fabricated
  backlinks/social profiles.
- Do not change match canonical ownership, sitemap membership, robots, lifecycle
  eligibility, model output, or Google Indexing API behavior.
- Do not claim that structured data removes Google's correction or guarantees indexing,
  rankings, traffic, AI citations, or business outcomes.
- Do not add `sameAs` URLs until each profile is verified as owned by CrickZen and its
  exact public URL is recorded as evidence.

## User scenarios and acceptance scenarios

### User Story 1 — Google can identify the site name

As a search engine, I need the homepage to expose one consistent site name and
canonical home URL so that `CrickZen` is distinguishable from the generic cricket topic.

**Independent test**: Render `/` through SSR, parse all JSON-LD scripts, and assert one
top-level `WebSite` item with the required name, alternate name, and canonical URL.

Acceptance scenarios:

1. Given the homepage is rendered normally or for Googlebot, when JSON-LD is parsed,
   then exactly one first-class `WebSite` item has `name = CrickZen` and
   `url = https://www.crickzen.com/`.
2. Given the `WebSite` item is parsed, then `alternateName = crickzen.com` is present
   and no generic `Cricket` site name is emitted.
3. Given the existing homepage `WebPage` is emitted, then its nested `isPartOf` site
   name also uses `CrickZen` and the same canonical origin.

### User Story 2 — Public brand surfaces agree

As a user who sees the site in search, navigation, trust pages, or a shared result, I
need the same `CrickZen` spelling everywhere so that the name is reinforced naturally.

**Independent test**: Inspect the homepage, navbar/logo, footer, About, Contact,
Terms, match metadata/schema defaults, and SSR fallback templates for the preferred
display spelling.

Acceptance scenarios:

1. The homepage title, description, Open Graph site name, and visible brand labels use
   `CrickZen`.
2. Logo alt text and displayed logo text use `CrickZen Live Cricket` and `CrickZen`.
3. About, Contact, Terms, footer, match metadata, and public prediction metadata use
   `CrickZen` when referring to the product brand.
4. Lowercase technical identifiers, storage keys, hostnames, email addresses, asset
   paths, and URLs remain unchanged.

### User Story 3 — Brand evidence remains truthful

As the CrickZen operator, I need external brand evidence to be real and attributable,
so that the SEO work does not create spam or misleading entity signals.

**Independent test**: Review the external activation checklist and confirm no
unverified social URL is inserted into `sameAs` or footer links.

Acceptance scenarios:

1. The code contains no fabricated social profile URL.
2. The external checklist records profile ownership and exact URL before any `sameAs`
   update.
3. Search Console recrawl/indexing requests are recorded as requests/observations,
   never as proof of ranking or indexing.

## Functional requirements

- **FR-001**: `StructuredDataService` MUST expose a deterministic `website()` factory
  with `name`, `url`, optional `alternateName`, and optional `description`.
- **FR-002**: `HomeComponent` MUST include exactly one first-class `WebSite` item in
  its page schemas with `CrickZen`, `crickzen.com`, and the canonical root URL.
- **FR-003**: `HomeComponent` MUST include one top-level `Organization` item with
  the verified CrickZen logo URL and no unverified social profile URLs.
- **FR-004**: Existing `WebPage.isPartOf` output MUST use `CrickZen` and the same
  canonical site URL.
- **FR-005**: Homepage static fallback metadata and runtime metadata MUST use
  `CrickZen` consistently while retaining descriptive cricket intent.
- **FR-006**: Public brand labels and schema publisher/author defaults in the touched
  frontend surface MUST use `CrickZen`; lowercase technical tokens MUST be preserved.
- **FR-007**: SSR and browser page-schema replacement MUST not emit duplicate first-class
  `WebSite` items or remove the site identity during hydration.
- **FR-008**: The implementation MUST NOT modify canonical ownership, robots, sitemap,
  lifecycle, model, analytics, or Google Indexing API behavior.
- **FR-009**: Tests MUST cover the website factory, homepage schema composition, casing,
  duplicate prevention, and raw SSR output.
- **FR-010**: The result report MUST separate code/schema readiness from Google's
  correction, crawling, indexing, ranking, traffic, and business outcomes.

## Technical contract

Expected homepage site identity:

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

The `Organization` item may use:

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "CrickZen",
  "url": "https://www.crickzen.com/",
  "logo": {
    "@type": "ImageObject",
    "url": "https://www.crickzen.com/assets/img/logos/crickzen-circular-logo-512.png"
  }
}
```

No `sameAs` value is part of the code contract until an owned profile is verified.

## Success criteria

- **SC-001**: Focused structured-data tests pass with a first-class `WebSite` item,
  required properties, and a first-class `Organization` item.
- **SC-002**: Local production SSR renders exactly one first-class `WebSite` item on
  `/`, one `Organization` item, one canonical, one H1, and `index,follow`.
- **SC-003**: Normal, desktop Googlebot, and mobile Googlebot raw homepage responses
  agree on title, canonical, robots, H1, and brand schema.
- **SC-004**: No touched public production source retains the old `Crickzen` casing
  where it describes the brand; lowercase technical tokens remain unchanged.
- **SC-005**: The current SEO-health audit remains at zero failures after the change.
- **SC-006**: The implementation is documented as technical readiness only. Google's
  spelling suggestion, indexing, ranking, traffic, and business outcomes remain open
  observations.

