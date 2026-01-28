# Data Model: Match Page Title SEO Optimization

**Feature**: 008-match-title-seo  
**Date**: 2026-01-28  
**Status**: Complete

## Overview

This feature does not introduce new database tables or entities. It leverages existing data structures from Feature 003 (SEO Optimization) and the core match data model. This document describes the data contracts and transformations involved in generating SEO-optimized titles and descriptions.

---

## Existing Entities (No Modifications)

### Match (Backend - Existing)

**Source**: Backend MySQL database, `matches` table  
**Access**: Via Backend REST API `/api/matches/{id}`

**Relevant Fields**:
```typescript
interface Match {
  id: string;                    // Unique match identifier
  homeTeam: string;              // Home team official name (e.g., "Bangladesh")
  awayTeam: string;              // Away team official name (e.g., "Afghanistan")
  status: MatchStatus;           // Current match state
  matchDate: Date;               // ISO 8601 timestamp
  tournament?: string;           // Tournament name (e.g., "Asia Cup 2026")
  format?: string;               // Match format (e.g., "T20", "ODI", "Test")
  venue?: string;                // Venue name
}

enum MatchStatus {
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  FINISHED = 'finished',
  ABANDONED = 'abandoned',
  CANCELLED = 'cancelled'
}
```

**Notes**:
- `homeTeam` and `awayTeam` are stored as full official names (not abbreviations)
- `status` field determines title format (live vs completed vs abandoned)
- No schema changes required for this feature

---

## New Data Structures (Runtime Only)

### MatchMetadata (Frontend SSR - Generated)

**Lifecycle**: Created during SSR request, not persisted  
**Purpose**: Encapsulates all SEO metadata for a match page

```typescript
interface MatchMetadata {
  title: string;                 // SEO-optimized page title (≤60 chars)
  description: string;           // Meta description (≤155 chars)
  canonicalUrl: string;          // Canonical URL for this match page
  ogTitle: string;               // Open Graph title (same as title)
  ogDescription: string;         // Open Graph description (same as description)
  ogImage: string;               // Open Graph image URL
  twitterCard: 'summary_large_image'; // Twitter card type
  twitterTitle: string;          // Twitter title (same as title)
  twitterDescription: string;    // Twitter description (same as description)
  jsonLd: object;                // Schema.org structured data (JSON-LD)
}
```

**Generation Logic** (see `contracts/match-metadata.schema.json`):
```typescript
function generateMatchMetadata(match: Match): MatchMetadata {
  const title = generateTitle(match.homeTeam, match.awayTeam, match.status);
  const description = generateDescription(match.homeTeam, match.awayTeam, match.status);
  
  return {
    title,
    description,
    canonicalUrl: `https://victoryline.live/cric-live/${match.id}`,
    ogTitle: title,
    ogDescription: description,
    ogImage: `https://victoryline.live/og-images/${match.id}.jpg`,
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: description,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'SportsEvent',
      name: `${match.homeTeam} vs ${match.awayTeam}`,
      startDate: match.matchDate,
      eventStatus: mapStatusToSchema(match.status),
      homeTeam: { '@type': 'SportsTeam', name: match.homeTeam },
      awayTeam: { '@type': 'SportsTeam', name: match.awayTeam }
    }
  };
}
```

---

## Data Transformations

### Title Generation Rules

**Input**: `Match` object  
**Output**: SEO-optimized title string (≤60 characters)

**Format by Status**:
```typescript
function generateTitle(homeTeam: string, awayTeam: string, status: MatchStatus): string {
  const teams = `${homeTeam} vs ${awayTeam}`;
  let suffix: string;
  
  switch (status) {
    case 'completed':
    case 'finished':
      suffix = ' Final Score | Full Scorecard';
      break;
    case 'abandoned':
    case 'cancelled':
      suffix = ' Match Scorecard';
      break;
    case 'live':
    case 'in-progress':
    case 'scheduled':
    case 'upcoming':
    default:
      suffix = ' Live Score Ball by Ball';
  }
  
  const fullTitle = teams + suffix;
  
  // Truncate if exceeds 60 characters
  if (fullTitle.length > 60) {
    const maxTeamsLength = 60 - suffix.length - 3; // -3 for "..."
    const truncatedTeams = teams.substring(0, maxTeamsLength);
    const lastSpace = truncatedTeams.lastIndexOf(' ');
    const finalTeams = lastSpace > 0 
      ? truncatedTeams.substring(0, lastSpace) + '...'
      : truncatedTeams + '...';
    return finalTeams + suffix;
  }
  
  return fullTitle;
}
```

**Examples**:
| Input | Output | Length |
|-------|--------|--------|
| "India" vs "Australia", live | "India vs Australia Live Score Ball by Ball" | 46 |
| "Mumbai Indians" vs "Chennai Super Kings", completed | "Mumbai Indians vs Chennai... Final Score \| Full Scorecard" | 60 |
| "RCB" vs "KKR", abandoned | "RCB vs KKR Match Scorecard" | 27 |

---

### Description Generation Rules

**Input**: `Match` object  
**Output**: Meta description (≤155 characters)

**Format by Status**:
```typescript
function generateDescription(homeTeam: string, awayTeam: string, status: MatchStatus): string {
  const teams = `${homeTeam} vs ${awayTeam}`;
  
  switch (status) {
    case 'completed':
    case 'finished':
      return `${teams} final score, full scorecard, match summary, and highlights on VictoryLine.`;
    case 'abandoned':
    case 'cancelled':
      return `${teams} match scorecard and status updates on VictoryLine.`;
    case 'live':
    case 'in-progress':
    case 'scheduled':
    case 'upcoming':
    default:
      return `${teams} live score, ball by ball commentary, latest runs, wickets, overs, and match updates.`;
  }
}
```

**Examples**:
- Live: "Bangladesh vs Afghanistan live score, ball by ball commentary, latest runs, wickets, overs, and match updates." (118 chars)
- Completed: "India vs Australia final score, full scorecard, match summary, and highlights on VictoryLine." (95 chars)

---

### Status Mapping (Match Status → Schema.org Event Status)

**Purpose**: Convert internal match status to Schema.org vocabulary

```typescript
function mapStatusToSchema(status: MatchStatus): string {
  switch (status) {
    case 'live':
    case 'in-progress':
      return 'EventInProgress'; // https://schema.org/EventStatusType
    case 'completed':
    case 'finished':
      return 'EventCompleted';
    case 'cancelled':
      return 'EventCancelled';
    case 'scheduled':
    case 'upcoming':
      return 'EventScheduled';
    case 'abandoned':
    default:
      return 'EventPostponed'; // Closest match for abandoned
  }
}
```

---

## Data Flow Diagram

```
[Browser Request] 
    ↓
[Frontend SSR (server.ts)]
    ↓ GET /api/matches/{id}
[Backend REST API]
    ↓ SELECT * FROM matches WHERE id = ?
[MySQL Database]
    ↓ Match data
[Backend REST API]
    ↓ JSON response
[Frontend SSR]
    ↓ generateMatchMetadata(match)
[MatchMetadata object]
    ↓ Render HTML with <title>, <meta>, <script type="application/ld+json">
[HTML Response] 
    ↓
[Browser / Search Crawler]
```

**Key Points**:
- No new database queries introduced (reuses existing `/api/matches/{id}`)
- Transformation happens in-memory during SSR request
- No caching layer needed (match data already cached by Backend)

---

## Validation Rules

### Title Validation
- **Length**: ≤60 characters (strict enforcement)
- **Format**: Must include " vs " separator between team names
- **Status suffix**: Must be one of: "Live Score Ball by Ball", "Final Score | Full Scorecard", "Match Scorecard"
- **Characters**: Allow all UTF-8 characters (no HTML escaping needed in `<title>`)

### Description Validation
- **Length**: ≤155 characters (strict enforcement)
- **Content**: Must include team names and status-appropriate keywords
- **Ending**: Must end with "on VictoryLine." or "and match updates."

### Team Name Validation (Input)
- **Not null**: Fallback to "TBD" if null or empty
- **Trim whitespace**: Remove leading/trailing spaces
- **Special chars**: Preserve as-is (apostrophes, hyphens, Unicode)

---

## Edge Cases & Fallbacks

| Scenario | Handling |
|----------|----------|
| Team name is null/empty | Use "TBD" as placeholder |
| Match data fetch timeout (>200ms) | Use generic title: "Match {id} \| VictoryLine" |
| Unknown match status | Default to "Live Score Ball by Ball" format |
| Title exceeds 60 chars | Truncate teams portion at word boundary + "..." |
| Description exceeds 155 chars | Should not occur (templates pre-validated), truncate if edge case |
| Special characters in team names | Preserve (HTML `<title>` supports UTF-8) |

---

## Related Contracts

See [contracts/match-metadata.schema.json](./contracts/match-metadata.schema.json) for JSON Schema validation rules.

---

## Summary

**New Entities**: 0 (no database changes)  
**Modified Entities**: 0 (read-only access to existing `Match` entity)  
**Runtime Structures**: 1 (`MatchMetadata` - ephemeral, not persisted)  
**Data Dependencies**: Backend API (`/api/matches/{id}`)  
**Validation**: Title length (60 chars), Description length (155 chars), Status mapping
