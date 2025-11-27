# Tasks: Fix SEO Canonical & Meta Tags for Match Page Indexing

## 1. Core: Implement MetaTagsService.setPageMeta()

- [x] 1.1 Add Angular Meta, Title, DOCUMENT injection to MetaTagsService constructor
- [x] 1.2 Implement setPageMeta() to update page title via Title service
- [x] 1.3 Implement meta description update via Meta service
- [x] 1.4 Implement updateCanonicalLink() to create/update canonical link element
- [x] 1.5 Implement Open Graph meta tag updates (og:title, og:description, og:image, og:url)
- [x] 1.6 Implement Twitter Card meta tag updates
- [x] 1.7 Implement updateJsonLd() to inject match-specific structured data
- [x] 1.8 Add helper methods: buildMatchTitle(), buildMatchDescription(), buildMatchJsonLd()

## 2. Remove Static SEO from index.html

- [x] 2.1 Remove static `<link rel="canonical" href="https://www.crickzen.com/">` from index.html
- [x] 2.2 Remove generic JSON-LD SportsEvent script block from index.html
- [x] 2.3 Update title to be a sensible fallback (keep current)
- [x] 2.4 Keep base meta description as fallback

## 3. Wire SEO in CricketOddsComponent

- [x] 3.1 Import and inject MetaTagsService in CricketOddsComponent
- [x] 3.2 Create updateSeoMeta() method that builds and applies match-specific meta
- [x] 3.3 Call updateSeoMeta() in ngOnInit after route params are resolved
- [x] 3.4 Call updateSeoMeta() when matchInfo data loads (for venue/series details)
- [x] 3.5 Extract team names from cricObj or matchInfo for title/description
- [x] 3.6 Generate match-specific canonical URL: `https://www.crickzen.com/cric-live/{path}`

## 4. Build Verification

- [x] 4.1 Fix TypeScript 3.2 compatibility (optional chaining → && guards)
- [x] 4.2 Local npm build succeeds
- [x] 4.3 Docker Compose build succeeds (victoryline-monorepo-frontend:latest)

## 5. Validation & Testing

- [ ] 5.1 Verify canonical link updates on route navigation
- [ ] 5.2 Test with Google Rich Results Test tool
- [ ] 5.3 Verify JSON-LD validates in Schema.org validator
- [ ] 5.4 Check meta tags render correctly in view-source
- [ ] 5.5 Submit sample URLs to Google Search Console for re-indexing

## Dependencies

- Task 2 depends on Task 1 (need working service before removing static fallbacks)
- Task 3 depends on Task 1 (need complete service to wire into component)
- Task 4 depends on Tasks 2 & 3

## Notes

- MetaTagsService already has buildMatchMeta() method but setPageMeta() was a stub
- CricketOddsComponent uses `matchId` and `matchInfo` which can provide SEO data
- Current index.html has static canonical pointing to homepage - causing all duplicates
