# Plan

1. Retain rich canonical snapshots across transient upstream failures.
2. Reject thin/neutral SSR fallbacks with `503` and `noindex`.
3. Make lifecycle evidence authoritative before metadata/schema/sitemap publication.
4. Verify rich fallback, no-thin behavior, and one lifecycle across the reported Test.
