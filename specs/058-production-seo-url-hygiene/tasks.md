# Tasks

## Evidence

- [ ] Reconcile the full advertised sitemap against the resolved catalogue.
- [ ] Run a separate recent/archive historical URL audit.
- [ ] Capture repeated normal and Googlebot status/TTFB samples after restart.

## Identity and sitemap policy

- [x] Add shared canonical slug validation for placeholder identities.
- [x] Resolve bare human-readable slugs against canonical catalogue records.
- [x] Keep stable-key aliases mapped to one canonical owner.
- [x] Add sitemap regression coverage for placeholder and no-result rows.
- [ ] Add URL-level sitemap exclusion diagnostics with reason counts.

## Schedule-first SSR

- [x] Derive upcoming lifecycle from a trustworthy future schedule timestamp.
- [x] Make retained-result enrichment terminal-only.
- [ ] Add a bounded schedule snapshot endpoint if public latency remains high.
- [ ] Prove cold/warm p95 and repeated 200 stability under bounded concurrency.

## Verification and rollout

- [ ] Run backend focused tests and compile.
- [ ] Run frontend syntax/type/build checks.
- [ ] Re-run the corrected full sitemap/status audit.
- [ ] Build and canary pinned production images.
- [ ] Resume timed GSC measurement only after technical health is clean.
