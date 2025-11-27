# Change Proposal: Fix SEO Canonical & Meta Tags for Match Page Indexing

## Summary
Google is not indexing cric-live match pages because the canonical URL and meta tags are static, causing Google to treat all match pages as duplicates of the homepage.

## Problem Statement

### Evidence from Google Search Console
- **Google-selected canonical**: `https://www.crickzen.com/blog`
- **User-declared canonical**: `https://www.crickzen.com/`
- **Result**: Google treats match pages as duplicates of homepage → NOT indexed

### Root Causes Identified
| Issue | Evidence | Effect |
|-------|----------|--------|
| Static canonical in index.html | `<link rel="canonical" href="https://www.crickzen.com/">` | All pages appear as homepage duplicates |
| MetaTagsService.setPageMeta() is stub | Method exists but doesn't inject meta tags | Dynamic SEO never applied |
| CricketOddsComponent ignores SEO | Component doesn't call MetaTagsService | Match-specific meta never set |
| Generic JSON-LD | Static SportsEvent with "Live Cricket Scores" | No match-specific structured data |
| No dynamic canonical injection | Angular doesn't update canonical per route | All pages share same canonical |

## Proposed Solution

### Phase 1: Fix MetaTagsService (Core)
1. Implement `setPageMeta()` to actually inject:
   - Page title via Angular `Title` service
   - Meta description via Angular `Meta` service  
   - Canonical link element (create/update dynamically)
   - Open Graph tags
   - Twitter Card tags
   - JSON-LD structured data

### Phase 2: Remove Static SEO from index.html
1. Remove hardcoded `<link rel="canonical" href="https://www.crickzen.com/">`
2. Remove generic JSON-LD SportsEvent script
3. Keep only base/fallback meta tags

### Phase 3: Wire SEO in CricketOddsComponent
1. Inject MetaTagsService
2. On route load, extract match data from:
   - Route params (matchId/path)
   - cricObj data (team names, status)
   - matchInfo API response (venue, series)
3. Call `setPageMeta()` with match-specific data

### Phase 4: Add SEO Resolver (Optional Enhancement)
1. Create route resolver for `/cric-live/:path`
2. Pre-fetch minimal match data for SEO
3. Set meta tags before component renders

## Success Criteria
- [ ] Each match page has unique canonical pointing to itself
- [ ] Title format: `TEAM1 vs TEAM2 Live Score | Series Name | Crickzen`
- [ ] Description includes teams, venue, live status
- [ ] JSON-LD contains match-specific SportsEvent data
- [ ] Google reindexes match pages within 4-6 weeks
- [ ] Search Console shows indexed match pages

## Impact
- **SEO**: 70-95% of match pages indexed (vs current 0-5%)
- **Traffic**: Significant increase in organic search traffic
- **Discoverability**: Appear for "TEAM vs TEAM live score" queries

## Related Specs
- `specs/003-seo-optimization/` - Original SEO spec (partially implemented)
- `apps/frontend/src/app/seo/meta-tags.service.ts` - Core service to fix
- `apps/frontend/src/app/cricket-odds/cricket-odds.component.ts` - Main match page
