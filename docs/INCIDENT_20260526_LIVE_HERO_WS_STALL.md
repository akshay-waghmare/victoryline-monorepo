# Incident: Live Hero Score Stall While Prod Data Stayed Fresh

**Date**: 2026-05-26  
**Severity**: High — live match page hero stopped advancing even though scraper/backend data was fresh  
**Status**: Resolved in code, prod services restarted

---

## Symptom

- Users reported the IPL live hero on `crickzen.com` was stuck
- Public live data endpoints were still returning fresh scores
- Scraper logs showed continued successful pushes for the same match

Example match during the incident:

- `gt-vs-rcb-qualifier-1st-match-indian-premier-league-2026-match-updates-11XJ`

---

## What prod showed

### Fresh backend data

Public API kept moving during the incident:

```text
updated=1779805370380 score=50-1 over=4 batting=RCB
updated=1779805400815 score=51-1 over=4.1 batting=RCB
```

After the service restart:

```text
updated=1779806050293 score=76-1 over=6 batting=RCB
```

### Healthy scraper/backend

- `victoryline-scraper` healthy and pushing live payloads
- `victoryline-backend` healthy
- `GET https://www.crickzen.com/api/ws/info` returned `200`

Scraper evidence:

```text
matches.push.start  ... gt-vs-rcb-...-11XJ
matches.push.success ... gt-vs-rcb-...-11XJ
```

---

## Root Cause

This was **not** a scraper outage.

It was a frontend live-update wiring bug with two contributing problems:

### 1. Unsupported wildcard STOMP subscriptions

The frontend subscribed to:

```text
/topic/cricket.<match>.*
```

But the backend publishes **exact per-field destinations**:

```text
/topic/cricket.<match>.score
/topic/cricket.<match>.over
/topic/cricket.<match>.batsman_data
/topic/cricket.<match>.commentary
...
```

Relevant backend code:

- `apps/backend/spring-security-jwt/src/main/java/com/devglan/websocket/service/CricketDataService.java`

Relevant frontend code before fix:

- `apps/frontend/src/app/match-live/services/live-hero-state.service.ts`
- `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts`

Because the match page subscribed to a wildcard destination that the simple broker does not publish, the page could load the initial HTTP snapshot and then stop advancing.

### 2. Hero service did not re-enter Angular's zone

`LiveHeroComponent` uses `ChangeDetectionStrategy.OnPush`, but `LiveHeroStateService` updated local `BehaviorSubject`s directly from websocket callbacks without explicitly re-entering Angular's zone.

That made the hero stream more fragile than the older `MatchLiveFacade`, which already used `NgZone`.

### 3. Manual retry did not reattach the websocket stream

The retry path only fetched a fresh HTTP snapshot. It did not re-subscribe to live websocket topics, so the page could recover once and then stall again.

---

## Fix Applied

### Frontend

1. Added shared explicit topic builder:
   - `apps/frontend/src/app/core/utils/cricket-websocket-topics.ts`
2. Replaced wildcard subscriptions with explicit topic subscriptions in:
   - `apps/frontend/src/app/match-live/services/live-hero-state.service.ts`
   - `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts`
3. Routed hero websocket updates back through `NgZone`
4. Made hero manual retry reattach websocket subscriptions
5. Added regression coverage:
   - `apps/frontend/src/app/match-live/services/live-hero-state.service.spec.ts`

### Production

Safely bounced public-facing services without rebuilding from the dirty server tree:

```bash
cd /home/administrator/victoryline-monorepo
docker compose -f docker-compose.prod.yml restart backend frontend
```

---

## Verification Checklist

Use this when a hero looks frozen but the scraper may still be healthy:

```bash
# Public data freshness
curl -s "https://www.crickzen.com/api/cricket-data/last-updated-data?url=<match-slug>"

# SockJS endpoint reachable
curl -i https://www.crickzen.com/api/ws/info

# Scraper pushing the match
docker logs victoryline-scraper --since 20m 2>&1 | grep -Ei '<match-key>|matches.push'
```

If the API score keeps changing but the page stays stale:

1. check for wildcard websocket subscriptions in frontend code
2. check whether the component is `OnPush`
3. ensure websocket callbacks re-enter Angular via `NgZone`
4. ensure retry logic re-subscribes, not just re-fetches HTTP once

---

## Prevention

- Do **not** subscribe to `/topic/...*` wildcard destinations unless the broker is explicitly configured to support them
- Keep websocket topic generation centralized in one helper
- Any `OnPush` live-data component that consumes websocket events should explicitly marshal state updates through `NgZone` or an equivalent Angular-safe path
- Retry buttons for live views must restore the stream, not just refresh the snapshot
