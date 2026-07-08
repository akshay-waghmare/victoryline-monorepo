# Lifecycle Checklist

Use this checklist to audit one match URL across its full programmatic SEO lifecycle.

## Upcoming

The page should exist before the match starts, ideally `12-24` hours early.

Verify:

- `200` status on the exact `/cric-live/{slug}` URL
- self-canonical to the same `/cric-live/{slug}`
- `index,follow`
- exactly one `h1`
- title contains teams plus live-score intent, not a generic placeholder
- meta description reflects the fixture, series, and date
- JSON-LD includes `Article` and `BreadcrumbList`
- JSON-LD includes `SportsEvent` whenever `startDate` is known; omit only fields that are weak, such as unknown venue
- the page is present in sitemap
- sitemap `lastmod` is not in the future
- the URL is linked by real SSR anchors from one or more hubs

## Live

Verify:

- title shifts toward live intent such as ball-by-ball, score, or updates
- score-first content is visible without hiding the SEO-supporting sections from SSR
- `SportsEvent.eventStatus` reflects the live state when supported by the model
- live hubs and relevant league hubs still link to the page
- if the page was only discovered after going live, treat that as a discovery failure even if the page itself is technically valid

## Completed

Verify:

- the page remains `200` and self-canonical
- exactly one `h1`
- title changes to result or scorecard intent without becoming generic
- scorecard and commentary remain crawlable content, not empty client shells
- archive or result hubs still link to the page so it is not orphaned after completion
- sitemap still includes the page if the archive policy expects it to rank historically

## Shared breadcrumb expectation

Breadcrumbs should describe the cricket hierarchy semantically, not just UI locations. Prefer meaning like:

- Cricket -> Series -> Match

Do not treat breadcrumb tweaks as the primary fix when the actual issue is discovery timing, missing anchors, or canonical policy.
