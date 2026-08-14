# Verification quickstart

1. Run the component/lifecycle and structured-data tests.
2. Build the Angular browser/SSR artifacts with the repository-compatible Node/OpenSSL setting.
3. For an upcoming match, verify raw HTML contains `Article`, valid `SportsEvent` only when startDate/location exist, and no `NewsArticle`/`LiveBlogPosting`.
4. For a genuine high-value live page, verify visible substantive updates, real timestamps, `NewsArticle`, and `LiveBlogPosting` agree.
5. For a sparse live or completed result page, verify it falls back to `Article` and does not claim editorial coverage.
6. Run normal, desktop Googlebot, and mobile Googlebot raw HTML checks; record schema parity separately from GSC outcomes.
7. Keep the fixed cohort monitor and GSC evidence rules from Spec 051 unchanged.
