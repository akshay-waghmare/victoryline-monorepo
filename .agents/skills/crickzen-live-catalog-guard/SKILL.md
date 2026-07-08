---
name: crickzen-live-catalog-guard
description: Detect and prevent Crickzen live-catalog inflation, stale completed matches marked LIVE, lifecycle-sync circuit-breaker failures, scraper PID exhaustion, and homepage SSR degradation. Use after live-match incidents, scraper/backend changes, production restarts, or when the homepage shows too many or stale live matches.
---

# Crickzen Live Catalog Guard

Run the bundled audit before changing production:

```powershell
& .agents/skills/crickzen-live-catalog-guard/scripts/Audit-LiveCatalog.ps1
```

For production container evidence, include the SSH host:

```powershell
& .agents/skills/crickzen-live-catalog-guard/scripts/Audit-LiveCatalog.ps1 `
  -SshHost administrator@204.12.199.137
```

## Failure pattern

- High-frequency backend calls open the general API circuit breaker.
- Authoritative live and schedule syncs must use independent `backend_live_catalog` and `backend_schedule_lifecycle` breakers.
- Failed lifecycle sync must return/log failure, never a false success.
- Backend reconciliation exceptions must reach the HTTP controller so the scraper sees a non-2xx response.
- Homepage SSR must remain bounded even if the live catalog inflates.

## Triage order

1. Run the audit and preserve its JSON artifact.
2. Compare public live count with scraper discovery logs.
3. Search scraper logs for `backend.sync_live_matches.failed`, `matches.add.circuit_open`, `schedule.sync.circuit_open`, PID exhaustion, and browser-loop duplication.
4. Confirm backend, frontend, and scraper health.
5. Reconcile stale matches before restarting services.
6. Restart only the affected service using `crickzen-prod-restart`.
7. Rerun this audit and `crickzen-seo-health-pattern-audit`.

## Required proof

- Live count is plausible and contains no duplicate URLs.
- Lifecycle sync has recent successful entries and no repeated open-breaker failures.
- Scraper active match count agrees with the public live catalog.
- Homepage repeatedly returns full SSR with an H1 and match links.
- Backend, frontend, and scraper are healthy.
