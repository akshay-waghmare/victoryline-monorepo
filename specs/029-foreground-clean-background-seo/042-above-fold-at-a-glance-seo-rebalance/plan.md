# Implementation Plan: Above Fold At A Glance SEO Rebalance

## Scope

Do one coordinated hierarchy cleanup across:

- homepage confirmation
- `/matches` recovery
- canonical `/cric-live/{slug}` recovery

The goal is to keep score-first decision UI above the fold while preserving SSR-visible discovery links, fixture-specific support copy, and canonical SEO behavior.

## Findings

- Homepage already follows the intended pattern: hero, at-a-glance strip, match rail, then quieter support drawers.
- `/matches` still exposes a crawl-hub block above the tabbed browsing controls.
- Canonical match pages still expose support-heavy freshness and intent blocks before the tabbed interaction layer.

## Workstreams

1. **Spec assets**
   - Add `plan.md` and `tasks.md` for Spec 042 so the hierarchy rules, implementation order, and verification gates are documented.

2. **Homepage confirmation**
   - Keep the existing homepage hierarchy intact.
   - Do not re-open homepage structure unless verification shows a regression.

3. **`/matches` recovery**
   - Move the always-visible related hub links out of the pre-controls area.
   - Keep those crawlable links in the secondary discovery drawer.

4. **Canonical match-page recovery**
   - Remove support-heavy sections from the pre-tab zone.
   - Keep freshness links and the intent drawer present, but move them below the tab group.
   - Leave the `Match Details` tab as the place for deeper structured support content.

5. **Verification**
   - Run focused frontend type/build checks.
   - Confirm the served hierarchy markers still exist in templates and SSR-visible support content remains in HTML.

## Constraints

- Do not remove crawlable support links from SSR HTML.
- Do not change canonical routes, structured data behavior, or lifecycle tab defaults.
- Prefer minimal template reordering over new component systems.
