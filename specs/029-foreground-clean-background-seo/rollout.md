# Rollout Notes: Foreground Clean Background SEO

## Scope

Spec 029 was the final hierarchy cleanup after the earlier 026-028 passes.

Its purpose was narrow and intentional:

- keep score and match state visible first
- keep SSR-visible SEO/discovery support in the HTML
- move louder support sections into quieter secondary drawers

It did not change:

- canonical URLs
- route families
- Spec 023 behavior

## Implementation Summary

### Homepage

- kept the hero and at-a-glance strip as the first reading layer
- moved richer hub links and direct discovery links into a `More live score pages` drawer

### `/matches`

- kept summary cards, controls, and visible list first
- moved richer discovery sections and direct links into a `More match pages` drawer

### Individual match page

- kept the snapshot-style details card as the main `At a glance` layer
- moved the heavy supporting SEO grid into a `More match detail` drawer

## Local Verification

The local verification path used:

```powershell
cd apps/frontend
npx tsc -p src/tsconfig.app.json --noEmit
$env:NODE_OPTIONS='--openssl-legacy-provider'
npm run build:browser
cd ..
docker compose -f docker-compose.local.yml build frontend
docker compose -f docker-compose.local.yml up -d --force-recreate frontend
```

Raw served HTML checks on `http://localhost:8080` confirmed:

- `/` contains `Match centre at a glance` and `More live score pages`
- `/matches` contains `At a glance`, `Pick the lane you want`, and `More match pages`
- sample `/cric-live/{slug}` contains `At a glance`, `More match detail`, and `Keep the match snapshot first`

## Rollout Guidance

If this spec is deployed to production, use the frontend-only rollout path:

- commit and push the verified frontend subset first
- reset the server repo to the pushed branch head
- build only the frontend image
- update only `FRONTEND_IMAGE`
- recreate only the frontend service

Pair this with:

- `.agents/skills/crickzen-frontend-prod-rollout/SKILL.md`
- `.agents/skills/crickzen-match-surface-ux-pass/SKILL.md`
