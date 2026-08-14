# Plan

1. Resolve route slugs by CREX API key, choose a deterministic active owner, and return `canonicalSlug` in the bounded SSR snapshot.
2. Redirect aliases at the SSR gateway with `301` before rendering; retain child-route/query intent.
3. Collapse sitemap entries by the same stable identity.
4. Prove with focused backend tests, SSR syntax checks, local HTTP redirect checks, then a production sample of the reported `10MT` pair.
