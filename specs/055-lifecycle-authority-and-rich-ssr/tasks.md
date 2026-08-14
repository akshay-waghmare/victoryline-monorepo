# Tasks

- [x] T001 Record lifecycle-authority contract.
- [x] T002 Implement retained rich snapshot SSR fallback.
- [x] T003 Block indexable thin/neutral fallback responses.
- [x] T004 Align catalogue/hub and sitemap lifecycle owner.
- [x] T005 Verify local and production lifecycle parity.

## Deployment evidence — 2026-08-15

- Production backend: `macubex/victoryline-backend:20260815-lifecycle-authority-r1`
- Production frontend: `macubex/victoryline-frontend:20260815-lifecycle-authority-r2`
- The `10MT` canonical snapshot reports `INNINGS_BREAK`, `Stumps`, and `BAN lead by 153 runs`.
- The same match appears once in the live feed and zero times in upcoming/completed feeds.
- The alternate `1st-match` slug returns a permanent redirect to the `1st-test` owner. The published sitemap contains the owner once and the alias zero times.
- Final SSR verification: the canonical `SportsEvent` schema publishes `EventInProgress`, matching the `INNINGS_BREAK` resolver outcome; the raw HTML contains neither `Upcoming match`, `Match completed`, nor the temporary-loading fallback.
