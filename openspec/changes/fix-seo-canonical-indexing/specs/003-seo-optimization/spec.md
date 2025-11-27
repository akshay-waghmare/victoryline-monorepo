# Delta for SEO Optimization Spec

## MODIFIED Requirements

### Requirement: Dynamic Canonical URL Injection
The system MUST set a page-specific canonical URL for each match page dynamically.

#### Scenario: Match page canonical
- GIVEN a user navigates to `/cric-live/pak-vs-sl-3rd-odi`
- WHEN the page loads
- THEN the canonical link element MUST be `<link rel="canonical" href="https://www.crickzen.com/cric-live/pak-vs-sl-3rd-odi">`
- AND no static canonical to homepage SHALL exist

#### Scenario: Canonical updates on navigation
- GIVEN a user is on match page A
- WHEN navigating to match page B
- THEN the canonical link MUST update to match page B's URL

### Requirement: Match-Specific Meta Tags
The system MUST generate unique title and description for each match page.

#### Scenario: Live match meta tags
- GIVEN a live match between PAK and SL
- WHEN the match page loads
- THEN the title MUST include "PAK vs SL" and "Live Score"
- AND the description MUST include team names, venue if available, and "Live" status
- AND og:title and twitter:title MUST match the page title

#### Scenario: Meta tags include venue
- GIVEN match info includes venue "Karachi National Stadium"
- WHEN SEO meta is generated
- THEN the description SHOULD include the venue name

### Requirement: Match-Specific JSON-LD Structured Data
The system MUST inject SportsEvent JSON-LD with match-specific data.

#### Scenario: JSON-LD for live match
- GIVEN a live cricket match
- WHEN the page loads
- THEN JSON-LD MUST include:
  - `@type`: "SportsEvent"
  - `name`: Match title (e.g., "PAK vs SL 3rd ODI 2025")
  - `startDate`: ISO 8601 date
  - `location`: Venue information
  - `competitor`: Both team names
  - `url`: Full canonical URL

#### Scenario: No generic JSON-LD
- GIVEN any match page
- WHEN viewing page source
- THEN there SHALL NOT be a generic "Live Cricket Scores" JSON-LD block

## REMOVED Requirements

### Requirement: Static Homepage Canonical
- REMOVED: Static `<link rel="canonical" href="https://www.crickzen.com/">` in index.html
- REASON: Causes all pages to be treated as duplicates of homepage

### Requirement: Generic JSON-LD in index.html
- REMOVED: Static SportsEvent JSON-LD with generic "Live Cricket Scores" name
- REASON: Causes duplicate content signals across all pages
