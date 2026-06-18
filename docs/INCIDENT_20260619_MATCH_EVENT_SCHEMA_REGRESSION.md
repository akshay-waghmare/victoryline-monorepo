# Incident 2026-06-19: Match Event Schema Regression

## Summary

Google Search Console surfaced invalid Event items on match pages with:

- missing required field `location`
- missing required field `startDate`

At the same time, match-page clicks had fallen sharply. This issue mattered because invalid `SportsEvent` items are not eligible for Event rich results.

## What Had Already Been Fixed Before

On 2026-06-03, commit `84bb547` fixed one earlier schema problem:

- match pages could emit `SportsEvent` without a trustworthy `location`

That rollout hardened venue extraction and updated the audit script to fail if a `SportsEvent` was emitted without `location`.

Reference:

- `docs/ROLLUP_20260603_GUEST_REDIRECT_AND_JSONLD_LOCATION.md`

## Why The Issue Creeped Back In

This was not the exact same bug returning unchanged. It was a partial prior fix plus a later enhancement pass that reintroduced schema fragility through a different required field.

### Regression chain

1. The June 3 fix hardened `location`, but it did not establish a full required-field contract for `SportsEvent`.
2. The June 18 rich-match SSR pass (`7ee613f`) expanded match-page SEO output and still derived `SportsEvent.startDate` from the narrow path:
   - `this.matchInfo.match_date`
3. That source was too fragile:
   - it could be absent when `currentMatch.scheduledStartTime` was already known
   - it could be non-ISO or ambiguously formatted, which let JavaScript parse it incorrectly
4. In production, this produced a visible example where the page emitted:
   - `startDate = 2001-06-19T06:00:00.000Z`
   for a 2026 fixture
5. Our audit process did not catch the regression because `scripts/Audit-MatchSeo.ps1` only failed fast on:
   - missing `location`
   - invalid JSON-LD parsing
   It did **not** fail on missing `startDate`.

## Root Cause

The real root cause was a **contract gap**:

- we treated `location` as the only required-field regression worth auditing
- we did not enforce the full required-field bundle for Event eligibility
- later feature work reused a narrow date source without a regression check on crawler-visible output

In short:

- previous fix: field-specific hardening
- missing guardrail: bundle-level validation for required Event fields

## Fix Shipped On 2026-06-19

Commit:

- `5898287` - `fix(seo): harden match event structured data`

### Code changes

- `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts`
  - added stronger `startDate` fallback order:
    - `currentMatch.scheduledStartTime`
    - `currentMatch.startTime`
    - `matchInfo.start_date`
    - `matchInfo.match_date`
  - emit `SportsEvent` only when both `startDate` and `location` are trustworthy
  - enrich the event with `offers`, `image`, and `organizer`
  - infer a basic `location.address` from string venues when possible

- `apps/frontend/src/app/seo/structured-data.service.ts`
  - extended `sportsEvent()` to support:
    - `image`
    - `organizer`
    - `endDate`

- `apps/frontend/src/app/seo/structured-data.service.spec.ts`
  - added structured-data coverage for the richer event shape

### Audit hardening

- `scripts/Audit-MatchSeo.ps1`
  - now flags:
    - `SPORTSEVENT_LOCATION_MISSING`
    - `SPORTSEVENT_STARTDATE_MISSING`

This closes the exact blind spot that allowed the regression through.

## Verification

### Before fix

The sampled production match page emitted a bad event date:

- `startDate = 2001-06-19T06:00:00.000Z`

### After fix

The same public page emitted crawler-visible SSR JSON-LD with:

- `startDate = 2026-06-19T00:30:00.000Z`
- `location.name = Grand Prairie Cricket Stadium, Dallas`
- `location.address.addressLocality = Dallas`
- `organizer` present
- `image` present
- `offers` present

Desktop Googlebot and mobile Googlebot both received the same raw JSON-LD in the initial HTML response.

## Prevention Rules

Going forward, match-page schema changes should follow these rules:

1. Treat `SportsEvent` required fields as a bundle, not as isolated one-off fixes.
2. If trustworthy `startDate` or `location` is missing, omit `SportsEvent` rather than emitting an invalid one.
3. Run `scripts/Audit-MatchSeo.ps1` after any match-page SEO/schema change.
4. Verify one public sample with a Googlebot user agent, not only a normal browser UA.
5. Document every schema-specific prod rollout with exact before/after JSON-LD proof.

## Where The Guardrail Lives Now

This prevention logic is now encoded in the repo, not only in this write-up:

- `scripts/Audit-MatchSeo.ps1`
  - fails on missing `SportsEvent.location`
  - fails on missing `SportsEvent.startDate`
- `.agents/skills/crickzen-match-seo-ops/SKILL.md`
  - requires bundle-level `SportsEvent` validation
  - requires Googlebot parity verification on a public sample

That matters because the next person doing match-page SEO work should hit the guardrail during the normal audit flow instead of needing to rediscover this incident from Search Console.

## Operational Follow-up

Search Console will not clear the issue instantly. Google still needs to:

- recrawl the page
- reprocess the structured data
- refresh the Event enhancement report

If clicks do not recover after recrawl, the next investigation path should focus on:

- crawl discovery strength
- indexing latency
- result-surface competition

rather than assuming the schema issue was the only ranking or CTR factor.
