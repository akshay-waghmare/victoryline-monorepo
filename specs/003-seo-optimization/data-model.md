# Data Model: SEO Optimization for Crickzen

## Entities

### Match
- id: string
- tournament: string
- season: string (YYYY)
- date: ISO 8601
- format: enum (T20, ODI, TEST)
- venue: string
- teamA: TeamRef
- teamB: TeamRef
- status: enum (scheduled, live, completed, archived)
- scoreSummary: string
- slug: URLSlug

### Player
- id: string
- name: string
- role: string
- team: TeamRef
- nationality: string
- photoUrl: string
- slug: URLSlug

### Team
- id: string
- name: string
- logoUrl: string
- foundingDate: string
- squad: PlayerRef[]
- slug: URLSlug

### PageMetadata
- path: string (path-only)
- title: string
- description: string
- canonicalUrl: string
- robots: string (e.g., index,follow / noindex,nofollow)
- ogImageUrl: string
- lastModified: ISO 8601

### StructuredDataBlock
- type: string (SportsEvent, Person, SportsTeam, BreadcrumbList, Organization)
- payload: object (JSON-LD)

### URLSlug
- value: string (kebab-case)
- createdFrom: string[] (fields used)
- uniquenessScope: string (tournament-season for matches)

### SitemapEntry
- loc: string (absolute URL)
- lastmod: ISO 8601
- changefreq: enum (daily, weekly, monthly)
- priority: number (0.0–1.0)

### ImageAsset
- id: string
- src: string (absolute URL)
- width: number
- height: number
- focalRegion: { x: number; y: number; w: number; h: number } (safe crop zone)

## Relationships
- Match ↔ Team (two TeamRefs)
- Team ↔ Player (many)
- PageMetadata ↔ StructuredDataBlock (one-to-many)
- Entities ↔ URLSlug (one-to-one)

## Validation Rules
- URLSlug.value must be lowercase, hyphen-separated, ASCII-only; collisions resolved by appending short id.
- PageMetadata.title 50–60 chars; description 150–160 chars.
- SitemapEntry.priority within [0.0,1.0]; changefreq matches policy per entity type.
- ImageAsset width≥1200; height≥630 for primary OG; square variant width=height≥1200.

## State Transitions (Match)
- scheduled → live → completed → archived
- Effects: indexing priority, TTLs, title patterns, and structured data `eventStatus` update accordingly.
