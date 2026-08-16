# Plan

1. Establish a production baseline: redirect chain, cold/warm latency, HTML completeness, canonical snapshot, source timestamps, schema, and sitemap membership for AUS–BAN plus one match per lifecycle.
2. Repair the identity/lifecycle evidence merge so a canonical owner retains sibling format and static evidence; resolve the AUS–BAN contradiction before performance caching changes.
3. Add a retained full-document SSR cache keyed by canonical match ID and semantic content fingerprint. Serve warm rich documents immediately; refresh asynchronously and invalidate only on meaningful changes.
4. Define one lifecycle-cohort resolver shared by hubs and sitemap publication: live, upcoming, recent completed, and archive completed. Keep the cohorts mutually exclusive.
5. Persist a meaningful-content fingerprint and content-modified timestamp, then derive sitemap `lastmod` only from that timestamp. Rebuild manifests without altering unchanged URL lastmods.
6. Add focused tests, public latency/content parity tests, sitemap cohort audits, and a staged production rollout with rollback evidence.
