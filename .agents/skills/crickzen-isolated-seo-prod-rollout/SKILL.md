---
name: crickzen-isolated-seo-prod-rollout
description: Deploy a narrow Crickzen SEO slice safely when the local repo is dirty or the target work depends on only part of the current tree. Use when prod needs backend/frontend SEO changes, but building directly from the working tree or server checkout would risk shipping unrelated work.
---

# Crickzen Isolated SEO Prod Rollout

Use this skill when the user wants a production SEO rollout but the repo is dirty, mixed with unrelated work, or likely to fail unless the deployable slice is isolated and expanded carefully.

## When to use this skill

- backend plus frontend SEO work must reach prod
- the local repo has many unrelated modified or untracked files
- the safe deploy path is a clean snapshot plus targeted overlays
- you need to discover missing dependency files by isolated builds before restarting prod

## Guardrails

1. Do not build from the dirty working tree for production.
2. Do not rebuild from the server repo checkout.
3. Start from `git archive HEAD`, then overlay only the intended files.
4. Build the final backend/frontend images locally and push them to the registry as the primary path.
5. Restart backend first, then frontend.
6. Document every file added to the rollout slice because those extra files are future dependency clues.
7. If isolated builds fail, widen the slice only by proven dependency gaps.

## SEO preflight before image build

Before creating the isolated rollout slice, confirm the actual failure class with a live audit:

```powershell
powershell -ExecutionPolicy Bypass -File .\.agents\skills\crickzen-seo-health-pattern-audit\scripts\Audit-CrickzenSeoHealth.ps1
```

Use that result to decide whether the rollout is targeting:

- sitemap hygiene (`noindex` or non-canonical URLs in sitemap)
- crawl-graph weakness (large orphan counts, low incoming link counts)
- schema generator regressions
- title or description generator regressions
- SSR route or render regressions

Do not widen the isolated slice to unrelated systems just because the audit tool reports many counts.

## Known host details

- SSH: `C:\Program Files\Git\usr\bin\ssh.exe`
- SCP: `C:\Program Files\Git\usr\bin\scp.exe`
- key: `$env:USERPROFILE\.ssh\id_server_wc`
- host: `administrator@204.12.199.137`
- repo: `/home/administrator/victoryline-monorepo`
- compose: `docker-compose.prod.yml`

## Workflow

### 1. Build the isolated snapshot locally

Create a clean temp directory from `HEAD`:

```powershell
git archive --format=tar -o $archivePath HEAD
tar -xf $archivePath -C $tempRoot
```

Overlay only the intended rollout files from the current working tree into `$tempRoot`.

### 2. Validate the slice before build

Check a few expected files directly in the temp snapshot. If the file is missing there, do not start image builds.

### 3. Package and transfer the snapshot

```powershell
tar -czf $tarball -C $tempRoot .
scp $tarball administrator@204.12.199.137:/home/administrator/
```

### 4. Build locally from the isolated snapshot

Use the isolated temp directory on the workstation, not the live repo tree:

```powershell
docker build -t macubex/victoryline-backend:<tag> apps/backend/spring-security-jwt
docker build -t macubex/victoryline-frontend:<tag> apps/frontend
docker push macubex/victoryline-backend:<tag>
docker push macubex/victoryline-frontend:<tag>
```

On prod, pull those exact tags before restart:

```bash
docker pull macubex/victoryline-backend:<tag>
docker pull macubex/victoryline-frontend:<tag>
```

Server-side extraction of the tarball remains useful for audit/debug, but not as the primary image-build path.

### 5. Expand only when the isolated build proves a gap

Examples:

- backend compile error in controller points to one missing service/helper file
- Angular module error points to one missing route/module file
- Spring boot bean startup error points to a wiring defect in the intended slice itself

Do not blindly pull whole directories into the rollout unless the errors justify it.

### 6. Pin images and restart

```bash
cp .env .env.backup-<tag>
docker compose -f docker-compose.prod.yml up -d backend
docker compose -f docker-compose.prod.yml up -d --no-deps frontend
```

### 7. Verify at three layers

1. Container health:
   - `docker compose -f docker-compose.prod.yml ps`
2. App boot logs:
   - look for `Tomcat started` and `Started Application`
3. Public proof:
   - exact SEO route returns `200`
   - expected title or route-specific copy appears
   - sitemap returns `200`
   - sampled intended indexable routes are not `noindex`
   - canonical and JSON-LD output still match the route family you changed

## Response shape

Return:

- image tags deployed
- whether the rollout used an isolated snapshot
- extra dependency files discovered during isolated build
- backend-first and frontend-second restart proof
- public route and sitemap proof
- any residual SEO gaps still visible after deploy

## Emergency-only fallback

If the workstation cannot build or transfer the images, use a clean extracted snapshot on the server as an exception path and state explicitly that the primary local-build transfer workflow was unavailable.
