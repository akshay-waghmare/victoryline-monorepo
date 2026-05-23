# Incident: IPL Live Score Team Name Corruption (PBKSPP Bug)

**Date**: 2026-05-23  
**Severity**: High — incorrect data broadcast via WebSocket to all live-match viewers  
**Status**: ✅ Resolved — deployed fix, validated on production  
**Match Affected**: LSG vs PBKS 68th match, IPL 2026 (match key `119D`)

---

## Symptom

Users reported that the IPL match live score updates appeared "not running" on crickzen.com.

Investigation found that the scraper was pushing updates every ~25 seconds with `batting_team: "PBKSPP"` instead of `"PBKS"`. The WebSocket was broadcasting this corrupted team name to the frontend. Depending on how the Angular frontend resolves team names, this could cause broken display or no display at all.

The score (`11-1`) and overs (`2.3`) were being pushed correctly — only the team name was corrupted.

---

## Root Cause

**File**: `apps/scraper/crex_scraper_python/src/dom_match_extract.py`

The crex.com DOM now includes a **powerplay badge** inside the `.team-name` container during powerplay overs (first 6 overs of an innings):

```html
<div class="team-name team-1">
  PBKS
  <span class="inning-f"> </span>
  <div class="pp-icon">
    <span class="btn-text">PP</span>   <!-- ← new element, added by crex.com -->
  </div>
</div>
```

The extraction code (line 90) used `get_text(strip=True)`:

```python
"name": name_el.get_text(strip=True) if name_el else None,
```

`get_text(strip=True)` collects **all descendant text without any separator**, producing:
> `"PBKS"` + `"PP"` → `"PBKSPP"`

This corrupted name was propagated through:
1. `cricket_data_service.py` → `payload["match_update"]["score"]["teamName"] = "PBKSPP"`
2. `JacksonCustomCricketDeserializer.java` → `setBattingTeamName("PBKSPP")`
3. `CricketDataController.mergeAndBroadcastCricketData()` → WebSocket broadcast `batting_team: "PBKSPP"`

### Secondary Issue

`final_result_text` also had a related bug: `get_text(strip=True)` on the `.final-result.m-none` element produced `"PBKS need197 runsin120 balls"` (missing spaces before numbers/words split across child `<span>` elements).

---

## Fix

**Commit**: `dd3de62`

### 1. `dom_match_extract.py` — extract only direct text from `.team-name`

Added a `_get_team_name(el)` helper that iterates only the **NavigableString direct children** of the element (i.e. text nodes that are not inside a child element), ignoring any badge/icon elements:

```python
def _get_team_name(el) -> str:
    direct = " ".join(s.strip() for s in el.children
                      if isinstance(s, NavigableString) and s.strip())
    return direct or el.get_text(strip=True)  # fallback for <span>-wrapped names
```

Changed line 90 from:
```python
"name": name_el.get_text(strip=True) if name_el else None,
```
to:
```python
"name": _get_team_name(name_el) if name_el else None,
```

Also changed `final_result` extraction to use `separator=" "`:
```python
final_result = next((s.get_text(separator=" ", strip=True) for s in soup.select(".final-result.m-none")), None)
```

### 2. `docker-compose.prod.yml` — add volume mount for `dom_match_extract.py`

Added a volume mount so the fix deploys via container restart without a full Docker image rebuild:
```yaml
- ./apps/scraper/crex_scraper_python/src/dom_match_extract.py:/app/crex_scraper_python/src/dom_match_extract.py:ro
```

### 3. Tests — `tests/unit/test_match_dom_extraction.py`

Added two regression tests:
- `test_team_name_ignores_pp_icon`: verifies `PBKS` is extracted (not `PBKSPP`) when `.pp-icon` is present
- `test_final_result_text_has_spaces`: verifies spaces are preserved when result text spans child elements

Also fixed two pre-existing test bugs that were masking failures:
- `data["overs"]` → `data["overs_data"]` (key name mismatch)
- Added `.dark-odds` class to fixture HTML for odds extraction test

---

## Deployment Steps

```bash
cd /home/administrator/victoryline-monorepo
git pull origin 008-match-title-seo
docker compose -f docker-compose.prod.yml up -d --force-recreate scraper
```

Volume mount requires `--force-recreate`, not just `restart`.

---

## Validation

After deploying, confirmed from scraper logs:
```
batting_team: PBKS
score: 11-1
```

✅ Clean team name, live score updating correctly.

---

## Data Flow Reference

```
crex.com DOM (.team-name element)
  ↓ dom_match_extract.extract_match_dom_fields()
  ↓ teams[0]["name"]
  ↓ cricket_data_service.push_match_data()
  ↓ payload["match_update"]["score"]["teamName"]  (and payload["batting_team"])
  ↓ POST /cricket-data (backend)
  ↓ JacksonCustomCricketDeserializer → CricketDataDTO.setBattingTeamName()
  ↓ CricketDataController.mergeAndBroadcastCricketData()
  ↓ WebSocket: /topic/cricket.{key}.batting_team → frontend
```

---

## Future Prevention

- ⚠️ **Do not use `get_text(strip=True)` on elements that may contain UI badge children** — use `_get_team_name()` instead which isolates direct text nodes.
- ⚠️ When crex.com adds dynamic DOM elements (powerplay indicator, DRS indicator, etc.) they WILL corrupt team names if extracted with plain `get_text()`.
- ✅ The `_get_team_name()` helper is safe: it falls back to `get_text()` if no direct text node exists, so existing patterns (e.g. `<div class="team-name"><span>CSK</span></div>`) continue to work.
- 📋 Consider adding a production smoke test that asserts `batting_team` matches a known short-name pattern (2–5 uppercase letters) as a canary for future DOM injection bugs.

---

## Related Incidents

- `INCIDENT_20260522_DUAL_OUTAGE.md` — scraper thread leak + prediction frozen (day before)
- `INCIDENT_2026_IPL_DISCOVERY_SELECTOR.md` — scraper failing to discover IPL matches (earlier)
