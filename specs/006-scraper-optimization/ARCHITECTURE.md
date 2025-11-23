# Architecture: High-Reliability Scraper

## Canonical Match ID Mapping Strategy

### Problem
Different sources (Crex, ESPN, etc.) use different ID formats for matches. We need a unified way to refer to a match across the system, while maintaining the link to the source-specific ID.

### Strategy
We use a composite key strategy for internal canonical IDs, but map them to a persistent UUID if needed by the backend. For the scraper's internal state and caching, we use a deterministic ID format.

**Format**: `{source_prefix}:{source_id}`

- **Crex**: `crex:{match_id}` (e.g., `crex:12345`)
- **ESPN**: `espn:{match_id}` (e.g., `espn:98765`)

### Implementation
1. **Ingestion**: When a match is discovered from a source, we generate the canonical ID immediately.
2. **State Tracking**: All Redis keys (freshness, snapshots, locks) use the canonical ID.
3. **Backend Communication**: When pushing data to the backend, we send the source-specific ID as a field, but the backend may use its own ID generation. The scraper maintains the mapping if it needs to correlate backend responses.

### Redis Key Schema
- `match:{canonical_id}:snapshot` - The latest scraped data (JSON)
- `match:{canonical_id}:freshness` - Timestamp of last successful scrape
- `match:{canonical_id}:lock` - Distributed lock for scraping this match
- `queue:priority:{level}` - Task queues containing canonical IDs

### Multi-Domain Support
The `SourceAdapter` interface requires a `get_canonical_id(raw_id)` method to ensure all adapters conform to this strategy.
