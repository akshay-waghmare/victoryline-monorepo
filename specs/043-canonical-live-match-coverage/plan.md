# Implementation Plan: Canonical Live Match Coverage

## Scope

Upgrade the canonical `/cric-live/{slug}` page from a technically strong score page into Crickzen's real live match coverage surface.

This plan covers:

- visible H1 and stronger top-of-page coverage framing
- curated `Live Match Updates` on the canonical page
- reuse of existing freshness/commentary extraction logic
- conditional FAQ rendering and schema parity
- trust pages, footer links, and global `Organization` schema
- selective `LiveBlogPosting`
- richer SSR/prerendered canonical match HTML

This plan does not change:

- canonical URL policy
- match lifecycle route strategy
- the one-canonical-match-page model

## Findings

- The canonical page already has solid canonical/meta/schema groundwork.
- The biggest missing UX and SEO layer is visible live coverage, not another metadata-only pass.
- Existing freshness-page logic already contains meaningful event detection that can be reused rather than recreated.
- Trust-page and organization-schema work is separate but naturally bundled with this phase because it supports article/publisher trust without changing route policy.

## Workstreams

1. **Spec assets**
   - Add `spec.md`, `plan.md`, and `tasks.md` for Spec 043.

2. **Canonical coverage framing**
   - Expose a visible H1 in the canonical match template.
   - Strengthen the top summary so score, status, tournament, venue, toss, innings, and updated time are visible and crawlable.
   - Keep the match page at-a-glance hierarchy intact while making the page read like live coverage.

3. **Live update model and mapper**
   - Define a shared `LiveMatchUpdate` shape.
   - Reuse meaningful commentary extraction patterns from freshness-page logic.
   - Synthesize toss, start, innings-break, chase, and result updates from match state when commentary alone is not enough.
   - Deduplicate and cap the visible update set.

4. **Canonical updates UI**
   - Add a visible `Live Match Updates` section to `CricketOddsComponent`.
   - Keep commentary available as deeper ball-by-ball detail rather than the only live-text surface.

5. **Conditional FAQ and schema parity**
   - Replace fixed FAQ generation with data-driven FAQ items.
   - Render and emit FAQ only from one shared source.
   - Keep existing baseline schema behavior.
   - Add selective `LiveBlogPosting` only after visible update cards exist.

6. **Trust and organization baseline**
   - Audit existing legal/trust pages.
   - Add missing trust pages.
   - Update footer links.
   - Emit global `Organization` schema.

7. **SSR/prerender enrichment**
   - Enrich prerendered canonical match HTML with stronger summary and update text.
   - Preserve canonical/meta consistency with Angular-rendered pages.

8. **Verification**
   - Add focused tests or checks for mapper logic and schema parity.
   - Validate sample canonical pages with raw HTML inspection.
   - Capture any remaining build or SSR verification gaps.

## Proposed File Targets

- `apps/frontend/src/app/cricket-odds/cricket-odds.component.html`
- `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts`
- `apps/frontend/src/app/shared/models/match.models.ts`
- `apps/frontend/src/app/features/seo-hubs/match-freshness-page/match-freshness-page.component.ts` or a shared helper extracted from it
- `apps/frontend/src/app/seo/structured-data.service.ts`
- `apps/frontend/src/app/shared/components/footer/footer.component.ts`
- `apps/frontend/src/app/layouts/admin-layouts/admin-layouts.routing.ts`
- `apps/frontend/scripts/prerender.js`

## Constraints

- Do not create a duplicate canonical live-blog route family.
- Do not emit schema that is not backed by visible page content.
- Prefer reuse of existing commentary/freshness logic over parallel implementations.
- Keep score-first hierarchy intact so coverage richness does not turn back into above-the-fold clutter.
- Keep changes minimal where existing systems already solve part of the problem.

## Suggested Delivery Order

1. Add spec assets and freeze the acceptance rules.
2. Implement visible H1 and coverage framing.
3. Build the live-update model and mapper.
4. Render canonical `Live Match Updates` UI.
5. Make FAQ conditional and schema-backed from the same source.
6. Add trust pages, footer links, and global `Organization` schema.
7. Gate and emit selective `LiveBlogPosting`.
8. Enrich prerendered canonical match HTML.
9. Run focused verification and record any remaining gaps.
