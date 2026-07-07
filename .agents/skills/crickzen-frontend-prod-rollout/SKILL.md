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
