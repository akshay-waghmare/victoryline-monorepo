# Tasks: Match News Freshness Support

**Input**: Design documents from `/specs/038-match-news-freshness-support/`
**Prerequisites**: `spec.md`, `plan.md`

## Phase 1 - Spec Kit foundation

- [x] T001 Create `specs/038-match-news-freshness-support/spec.md`
- [x] T002 Create `specs/038-match-news-freshness-support/plan.md`
- [x] T003 Create `specs/038-match-news-freshness-support/tasks.md`

## Phase 2 - Route and content contract

- [x] T004 Define the freshness-support route family and canonical rules for preview, live-update, and result/highlights pages.
- [ ] T005 Document the keyword-ownership model across canonical match, preview, live-update, and result pages.
- [x] T006 Decide the first vertical-slice fixture and minimum content contract for each page type.

## Phase 3 - Crawl graph and sitemap integration

- [x] T007 Add SSR crawl-path support for the first freshness page from at least one hub surface.
- [x] T008 Add canonical-match-page links to related freshness-support pages for the sample fixture.
- [x] T009 Add sitemap coverage for the first freshness-support page set.

## Phase 4 - Metadata, timestamps, and structured data

- [x] T010 Implement visible publish/update timestamp blocks for freshness-support pages.
- [x] T011 Implement `Article` or `NewsArticle` structured data with honest `datePublished` and `dateModified`.
- [ ] T012 Enforce the update-cadence rule so timestamps only move on meaningful editorial changes.

## Phase 5 - Verification

- [ ] T013 Verify raw SSR HTML for one preview page, one live-update page, one result/highlights page, and the related canonical `/cric-live/{slug}` page.
- [ ] T014 Verify each sample freshness page is linked from at least one SSR hub and from the canonical match page.
- [ ] T015 Verify sitemap inclusion and canonical-link relationships for the sample freshness pages.
- [ ] T016 Verify the keyword ownership remains distinct and the canonical match page does not lose its entity-intent role.

## Notes

- This phase is intentionally a **delta** on top of `021`, `032`, `033`, `034`, `035`, `036`, and `037`.
- Do not reopen `/live-cricket-score/{slug}` migration or child-route self-canonicalization in this phase.
- Do not ship thin “news” pages with shallow duplicated match summaries just to chase freshness snippets.
