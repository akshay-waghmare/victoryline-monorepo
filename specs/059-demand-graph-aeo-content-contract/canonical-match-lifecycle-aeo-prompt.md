# Reusable prompt: canonical match lifecycle AEO implementation

Use this prompt for the next CrickZen canonical match-page AEO pass.

```text
You are working on CrickZen's existing Angular SSR match page. Implement and verify a canonical match lifecycle AEO slice for `/cric-live/{slug}`.

Objective

Make the canonical match URL answer the user's immediate question from authoritative match data while preserving one canonical owner:

- upcoming: what match is scheduled, when, where, and what is still unconfirmed;
- live: the current lifecycle and verified score when present;
- innings break: the break state and verified score when present;
- completed: the official result and scorecard path;
- delayed or abandoned/no-result: the official lifecycle note without inventing a result.

Required implementation

1. Inspect the existing lifecycle resolver, match SEO service, SSR fallback, TransferState hydration, structured data, route policy, and tests before editing.
2. Add one top-level answer-first block to the canonical match page. It must be self-contained when extracted: teams, lifecycle, series, venue, scheduled time, score/result, and model explanation are included only when actually available.
3. Use the same pure lifecycle/data contract for Angular SSR and browser hydration. Treat a transferred authoritative cricket snapshot as populated even while a secondary match-info request is retrying. Do not let client hydration erase SSR JSON-LD, canonical metadata, or the populated answer before a refetch completes. If Angular SSR finishes its shell before the match-info template pass, inject the same snapshot-derived answer into the final crawler HTML rather than emitting a temporary answer.
4. Keep loading and error states out of indexable SSR. A loading/error state may be shown to a user only where the route is not indexable; otherwise the route must use the existing noindex/503/unavailable contract.
5. Reject unknown, placeholder, stale, synthetic, or unsupported values. Never render Team A/Team B, TBD, fake score, guessed result, fake venue, or unsupported probability.
6. Include CrickZen model probability or explanation only when the existing exact-match freshness/public-safety gate has passed. Label it as CrickZen model output, include refresh time when available, and keep the official score/result as the source of match state.
7. Preserve route ownership and canonical behavior. Do not create keyword-variant match URLs, change the canonical route policy, or make Match Intelligence indexable.

Focused tests required

- pure lifecycle contract: upcoming, live, innings-break, completed, delayed, abandoned, unknown;
- populated answer: fields and lifecycle-specific answer are present;
- loading state: no indexable AEO block;
- error state: no indexable AEO block and no invented facts;
- TransferState hydration: SSR match data produces the same answer before browser refetch;
- browser hydration after a secondary match-info retry retains one populated answer block from the transferred cricket snapshot;
- normal, desktop Googlebot, and mobile Googlebot raw HTML parity for the same populated URL;
- one H1, one self-canonical, index/follow only for valid populated canonical pages;
- child/legacy match routes retain canonical ownership and do not duplicate indexable content;
- malformed or unresolved match route remains 404/noindex;
- SportsEvent is emitted only with trustworthy startDate and location.

Rollout gate

Run focused tests, TypeScript/build checks, raw local SSR checks, and diff checks first. Deploy only from an isolated clean snapshot so unrelated dirty worktree changes are not included. Deploy backend first only if backend changes are in scope; otherwise deploy the frontend image only. Recheck the exact public URL, image tag/digest, normal/Googlebot/mobile HTML, canonical, robots, sitemap, JSON-LD, lifecycle text, and hydration-sensitive markup after deployment.

Evidence boundary

Report technical SSR, canonical, schema, hydration, and data-readiness evidence separately from Google discovery, indexing, rankings, organic traffic, engagement, repeat use, or AI citations. This deployment does not prove any of the latter outcomes.
```

## Variables to fill before reuse

- canonical URL and lifecycle sample;
- authoritative source snapshot and freshness timestamp;
- series, team, venue, and score/result fields actually present;
- exact model eligibility evidence, if any;
- local test command and isolated production image tag;
- public post-deployment checks and their timestamps.
