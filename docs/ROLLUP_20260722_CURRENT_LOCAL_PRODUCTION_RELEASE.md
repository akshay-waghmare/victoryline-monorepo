# Current Local Frontend and Scraper Production Release

Date: 2026-07-22

## Deployed boundary

Production now runs the current local frontend and scraper source checkpoint:

- Source implementation: `d73f105` (`feat: checkpoint current frontend and scraper release`)
- Deployment hardening: `3de0608` (`fix(deploy): remove scraper source overrides`)
- Frontend image: `macubex/victoryline-frontend:20260722-d73f105`
  - Digest: `sha256:5a55a194593ddb499575567c2094a67b329c3e56177ed6ecc2be141dda4b99c9`
- Scraper image: `macubex/victoryline-scraper:20260722-d73f105`
  - Digest: `sha256:e1704619937bbdcab7f78fcd769e7b82f74da3896ec12de5b8a8ac419c38f3eb`

Only `frontend` and `scraper` were recreated. The backend remains pinned to
`macubex/victoryline-backend:20260708-2342-backend-overs-fix-38d9435`.

## Drift prevention

The previous production compose configuration mounted two server checkout files over the
scraper image. Those mounts have been removed from the tracked production compose file and
from the live production compose configuration. The scraper now mounts only its persistent
`scraper_data` volume, so its executable code comes solely from the pinned image.

Production backups created before the switch:

- `.env.bak.20260722-d73f105`
- `docker-compose.prod.yml.bak.20260722-d73f105`

## Verification

- Frontend TypeScript check passed.
- Scraper live-match-selection tests passed: `3 passed`.
- Production SEO preflight passed with zero failures: 2,621 unique sitemap URLs and 2,612
  match URLs sampled through the audit.
- Production frontend and scraper are healthy on the pinned images.
- Scraper health returned score `100`, zero pool errors, and no restart recommendation.
- Production homepage, robots endpoint, and SEO indexing-status endpoint returned HTTP 200.
- The frontend can resolve and reach `crickzen-dashboard:8000`; neither restarted service
  produced an error log during the initial post-release check.

## Hundred model status

This application rollout does not promote or alter model routing. `hundred_all_v1` remains a
shadow-only candidate in the model repository because it failed the frozen promotion gates
against the production T20 comparator. The model service is reachable from production, but a
separate model-release decision and a real Hundred-fixture verification are required before
claiming that Match Intelligence serves the dedicated Hundred model.
