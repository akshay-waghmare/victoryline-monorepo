---
name: crickzen-frontend-prod-rollout
description: Safely deploy a frontend-only Crickzen production change from the local repo to the Docker stack without rebuilding backend or scraper and without trusting the dirty server tree. Use when a fix is confined to the frontend and production needs a low-blast-radius rollout.
---

# Crickzen Frontend Prod Rollout

Use this skill when the change is frontend-only and you want the safest production path.

## Guardrails

1. Commit only the intended frontend files locally.
2. Push the branch before touching prod.
3. Expect the server repo to be dirty.
4. Treat local image build plus registry push as the primary deployment path.
5. Back up `.env` before changing `FRONTEND_IMAGE`.
6. Build and restart only `victoryline-frontend` unless backend changes are required.
7. Do not rebuild from the server repo checkout unless the task explicitly says to use an emergency fallback.
8. Check Docker disk pressure before local builds and prune unused images/build cache after a verified rollout.

## SSR hydration and build-cache gates

For SSR catalogue or route changes, treat the server HTML and browser hydration as separate acceptance surfaces:

1. Assume JSON dates in `TransferState` are strings after SSR serialization. Normalize fields such as `startTime` and `lastUpdated` back to `Date` objects before calling match utilities that use `getTime()`.
2. If the SSR wrapper can contain `&q;`-encoded quotes, add a narrow browser fallback that decodes `crickzen-app-state` and reads the required state key when Angular `TransferState` is empty.
3. Verify a cache-busted `/series` response contains the expected catalogue markup, no loading shell, and a non-empty parsed `series-discovery-catalogue`. A successful SSR response alone does not prove a hard refresh works.

Legacy Angular SSR builds can take 10–20 minutes and may be silent while compiling browser and server bundles. Do not treat a returned image as fresh merely because `--cache-from` completes quickly: when source changes are expected, use the cached production image only for dependencies and force the `build` stage to refresh:

```powershell
docker build --progress=plain --no-cache-filter build `
  --cache-from macubex/victoryline-frontend:<known-good-tag> `
  --build-arg FRONTEND_SOURCE_REV=<commit-or-revision> `
  -t macubex/victoryline-frontend:<tag> apps/frontend
```

Confirm the browser/server bundle hashes or build timestamps differ from the known-good image before pushing. If the host is low on space, inspect `docker system df` first; `apps/frontend/node_modules` is disposable and excluded by the frontend `.dockerignore`, while unrelated project directories must be preserved unless explicitly in scope.

## SEO preflight before rollout

If the frontend change touches SEO, discovery hubs, metadata, schema, route handling, or prerender output, do this before building the image:

1. Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\.agents\skills\crickzen-seo-health-pattern-audit\scripts\Audit-CrickzenSeoHealth.ps1
```

2. Confirm the likely issue family is understood:
   - orphan-link graph weakness
   - noindex or non-canonical sitemap hygiene
   - schema validation errors
   - title or description inflation
   - SSR shell or missing-H1 regression
3. Do not ship a frontend SEO fix based only on raw Ahrefs counts without one live URL sample and one shared-cause hypothesis.

## Known prod paths

- SSH: `C:\Program Files\Git\usr\bin\ssh.exe`
- Host: `administrator@204.12.199.137`
- Repo: `/home/administrator/victoryline-monorepo`
- Compose file: `docker-compose.prod.yml`

## Recommended flow

Local:

```powershell
git status --short
docker system df
git push origin 008-match-title-seo
```

Keep unrelated dirty files out of the commit. In particular, do not include scraper/model changes while rolling out a frontend-only fix.

Prod frontend-only rollout pattern:

```powershell
docker build -t macubex/victoryline-frontend:<tag> apps/frontend
docker push macubex/victoryline-frontend:<tag>
```

```bash
cd /home/administrator/victoryline-monorepo
cp .env .env.bak.<tag>
docker pull macubex/victoryline-frontend:<tag>
sed -i "s|^FRONTEND_IMAGE=.*|FRONTEND_IMAGE=macubex/victoryline-frontend:<tag>|" .env
docker compose -f docker-compose.prod.yml up -d --no-deps frontend
```

## Post-rollout checks

On the server:

```bash
docker inspect victoryline-frontend --format 'image={{.Config.Image}} running={{.State.Running}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}'
sed -n 's/^FRONTEND_IMAGE=.*/&/p' .env
```

From the workstation:

```powershell
Invoke-WebRequest https://www.crickzen.com/api/v1/seo/indexing/status -UseBasicParsing
Invoke-WebRequest https://www.crickzen.com/robots.txt -UseBasicParsing
Invoke-WebRequest https://www.crickzen.com/sitemap.xml -UseBasicParsing
Invoke-WebRequest https://www.crickzen.com/cric-live/<match-slug> -UseBasicParsing
```

After the rollout is verified locally and on prod, reclaim local Docker space if reclaimable image/cache usage is high:

```powershell
docker system df
docker image prune -af
docker builder prune -af
```

## What to verify in HTML

- expected canonical URL
- exactly one `h1`
- expected copy or markup change is visible
- `og:image` present if SEO work was included
- no unexpected `noindex` on intended indexable pages
- JSON-LD still renders without new validation regressions if schema-related code changed
- bad-route `404` if route handling changed

## When not to use this skill

- backend SEO endpoints changed
- scraper behavior changed
- compose or proxy config changed
- the fix needs synchronized backend/frontend contract changes

In those cases, use the fuller deployment runbook instead of a frontend-only rollout.

## Emergency-only fallback

If local Docker or registry push is unavailable, document that clearly and only then fall back to `docker save | ssh ... docker load` or a server-side build from a clean, intentional snapshot rather than the live dirty checkout.
