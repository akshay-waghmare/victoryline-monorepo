# Incident Report: Dual Outage — crickzen.com + prediction.crickzen.com
**Date:** 2026-05-22  
**Duration:** ~29 hours (prediction dashboard); ~hours (crickzen IPL scores, exact start unknown)  
**Severity:** High — live IPL scores missing from main site; all predictions frozen for a full day  
**Services Affected:** `victoryline-scraper` (crickzen.com live scores) + `crickzen-dashboard` (prediction.crickzen.com)  
**Resolved:** 2026-05-22 ~21:30 IST  

---

## Summary

Two independent issues surfaced simultaneously:

1. **crickzen.com:** The scraper was discovering the IPL match (RCB vs SRH 67th, key `119C`) correctly but never scraping it — IPL scores showed blank on the frontend.
2. **prediction.crickzen.com:** All predictions frozen for ~29 hours. No new Telegram signals since May 21 ~14:12 IST.

---

## Incident 1 — crickzen.com: IPL Match Not Being Scraped

### Symptom

- `crickzen.com` showed blank/stale scorecard for the live RCB vs SRH IPL match
- Backend had the match registered (`lastKnownState: null`, `id=1828`)
- Discovery log showed IPL URL correctly discovered: `rcb-vs-srh-67th-match-indian-premier-league-2026-match-updates-119C`
- **But no `matches.push` logs ever appeared for the IPL match** — only for T20 Blast Women matches
- `active_matches: 5` in scraper health despite 8 live matches being discovered

### Root Cause

**`MAX_LIVE_MATCHES=5` cap combined with bad ordering from the backend.**

The scraper poll loop (`crex_scraper.py → _poll_loop`) fetches the live match list from the backend and then caps it:

```python
# Cap to top N matches to avoid PID exhaustion with many concurrent Chrome tabs
if self.settings.max_live_matches > 0:
    matches = matches[:self.settings.max_live_matches]
```

`MAX_LIVE_MATCHES` defaults to `5` (config.py line 117) and was set to `5` in production `.env`.

The backend returns matches ordered by `lastStateUpdatedAt DESC` (newest-scraped first). On 2026-05-22, the live matches were:

```
[0] id=1823  T20 Blast Women (ZRF)     ← being scraped every ~5s → always near top
[1] id=1824  T20 Blast Women (ZSG)
[2] id=1822  T20 Blast Women (ZRE)
[3] id=1827  T20 Blast Women (ZRH)
[4] id=1815  SA-A vs ENG-A (Test)
[5] id=1826  T20 Blast Women (ZSH)
[6] id=1828  IPL — RCB vs SRH 119C   ← NEVER SCRAPED → lastStateUpdatedAt stays old → stays at bottom
[7] id=1821  T20 Blast Women (ZSF)
```

Because the IPL match had `lastKnownState: null` (it had just been registered by discovery and never yet scraped), its `lastStateUpdatedAt` was older than all the actively-scraped T20 Blast Women matches. This pushed it to position **[6]** — one beyond the cap.

**This is a self-reinforcing deadlock:** The match is excluded because it's never been scraped → it's never scraped because it's always excluded.

### Fix Applied

Added a **priority sort** in `crex_scraper.py` before the cap is applied so IPL matches always float to position [0]:

```python
# Sort priority leagues (IPL) first so they are never dropped by the cap
_PRIORITY = ('indian-premier-league',)
def _url_of(m):
    if isinstance(m, dict):
        return (m.get('url') or m.get('matchUrl') or '').lower()
    return m.lower() if isinstance(m, str) else ''
matches = sorted(matches, key=lambda m: 0 if any(p in _url_of(m) for p in _PRIORITY) else 1)

# Cap to top N matches to avoid PID exhaustion with many concurrent Chrome tabs
if self.settings.max_live_matches > 0:
    matches = matches[:self.settings.max_live_matches]
```

To apply this without a Docker Hub image rebuild, a **volume mount override** was added to `docker-compose.prod.yml`:

```yaml
volumes:
  - scraper_data:/app/storage
  # IPL priority patch – override scraper core without a full image rebuild
  - ./apps/scraper/crex_scraper_python/src/crex_scraper.py:/app/crex_scraper_python/src/crex_scraper.py:ro
```

### Deployment Steps

```bash
# On prod server (after git pull):
cd /home/administrator/victoryline-monorepo
git fetch origin 008-match-title-seo
git reset --hard origin/008-match-title-seo

docker compose -f docker-compose.prod.yml up -d --no-build scraper
```

### Verification

```
[BROAD-DISCOVERY] https://api.goscorer.com/api/v3/getSV3?key=119C ... ← IPL being scraped
[COMMENTARY] getBallFeeds intercepted for crex:rcb-vs-srh-67th-match-indian-premier-league... ← Live data flowing
```

Discovery now orders IPL at **position [1]**, within the 5-match cap.

---

## Incident 2 — prediction.crickzen.com: Scheduler Frozen 29 Hours

### Symptom

- `prediction.crickzen.com` showed no active predictions since May 21 ~14:12 IST
- `/api/matches/auto/status` → `last_checked_at` was 29 hours stale
- `last_started: []` — no matches auto-started all day
- Admin login blocked: `{"detail":"capacity_reached"}`
- Signal runner (`ipl-signal-runner` PM2 process) idle — no Telegram signals since May 20

### Root Causes (Compound)

#### Root Cause A — asyncio Event Loop Deadlock

`AutoScheduler.run_forever()` runs an asyncio loop calling `check_once()`. Inside `check_once()`, `discover_candidates()` calls `_fetch_rendered_crex_html()` which launches a **Playwright browser** for JS rendering.

On May 21 ~14:12 IST, the Playwright browser session hung indefinitely. The asyncio event loop was permanently blocked. The container stayed `Up` and healthy (Docker healthcheck only tests `GET /health` on a separate FastAPI thread) but no new checks ever ran.

#### Root Cause B — SESSION_CAP=50 Blocking Admin Recovery

`refresh_tokens` table accumulates tokens over 30-day lifetime. Revoked tokens are never auto-deleted. By May 22, the table had exactly 50 non-revoked tokens → `SESSION_CAP=50` hit → **all logins blocked**, including admin. This prevented any manual intervention.

#### Root Cause C — `_should_start()` False Negative

Even after restart, no matches were auto-started because:
- `_looks_live()` checks for `\blive\b` regex in match labels
- Live match labels from `crex.com` look like `"LAN-W 185-7 20.0 SUR-W 133"` — **no literal "live" word**
- So `_should_start()` always returned false for all 8 discovered live matches

### Fix Applied

| Step | Action |
|------|--------|
| 1 | `docker compose -f docker-compose.dashboard-prod.yml restart dashboard` — cleared the hung asyncio loop |
| 2 | Manually deleted revoked tokens from `dashboard_auth.db` to unblock admin login |
| 3 | Updated `dashboard/.env`: `SESSION_CAP=200`, `MAX_USER_MATCHES=8`, `MAX_TOTAL_MATCHES=8` |
| 4 | Cleared `AUTO_MATCH_URLS` — set back to empty (IPL-only via `AUTO_LEAGUE_KEY=IPL`) |
| 5 | Restarted dashboard |

**Result:** 7 predictions running within one scheduler cycle (60s) after restart.

### Important: AUTO_LEAGUE_KEY=IPL is Correct

> ⚠️ At one point during the incident response, `AUTO_LEAGUE_KEY` was incorrectly changed to `T20 Blast Women` on the assumption that IPL had ended. **IPL 2026 did NOT end May 20.** The May 20 match was a regular season game. The IPL 2026 Final is May 31. The key was reverted to `IPL`. Always verify tournament schedules before changing `AUTO_LEAGUE_KEY`.

---

## Combined Timeline

| Time (IST) | Event |
|------------|-------|
| 2026-05-21 ~14:12 | Playwright call in `auto_scheduler.check_once()` hung — all predictions stop |
| 2026-05-22 (unknown) | IPL RCB vs SRH match registered in backend but never scraped (position [6], beyond cap) |
| 2026-05-22 ~14:00 | Incident discovered — both sites affected |
| 2026-05-22 ~14:30 | Admin login to prediction dashboard blocked — SESSION_CAP=50 hit |
| 2026-05-22 ~15:40 | `docker restart crickzen-dashboard` — scheduler loop resumed |
| 2026-05-22 ~15:45 | refresh_tokens cleaned, admin login restored |
| 2026-05-22 ~21:10 | dashboard/.env updated (SESSION_CAP=200); AUTO_MATCH_URLS cleared; restarted |
| 2026-05-22 ~21:20 | 7 active predictions confirmed ✅ |
| 2026-05-22 ~21:30 | IPL priority sort deployed; IPL match confirmed scraping (`getSV3?key=119C`) ✅ |

---

## Files Changed

| Location | File | Change | Persistent? |
|----------|------|--------|------------|
| Prod server | `/home/administrator/projects/machine_learning_bbl/dashboard/.env` | SESSION_CAP=200, MAX_USER_MATCHES=8, MAX_TOTAL_MATCHES=8, AUTO_MATCH_URLS= (cleared) | ✅ |
| Prod server | `dashboard_auth.db` (mounted volume) | Deleted revoked/excess refresh tokens | ✅ |
| Local + prod | `apps/scraper/crex_scraper_python/src/crex_scraper.py` | Added IPL priority sort before cap | ✅ Committed |
| Local + prod | `docker-compose.prod.yml` | Added volume mount to inject patched crex_scraper.py | ✅ Committed |
| Prod server | `/home/administrator/projects/machine_learning_bbl/dashboard/app/config.py` | Added T20 Blast Women to LEAGUE_CONFIGS + URL pattern | ✅ (baked in image) |

---

## Outstanding Actions (Not Yet Resolved)

| Priority | Action | Location |
|----------|--------|----------|
| 🔴 High | Add `asyncio.wait_for(..., timeout=120)` around `check_once()` in `auto_scheduler.py` | `auto_scheduler.py` |
| 🔴 High | Add startup/periodic revoked token cleanup to prevent SESSION_CAP recurrence | `auth.py` or `app.py` |
| 🔴 High | Clear `AUTO_MATCH_URLS` nightly (or fix `_should_start()`) — stale URLs will error next day | `dashboard/.env` |
| 🟡 Med | Fix `_looks_live()` to detect score-based liveness (not just literal "live" word) | `auto_scheduler.py` |
| 🟡 Med | Fix `record_success()` → call `_evaluate_state()` (scraper stuck at `state=recovering`) | `health.py` |
| 🟡 Med | Rebuild scraper image with IPL priority sort baked in (remove volume mount hack) | CI/CD |

---

## Prevention

### For IPL / High-Priority Match Not Scraping

If a tournament match appears discovered but `lastKnownState: null` and no push logs:

```bash
# Check backend match order vs scraper cap
curl -s http://localhost:8099/cricket-data/live-matches | python3 -c "
import sys,json
for i,m in enumerate(json.load(sys.stdin)):
    print(f'[{i}] id={m.get(\"id\")} {str(m.get(\"url\",\"\"))[-60:]}')
"
# If IPL is beyond position [MAX_LIVE_MATCHES-1], it's being cut off
```

Fix: IPL priority sort is now applied before the cap. If a new high-priority league needs the same treatment, add it to `_PRIORITY` in `crex_scraper.py`.

### For Prediction Dashboard Freezing

```bash
# 1. Check auto-scheduler last_checked_at
curl -s http://localhost:8000/api/matches/auto/status | python3 -m json.tool | grep last_checked

# 2. If stale > 10 minutes → restart
docker compose -f docker-compose.dashboard-prod.yml restart dashboard

# 3. If login blocked → clean tokens
docker exec crickzen-dashboard python3 -c "
import sqlite3
conn = sqlite3.connect('/app/data/dashboard_auth.db')
conn.execute('DELETE FROM refresh_tokens WHERE revoked=1')
conn.commit(); conn.close()
print('Done')
"
```

### Season / League Changeover Checklist

> See also: `DEPLOYMENT_TROUBLESHOOTING.md` Issue 9 for full playbook.

1. Verify the current tournament is actually over (web search — do not assume from last signal)
2. Update `AUTO_LEAGUE_KEY=<new_league>` in `dashboard/.env`
3. If the league is not in `LEAGUE_CONFIGS`, add it to `config.py` and `--build`
4. If `_should_start()` won't auto-detect the matches, set `AUTO_MATCH_URLS` with today's match URLs
5. Remember to **clear** `AUTO_MATCH_URLS` the next day — stale URLs cause 404s in the scheduler
