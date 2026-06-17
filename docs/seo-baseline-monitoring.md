# SEO Baseline Monitoring

This document records the approved production SEO baseline after Phase 2. Do not start Spec 023 canonical migration yet.

## Current SEO Mode

SEO implementation is paused for `7-14` days except for bug fixes.

Current state:

- Phase 1: crawl graph fixed.
- Phase 2: intent hubs and `/live-cricket-score` fixed.
- Baseline monitoring document created.
- No risky canonical or runtime changes are approved.

Current work should be monitoring only:

- Google Search Console: indexing, impressions, queries, CTR, and canonical selection.
- SerpBear: keyword position movement.
- Raw HTML audit: run once after every deploy.

## What Not To Do Now

Do not start:

- `/live-cricket-score/{slug}` match URLs.
- Canonical migration.
- `301` redirect migration.
- Duplicate match aliases.
- More SEO route experiments.

Google needs time to crawl and evaluate the new hub structure and internal-link graph before another SEO architecture change.

## Current Production SEO State

- `/live-cricket-score` returns `200`.
- `/live-cricket-score` is self-canonical.
- `/live-cricket-score` uses `index,follow`.
- `/live-cricket-score` renders FAQ content in raw SSR HTML.
- `/live-cricket-score` exposes `360` raw `/cric-live/` links in production HTML.
- `/live-cricket-score` is included in the sitemap.
- `/live-cricket-score` is linked from nav, footer, and homepage.
- `/cric-live/{slug}` remains the canonical match page URL.
- No `/live-cricket-score/{slug}` match aliases should be exposed yet.
- No match canonical migration should happen yet.

## 7-Day Checklist

Every `2-3` days, check:

- Is `/live-cricket-score` indexed?
- Is `/live-score/today` indexed?
- Is `/live-score/ipl` indexed?
- Have any impressions started?
- Are any queries showing?
- Is there any canonical confusion?
- Are any `/cric-live/` pages losing visibility?

## Pages To Monitor In Google Search Console

- `/live-cricket-score`
- `/live-score`
- `/live-score/today`
- `/live-score/ipl`
- `/cricket-schedule/today`
- `/cricket-schedule/ipl-2026`
- `/live-score/archive`
- Current active `/cric-live/{slug}` pages

## Weekly Metrics To Record

For each monitored URL, record:

- Indexed status
- Impressions
- Clicks
- Average position
- Top queries
- CTR
- Crawl/indexing issues
- Canonical selected by Google, if visible

## SerpBear Starter Keywords

Hub keywords:

- live cricket score
- live cricket score today
- cricket live score
- cricket live score today
- today match live score
- today cricket match live score
- ipl live score
- ipl live score today
- ipl 2026 live score
- cricket schedule today
- today cricket match time
- aaj ka match live score
- live score hindi
- live score marathi

Match keyword template:

- `{team a} vs {team b} live score`
- `{team a} vs {team b} live score today`
- `{team a} vs {team b} scorecard`
- `{team a} vs {team b} toss time`
- `{team a} vs {team b} playing 11`
- `{team a} vs {team b} result`

## Baseline Period

Monitor this baseline for `7-14` days before deciding whether to run any `/live-cricket-score/{slug}` canonical migration experiment.

## Future Spec 023 Decision Rule

Only start a canonical migration experiment if all of these are true:

- `/live-cricket-score` hub gets indexed.
- `/live-cricket-score` starts receiving impressions.
- `/cric-live/{slug}` pages remain stable.
- No canonical confusion appears in Google Search Console.
- SerpBear or Google Search Console show at least some keyword movement.

The practical verdict for now is: stop coding SEO and observe. If the hub gets indexed, hubs start impressions, `/cric-live/{slug}` pages stay stable, and no canonical confusion appears after `7-14` days, then Spec 023 can be planned.

## Future Spec 023 Options To Compare Later

Option A: Keep `/cric-live/{slug}` forever as canonical.

Option B: Add `/live-cricket-score/{slug}` as an alias, but keep canonical as `/cric-live/{slug}`.

Option C: Use `/live-cricket-score/{slug}` canonical only for new future matches.

Option D: Fully migrate from `/cric-live/{slug}` to `/live-cricket-score/{slug}` with `301` redirects.

Do not implement Options B, C, or D now. This document is only the baseline monitoring plan.

## Reusable Skill Harvested

This session produced one reusable repo-local workflow:

- `crickzen-seo-baseline-monitor`: Use after SEO hub/canonical work, after production deploys, or during the baseline period to keep future agents focused on monitoring and raw HTML proof instead of starting risky canonical migrations too early.
