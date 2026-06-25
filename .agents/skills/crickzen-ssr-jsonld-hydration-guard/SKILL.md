---
name: crickzen-ssr-jsonld-hydration-guard
description: Diagnose and fix Angular SSR JSON-LD structured data being wiped during client-side hydration when API calls are blocked by robots.txt. Use when the Google Rich Results Test or Schema.org validator shows fewer JSON-LD types than raw curl SSR HTML, when SportsEvent/Article blocks disappear after hydration, or when structured data is present in SSR but missing in Google's rendered view.
---

# Crickzen SSR JSON-LD Hydration Guard

## The Pattern

Angular SSR correctly injects JSON-LD structured data (SportsEvent, Article, BreadcrumbList) into the server-rendered HTML `<head>`. But when Google's Rich Results Test renderer loads the page:

1. Angular hydration starts and re-runs component lifecycle hooks
2. `StructuredDataService.setPageSchemas()` calls `clearPageSchemas()` — **wiping all SSR JSON-LD**
3. The client-side rebuild tries to fetch match data from `/api/cricket-data/match-info/get`
4. `/api/` is blocked by `robots.txt` (`Disallow: /api/`) — **correctly** for crawl budget
5. The API call fails → `startDate` is null → SportsEvent is not rebuilt
6. Only Article + BreadcrumbList survive (they don't need API data — built from slug parsing)

**Result**: Google sees fewer JSON-LD types than what SSR actually rendered. Rich-result eligibility is lost.

## Diagnosis

### Quick check — compare SSR HTML vs Google's rendered view

```bash
# 1. Check what SSR actually injects (curl sees the raw server HTML)
curl -s "https://www.crickzen.com/cric-live/<match-slug>" | grep -oP '"@type":"[^"]*"' | sort | uniq -c

# 2. Check the Google Rich Results Test (manual, JS-rendered)
# Open: https://search.google.com/test/rich-results?url=https://www.crickzen.com/cric-live/<match-slug>
```

If curl shows `SportsEvent` but the Rich Results Test does not, this is the hydration-wipe pattern.

### Confirm the API-block root cause

Check if the Rich Results Test "Page resources" section shows:
```
XHR https://www.crickzen.com/api/cricket-data/match-info/get?url=...
Googlebot blocked by robots.txt
```

If yes, the hydration is trying to rebuild JSON-LD from blocked API data.

## Fix

### The guard pattern

In `updateStructuredData()` (or equivalent), before calling `setPageSchemas()` on the client:

1. Check if the rebuild includes all the JSON-LD types that SSR had
2. If the rebuild is missing a type that SSR had (e.g. SportsEvent), **skip the clear+rebuild**
3. Also skip `clearPageSchemas()` when the rebuild produces nothing but SSR schemas exist

### Reference implementation

```typescript
private updateStructuredData(): void {
  var items = this.buildStructuredDataItems();
  if (items && items.length > 0) {
    if (this.isBrowser()) {
      var hasSportsEvent = items.some(function(item) {
        return item && item['@type'] === 'SportsEvent';
      });
      if (!hasSportsEvent) {
        var existingSchemas = this.structuredDataService.getPageSchemas();
        var ssrHasSportsEvent = existingSchemas.some(function(item) {
          return item && item['@type'] === 'SportsEvent';
        });
        if (ssrHasSportsEvent) {
          return; // Preserve SSR schemas, skip clear+rebuild
        }
      }
    }
    this.structuredDataService.setPageSchemas(items);
    return;
  }

  if (this.isBrowser()) {
    var existing = this.structuredDataService.getPageSchemas();
    if (existing && existing.length > 0) {
      return; // Don't clear SSR schemas if client has nothing better
    }
  }
  this.structuredDataService.clearPageSchemas();
}
```

### Required service method

`StructuredDataService` needs a `getPageSchemas()` method that reads existing JSON-LD blocks from the DOM:

```typescript
getPageSchemas(): JsonLd[] {
  const nodes = this.document.head.querySelectorAll('script[data-schema="crickzen-jsonld"]');
  const items: JsonLd[] = [];
  Array.prototype.forEach.call(nodes, (node) => {
    if (node && node.text) {
      try { items.push(JSON.parse(node.text)); } catch (e) {}
    }
  });
  return items;
}
```

## Verification

1. **Raw SSR HTML** (curl) — should show all JSON-LD types including SportsEvent
2. **Google Rich Results Test** — should now show the same types as curl
3. **Schema.org validator** — should pass without errors
4. The Rich Results Test "Page resources" will still show API XHRs blocked by robots.txt — this is correct and expected; the fix preserves SSR data rather than unblocking APIs

## Guardrails

- Do NOT unblock `/api/` in robots.txt — internal APIs should remain blocked for crawl budget
- Do NOT remove `clearPageSchemas()` from `setPageSchemas()` — the guard is in the caller, not the service
- The guard only applies on the browser (`isBrowser()`), not during SSR — SSR always injects fresh
- If the client successfully loads API data and can rebuild all types, the guard allows the rebuild (it only blocks when the rebuild is a subset of SSR)
- This pattern applies to any SSR framework where client-side hydration re-executes structured-data injection and API calls may be blocked by robots.txt

## When to use

- Google Rich Results Test shows fewer JSON-LD types than raw curl SSR HTML
- SportsEvent or other API-dependent JSON-LD blocks are missing from Google's rendered view
- After SSR migration, structured data appears in curl but not in Search Console
- After robots.txt changes that block `/api/` paths
- After deploying a fix and needing to verify the Rich Results Test sees all types
