---
name: crickzen-competitor-seo-ux-benchmark
description: Benchmark Crickzen surfaces and match-page SEO against current live-cricket competitors such as CREX, Cricbuzz, SofaScore, and ESPN Cricinfo. Use when the user asks to compare page structure, tabs, metadata, breadcrumbs, JSON-LD, or overall cleanliness; asks "how competitors do it"; wants a rating out of 10; or wants competitor lessons turned into safe Crickzen fixes without breaking canonical behavior.
---

# Crickzen Competitor SEO UX Benchmark

Use this skill to turn vague competitor-comparison requests into a repeatable audit that produces actionable Crickzen fixes.

## Workflow

1. Lock the audit scope before comparing.
   - Match page type and lifecycle state first: homepage, `/matches`, live hub, upcoming match page, live match page, or result page.
   - Compare like-for-like surfaces whenever possible.
   - Preserve Crickzen guardrails unless the user explicitly changes them:
     - keep `/cric-live/{slug}` canonical stable
     - do not recommend route churn just because a competitor uses a different path
     - do not trade away crawlable HTML for a cleaner hydrated UI

2. Collect paired URLs and current evidence.
   - Use live browsing for competitor checks because structure and metadata can change.
   - Capture exact URLs and page states, not generic homepages only.
   - Prefer one Crickzen URL plus 2-4 competitor equivalents for the same state.
   - If the user references "today", "upcoming", or "live", respond with exact dates in the analysis.

3. Audit the visible information architecture.
   - Note what is above the fold.
   - Note the default tab or lane for live, upcoming, and result states.
   - Note whether support content is foreground or background.
   - Capture whether the page feels score-first, state-first, or metadata-first.
   - Treat competitor lessons as structure lessons, not design cloning.

4. Audit raw SEO and structured data.
   - Inspect raw HTML where possible, not only the rendered browser view.
   - Check:
     - title quality and truncation
     - meta description quality and truncation
     - canonical
     - `robots`
     - `h1`
     - breadcrumb labels and destination semantics
     - JSON-LD types
     - `SportsEvent` minimum contract: `startDate` and `location`
   - Flag literal ellipses like `Texas Super...` as a real defect.
   - Prefer competitor-style semantic breadcrumbs such as `Cricket -> Series -> Match` over generic `Home -> Matches -> Match`.

5. Score the competitors and Crickzen on the same rubric.
   - Keep scoring simple and explicit.
   - Use a 10-point scale for page-level technical quality when the user asks "where do we stand?"
   - Default rubric:
     - UX clarity and hierarchy
     - metadata quality
     - breadcrumb quality
     - structured-data completeness
     - discovery/internal-link support
   - Separate "page quality" from "overall search competitiveness" when authority or brand moat is part of the answer.

6. Convert findings into safe Crickzen actions.
   - Favor changes that improve first-view clarity without harming SSR SEO.
   - Typical actions from this audit pattern:
     - move heavy support blocks behind calmer secondary surfaces
     - make lifecycle-aware tabs default correctly
     - repair metadata truncation
     - upgrade breadcrumb semantics
     - omit weak `SportsEvent` JSON-LD instead of emitting invalid fields
   - Keep recommendations tied to repo reality, not generic best practices.

7. Route implementation to the right repo skill.
   - Use `crickzen-match-surface-ux-pass` for hierarchy cleanup on homepage, `/matches`, hubs, or match pages.
   - Use `crickzen-match-seo-ops` for metadata, canonical, JSON-LD, and raw-HTML verification.
   - Use `crickzen-frontend-prod-rollout` only after the frontend fix is verified locally and scoped cleanly.

## Expected output

Return a compact audit with:

- exact URLs compared
- the main competitor pattern observed
- the biggest Crickzen gaps
- a rating when requested
- the safest next implementation slice

When the user wants code changes, stop treating the audit as a report and move directly into implementation with the matched skill.
