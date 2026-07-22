# Current Local Production Release

Date: 2026-07-22

## Deployed boundary

Production now runs the current local frontend and scraper source checkpoint:

- Source implementation: `d73f105` (`feat: checkpoint current frontend and scraper release`)
- Deployment hardening: `3de0608` (`fix(deploy): remove scraper source overrides`)
- Frontend image: `macubex/victoryline-frontend:20260722-d73f105`
  - Digest: `sha256:5a55a194593ddb499575567c2094a67b329c3e56177ed6ecc2be141dda4b99c9`
- Scraper image: `macubex/victoryline-scraper:20260722-d73f105`
  - Digest: `sha256:e1704619937bbdcab7f78fcd769e7b82f74da3896ec12de5b8a8ac419c38f3eb`
- Backend live-catalog correction: `631a861` (`fix(backend): revive matches returned by live discovery`)
- Backend image: `macubex/victoryline-backend:20260722-631a861`
  - Digest: `sha256:d452059b567437ee4fd0c5160101f170f186e5d13f466d25ac65b41037824a00`

The frontend and scraper images are the exact images built from `d73f105`. The backend image
is the subsequent, narrow `631a861` live-catalog correction.

## Drift prevention

The previous production compose configuration mounted two server checkout files over the
scraper image. Those mounts have been removed from the tracked production compose file and
from the live production compose configuration. The scraper now mounts only its persistent
`scraper_data` volume, so its executable code comes solely from the pinned image.

Production backups created before the switch:

- `.env.bak.20260722-d73f105`
- `docker-compose.prod.yml.bak.20260722-d73f105`
- `.env.bak.20260722-631a861`

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
- The scraper and backend are healthy after the backend correction. The public live catalog
  contains the India U19 v Sri Lanka U19 Test (`12AB`) as `LIVE`, and its public match page
  returns HTTP 200.

## Live-catalog incident correction

The India U19 v Sri Lanka U19 Test was selected by CREX live discovery but had an older stale
terminal row in the backend. A schedule scrape had attached toss text (`SL U19 opt to Bowl`)
to that row; the old backend treated terminal status as permanently non-revivable and hid the
match from the live catalog. `631a861` makes the authoritative CREX live catalog revive such a
row, reset deletion attempts, and restore the `LIVE` lifecycle state. This change is restricted
to a URL actively returned by live discovery.

## Hundred model status

This application rollout does not promote or alter model routing. `hundred_all_v1` remains a
shadow-only candidate in the model repository because it failed the frozen promotion gates
against the production T20 comparator. The model service is reachable from production, but a
separate model-release decision and a real Hundred-fixture verification are required before
claiming that Match Intelligence serves the dedicated Hundred model.
