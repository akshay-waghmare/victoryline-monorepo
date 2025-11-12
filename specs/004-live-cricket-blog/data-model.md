# Data Model: Live Cricket Updates Blog

Date: 2025-11-12 | Branch: 004-live-cricket-blog

## Entities

### BlogPost (Strapi content type)
- id: number (auto)
- title: string (required, max 180)
- slug: UID from title (unique, max 200)
- excerpt: text (optional)
- content: markdown (required)
- status: enum [DRAFT, PUBLISHED] (default DRAFT)
- publishedAt: datetime (on publish)
- seoTitle: string (optional, <= 180)
- seoDescription: text (optional, <= 300)
- ogImage: media (optional, generates OG 1200x630 variant)
- tags: array[string]
- createdAt: datetime
- updatedAt: datetime

Validation Rules
- title required, length ≤ 180
- slug unique, length ≤ 200
- seoDescription length ≤ 300; fallback to excerpt if empty
- status controls visibility; only PUBLISHED exposed to public API

State Transitions
- DRAFT → PUBLISHED (sets publishedAt)
- PUBLISHED → DRAFT (unpublish; remove from sitemap on next sync)

### LiveEvent (Spring JPA entity)
- id: bigint (auto)
- matchId: string (required)
- message: string (required, 1..500)
- eventType: enum [ball, wicket, four, six, info, milestone]
- over: string (optional, pattern \d+\.(\d) )
- innings: string (optional, values "1"|"2")
- createdAt: timestamp (default now)

Indexes
- idx_live_event_match_time (matchId, createdAt desc)

Constraints
- message not blank
- createdAt immutable

### SiteSettings (Strapi single type)
- sitemapLastModified: datetime
- blogBasePath: string (default "/blog")
- cacheTtlSeconds: number (default 600)

## Relationships
- BlogPost.tags: one-to-many (tag strings; optional separate Tag entity later)
- LiveEvent has no foreign key to BlogPost; linkage only for recap conversion flow

## Migrations (Backend)
- Flyway: Vxxx__create_live_event.sql
```
CREATE TABLE IF NOT EXISTS live_event (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  match_id VARCHAR(64) NOT NULL,
  message VARCHAR(500) NOT NULL,
  event_type VARCHAR(16) NOT NULL,
  over_label VARCHAR(8) NULL,
  innings_label VARCHAR(8) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_live_event_match_time (match_id, created_at)
);
```
