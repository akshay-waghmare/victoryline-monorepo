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
4. Reset the server checkout to `origin/<branch>` before building.
5. Back up `.env` before changing `FRONTEND_IMAGE`.
6. Build and restart only `victoryline-frontend` unless backend changes are required.

## Known prod paths

- SSH: `C:\Program Files\Git\usr\bin\ssh.exe`
- Host: `administrator@204.12.199.137`
- Repo: `/home/administrator/victoryline-monorepo`
- Compose file: `docker-compose.prod.yml`

## Recommended flow

Local:

```powershell
git status --short
git push origin 008-match-title-seo
```

Prod frontend-only rollout pattern:

```bash
cd /home/administrator/victoryline-monorepo
cp .env .env.bak.<tag>
git fetch origin
git reset --hard origin/008-match-title-seo
docker build -t victoryline-frontend:<tag> apps/frontend --quiet
sed -i "s|^FRONTEND_IMAGE=.*|FRONTEND_IMAGE=victoryline-frontend:<tag>|" .env
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

## What to verify in HTML

- expected canonical URL
- exactly one `h1`
- expected copy or markup change is visible
- `og:image` present if SEO work was included
- bad-route `404` if route handling changed

## When not to use this skill

- backend SEO endpoints changed
- scraper behavior changed
- compose or proxy config changed
- the fix needs synchronized backend/frontend contract changes

In those cases, use the fuller deployment runbook instead of a frontend-only rollout.
