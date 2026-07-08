# Tasks: Above Fold At A Glance SEO Rebalance

- [x] Audit homepage, `/matches`, and canonical match-page hierarchy against Spec 042.
- [x] Create `specs/042-above-fold-at-a-glance-seo-rebalance/plan.md`.
- [x] Create `specs/042-above-fold-at-a-glance-seo-rebalance/tasks.md`.
- [x] Confirm homepage already matches the scoreboard-first and drawer-second pattern.
- [x] Move `/matches` related crawl hubs out of the pre-controls layer and into the secondary discovery drawer.
- [x] Move canonical match-page freshness and intent support sections below the tabbed interaction layer.
- [x] Keep deeper match support detail inside the `Match Details` secondary support area.
- [x] Run focused TypeScript verification and record the remaining browser-build OOM gap.

## Verification Notes

- `npx tsc -p src/tsconfig.app.json --noEmit` passed in `apps/frontend`.
- `npm run build:browser` starts but fails in the existing Angular build pipeline with Node/worker out-of-memory errors, even after raising `NODE_OPTIONS` heap size.
