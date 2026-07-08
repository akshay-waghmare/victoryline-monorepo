# Tasks: Series Discovery Hub Enrichment

## 1. Series page discovery section

- [x] 1.1 Add `/series` upcoming discovery state and load matches through `MatchesService`
- [x] 1.2 Group prioritized upcoming canonical match URLs by series label with deduplication and caps
- [x] 1.3 Render grouped canonical links and timing copy in SSR-visible HTML on `/series`
- [x] 1.4 Update `/series` structured data to include surfaced discovery links

## 2. Monitoring alignment

- [x] 2.1 Add `/series` to the dashboard collector discovery-path set
- [x] 2.2 Expose row-level series-hub visibility in dashboard data and UI
- [x] 2.3 Add collector test coverage for series-hub detection

## 3. Sitemap alignment

- [x] 3.1 Add `/series` to the backend static sitemap path list
- [x] 3.2 Extend sitemap tests to prevent regression

## 4. Verification

- [x] 4.1 Add focused frontend unit tests for `/series` discovery grouping
- [x] 4.2 Run targeted frontend, backend, and dashboard tests
