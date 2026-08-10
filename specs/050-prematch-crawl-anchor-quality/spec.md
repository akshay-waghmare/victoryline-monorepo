# Feature Specification: Prematch Crawl Anchor Quality

**Feature Branch**: `050-prematch-crawl-anchor-quality`  
**Created**: 2026-08-10  
**Status**: Implementation complete pending rollout  
**Input**: User request: "based on CREX, what should we do and what is missing" followed by "use speckit plan and create tasks thorough write tests and complete this"

## Summary

The CREX investigation showed that important live-match URLs are discoverable through multiple paths: match sitemap, fresh update surfaces, series/team hubs, and match-specific crawl links. Crickzen already has canonical `/cric-live/{slug}` pages, sitemaps, and SSR hub links, but sampled hub anchors can still read `TBD vs TBD match preview` when the upstream team fields are sparse even though the stable CREX slug contains the fixture identity.

This phase fixes the smallest high-confidence gap: **crawlable prematch hub anchors must use match-specific team identity before Google reaches the match page**. It does not add a News sitemap, fake `NewsArticle` schema, duplicate match routes, or editorial generators.

## User Scenarios & Testing

### User Story 1 - Googlebot sees real teams in prematch hub anchors (Priority: P1)

As a crawler, I need SSR hub links to say `HK vs TAN match preview` instead of `TBD vs TBD match preview` when the canonical slug contains the teams, so I can understand the linked match before crawling the destination.

**Independent Test**: Build a canonical match label from a match object whose team fields contain `TBD`, `Team 1`, or `Team 2`, but whose CREX URL contains a valid `team-vs-team` slug. The label should use the slug identity.

### User Story 2 - Placeholder fallback remains honest when no slug identity exists (Priority: P1)

As a user and crawler, I should not see invented teams when the feed and route cannot prove identity.

**Independent Test**: Build a canonical match label from blank or placeholder team fields with no usable `-vs-` slug. The label may remain `TBD vs TBD live score`.

### User Story 3 - Existing lifecycle intent labels remain stable (Priority: P2)

As an SEO operator, I need the same link helper to preserve lifecycle intent: upcoming pages say preview, live pages say live score, and completed pages say result.

**Independent Test**: Existing focused unit tests for `buildCanonicalMatchLinkLabel()` continue to pass for live, upcoming, and completed states.

## Requirements

- **FR-001**: `buildCanonicalMatchLinkLabel()` MUST treat `TBD`, `TBC`, `Team 1`, `Team 2`, `Team A`, `Team B`, `unknown`, `null`, and `undefined` as placeholders.
- **FR-002**: When one or both team labels are placeholders and the canonical match slug contains `-vs-`, the helper MUST derive both team labels from the slug.
- **FR-003**: The helper MUST preserve honest `TBD` fallback when no valid canonical slug is available.
- **FR-004**: The fix MUST flow through existing SSR hub code that calls `buildCanonicalMatchLinkLabel()`.
- **FR-005**: The fix MUST NOT change `/cric-live/{slug}` canonical policy.
- **FR-006**: The fix MUST NOT introduce News sitemap, `NewsArticle`, or `LiveBlogPosting` markup for ordinary match pages.
- **FR-007**: Tests MUST cover blank-team fallback, `TBD` placeholder fallback, and numbered placeholder fallback.

## Success Criteria

- **SC-001**: Focused match-utils tests prove placeholder team fields with slug identity produce `HK vs TAN match preview`.
- **SC-002**: TypeScript application compilation passes.
- **SC-003**: Spec tasks record that production rollout and GSC outcome proof remain separate gates.

