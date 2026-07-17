# Spec 046: Clean, tabbed individual match page

## Objective

Reduce repeated facts and support copy on `/cric-live/{slug}` so the page reads like a compact CREX-style match centre: one hero, one primary tab rail, and deeper match intent opened inside tabs. Match Intelligence becomes a first-class tab instead of a separate competing block.

## Guardrails

- Keep `/cric-live/{slug}` as the canonical match URL; do not introduce child-route canonical migration.
- Preserve SSR-visible match title, H1, canonical, robots, breadcrumbs, FAQ/support links, and JSON-LD.
- Preserve lifecycle-aware defaults: live-like -> Commentary, upcoming -> Match Details, completed -> Scorecard.
- Do not duplicate hero facts in a second above-the-fold grid.
- Keep unavailable intelligence honest and do not change model, scraper, or score data behavior.

## Benchmark evidence

The bounded CREX inspection found the useful structural pattern on live match surfaces:

- compact match header with team abbreviations, scores, result/live state, and match context
- a small primary navigation: Match info, Live/Commentary, Scorecard
- deeper content appears after the tab choice rather than as multiple repeated cards above it
- match-specific details and commentary remain available in the same match surface

The in-app Playwright connection timed out while attaching to the CREX tab, so this is a structural benchmark from the live indexed CREX match surfaces, not a claim about pixel-level measurements. Before implementation, rerun a bounded Playwright audit against one current CREX live page and one current Crickzen page at desktop and mobile widths.

## Proposed information architecture

1. Match hero
   - breadcrumb/context
   - teams, scores, status/result, venue/series metadata
   - only essential quick actions

2. Primary tabs
   - Commentary / Live
   - Scorecard
   - Match Details
   - Lineups
   - Match Intelligence

3. Tab panels
   - remove repeated intro cards that restate the hero or the tab label
   - keep one short match-specific heading and one useful sentence where needed
   - place SEO support links inside the relevant tab panel or a quiet details drawer
   - keep intelligence modules grouped behind the Match Intelligence tab: prediction summary, factors, confidence, expected final, pressure/timeline, glossary/explanation

4. Secondary support
   - retain crawlable HTML links and support copy, but move them below the tab panel or inside the existing quieter details drawer
   - remove the standalone Match Intelligence CTA/SEO block from the first reading layer once the tab provides the same intent

## Implementation phases

### Phase 1 — Playwright audit and current-surface inventory

- Capture exact CREX and Crickzen URLs for live, upcoming, and completed states.
- Record visible order, tab labels, default tab, duplicate text/facts, viewport screenshots, and key DOM landmarks.
- Record raw HTML markers separately: title, H1, canonical, robots, JSON-LD types, match-specific commentary/scorecard/lineup phrases.
- Produce a gap matrix before editing.

### Phase 2 — Template hierarchy cleanup

- Update `apps/frontend/src/app/cricket-odds/cricket-odds.component.html` to make Match Intelligence a tab panel.
- Remove or consolidate standalone intelligence/SEO cards that duplicate hero and tab content.
- Keep SSR-visible intent copy, but make it concise and panel-specific.
- Ensure tab anchors and ARIA selected/panel relationships remain valid.

### Phase 3 — Component state and styling

- Update `cricket-odds.component.ts` only where tab registration, lifecycle default, or intelligence loading needs integration.
- Reuse the existing intelligence data service and components; no model/API contract changes.
- Adjust `cricket-odds.component.css` for a compact tab rail, clear active state, responsive overflow, and a calm intelligence panel.

### Phase 4 — Verification and regression gates

- Run focused lifecycle/intelligence unit tests.
- Run `npx tsc -p src/tsconfig.app.json --noEmit`.
- Run the frontend browser build.
- Verify SSR and post-hydration for a real current match URL.
- Verify normal and Googlebot-like raw HTML have the same canonical, robots, H1, JSON-LD, and match-specific intent phrases.
- Verify no duplicate visible hero facts above the fold.
- Verify live, upcoming, and completed default tabs remain correct.

## Acceptance criteria

- Match Intelligence is accessible from the primary tab rail and is not a separate competing above-the-fold section.
- The individual match page has one dominant hero facts surface.
- Commentary, scorecard, lineups, details, and intelligence each have one clear home.
- Repeated team/score/status/venue text is removed or moved to a secondary context.
- Canonical URL, indexability, SSR intent copy, and JSON-LD remain intact.
- Playwright screenshots/DOM notes and raw HTML checks are saved with the implementation verification.

## Out of scope

- route migration or child-route canonicals
- backend/scraper/model changes
- redesign of scorecard, commentary, lineup, or intelligence internals
- copying CREX branding or exact visual styling
