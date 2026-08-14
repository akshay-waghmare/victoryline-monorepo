# Implementation Plan: Lifecycle-aware NewsArticle eligibility

## Technical approach

1. Define one explicit `shouldEmitNewsArticle` eligibility gate next to the existing `shouldEmitLiveBlogPosting` gate.
2. Require non-upcoming lifecycle, the existing high-value coverage rule, at least three substantive update bodies, parseable update timestamps, and a real modification timestamp. Reuse the existing structured-data service so author, publisher, dates, and canonical page identity are consistent.
3. Keep the ordinary article factory as the fallback. Do not emit both `Article` and `NewsArticle` for one page.
4. Leave the SportsEvent guard independent: trustworthy start date and venue are still required, and missing facts suppress the event schema rather than inventing values.
5. Add lifecycle regression tests and run the existing frontend SEO/SSR checks. The result is not deploy-ready until the Angular test/build and raw Googlebot parity gates pass.

## Scope boundaries

- Frontend component and lifecycle tests only for this slice.
- No sitemap, crawl-link, backend model, or GSC scheduler changes.
- No News sitemap and no Google Indexing API requests.
- No change to visible upcoming content beyond preserving honest event facts.

## Verification gates

1. TypeScript compile/build passes with the repository-compatible Node/OpenSSL setting.
2. Lifecycle tests prove no NewsArticle for upcoming or sparse pages and NewsArticle + LiveBlogPosting only for eligible coverage.
3. Structured-data service tests are verified separately or through a clean full-suite run.
4. Raw SSR and normal/desktop/mobile Googlebot responses expose the same eligible schema set for a real sample.
5. The wiki records the implementation checkpoint and explicitly says GSC indexing remains unproven.
