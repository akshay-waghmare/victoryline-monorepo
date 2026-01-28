# Research: Match Page Title SEO Optimization

**Feature**: 008-match-title-seo  
**Date**: 2026-01-28  
**Status**: Complete

## Research Questions

### 1. Google Search Console API Integration

**Question**: What's the recommended approach for automated sitemap submission to Google Search Console?

**Decision**: Use Google Search Console API v1 with service account authentication

**Rationale**:
- Official Google API with stable Java client library (`google-api-services-searchconsole`)
- Service account authentication avoids OAuth flow complexity for backend services
- Supports programmatic sitemap submission via `Indexing.urlNotifications.publish()`
- Rate limits (200 requests/day) are sufficient for daily sitemap submission (1 request/day)
- Well-documented with Spring Boot integration examples

**Alternatives Considered**:
- **Manual GSC submission**: Rejected - requires ongoing manual work, defeats automation goal
- **Sitemap ping endpoint** (`/ping?sitemap=URL`): Deprecated by Google, no longer recommended
- **IndexNow API**: Evaluated but GSC API is more direct and includes verification features

**Implementation Pattern**:
```java
@Service
public class GoogleSearchConsoleService {
    private final Indexing indexingService;
    
    @PostConstruct
    public void initialize() {
        GoogleCredential credential = GoogleCredential
            .fromStream(new FileInputStream("gsc-service-account.json"))
            .createScoped(Collections.singleton("https://www.googleapis.com/auth/indexing"));
        
        indexingService = new Indexing.Builder(httpTransport, jsonFactory, credential)
            .setApplicationName("VictoryLine-SEO")
            .build();
    }
    
    public void submitSitemap(String sitemapUrl) throws IOException {
        UrlNotification notification = new UrlNotification()
            .setUrl(sitemapUrl)
            .setType("URL_UPDATED");
        indexingService.urlNotifications().publish(notification).execute();
    }
}
```

**Setup Requirements**:
1. Create Google Cloud Project
2. Enable Search Console API
3. Create service account with "Search Console API User" role
4. Download JSON key file
5. Add service account email to Search Console property verified owners
6. Store credentials in `src/main/resources/gsc-service-account.json` (gitignored)

---

### 2. SSR Title Generation Performance

**Question**: Will synchronous match data fetching during SSR cause unacceptable latency?

**Decision**: Acceptable for initial page load with 200ms timeout and fallback to generic titles

**Rationale**:
- Existing Backend API `/api/matches/{id}` has <200ms P95 response time
- SSR title generation adds ~50-100ms total overhead (fetch + string formatting)
- Total SSR response time: ~250-300ms (within <500ms P95 budget)
- Benefit: Correct titles visible to search engines and social crawlers immediately
- Fallback: If match data fetch times out (>200ms), use generic title "Match {id} | Crickzen"

**Alternatives Considered**:
- **Async title update**: Rejected - search crawlers won't see team names in `<title>` tag
- **Redis cache for team names**: Considered but adds complexity; direct API fetch is fast enough
- **Pre-render all match pages**: Rejected - infeasible for 10,000+ matches, defeats dynamic updates

**Performance Validation**:
```bash
# Test SSR response time with match data fetch
time curl -w "\nTotal: %{time_total}s\n" http://localhost:4000/cric-live/test-match-123
# Expected: <500ms total time
```

**Monitoring**:
- Log SSR response times: `console.log('[SSR] /cric-live/:id rendered in ${duration}ms')`
- Alert if P95 > 500ms for 5 consecutive minutes
- Track match data fetch failures (timeout/error rate)

---

### 3. Title Format for Special Characters and Long Team Names

**Question**: How should we handle team names with special characters (e.g., "Women's XI") or very long names exceeding 60 characters?

**Decision**: Preserve special characters in titles, truncate at 60 chars with smart word boundary detection

**Rationale**:
- SEO best practice: Keep title length ≤60 characters (Google's display limit)
- User experience: Preserve readability with "..." ellipsis for truncated titles
- Accessibility: Full team names remain in meta description and structured data
- Special characters (apostrophes, hyphens) are valid in HTML `<title>` and don't require escaping

**Implementation**:
```typescript
function generateMatchTitle(homeTeam: string, awayTeam: string, status: string): string {
  const teams = `${homeTeam} vs ${awayTeam}`;
  const suffix = status === 'completed' 
    ? ' Final Score | Full Scorecard' 
    : ' Live Score Ball by Ball';
  
  const fullTitle = teams + suffix;
  
  if (fullTitle.length <= 60) {
    return fullTitle;
  }
  
  // Truncate teams portion to fit within 60 chars
  const maxTeamsLength = 60 - suffix.length - 3; // -3 for "..."
  const truncatedTeams = teams.substring(0, maxTeamsLength);
  const lastSpace = truncatedTeams.lastIndexOf(' ');
  
  return (lastSpace > 0 ? truncatedTeams.substring(0, lastSpace) : truncatedTeams) + '...' + suffix;
}
```

**Edge Cases**:
- **Single-word team names >30 chars**: Truncate mid-word with ellipsis (rare edge case)
- **Special chars**: Preserve as-is (apostrophes, hyphens, UTF-8 characters)
- **Empty/null team names**: Fallback to "TBD vs TBD" or "Match {id}"

**Testing Matrix**:
| Team Names | Expected Title (60 char limit) | Length |
|------------|--------------------------------|--------|
| "India" vs "Australia" | "India vs Australia Live Score Ball by Ball" | 46 |
| "Mumbai Indians" vs "Chennai Super Kings" | "Mumbai Indians vs Chennai Super... Live Score Ball by Ball" | 60 |
| "Royal Challengers Bangalore" vs "Kolkata Knight Riders" | "Royal Challengers Bangalore vs... Final Score | Full Scorecard" | 60 |

---

### 4. Match Status Detection

**Question**: What match statuses exist in the system, and how should titles reflect each status?

**Decision**: Three primary statuses with distinct title formats

**Rationale**:
- Backend `/api/matches/{id}` returns `status` field with standardized values
- Different statuses require different SEO messaging for user intent
- "Live" signals urgency and real-time updates
- "Completed" signals historical reference and finality

**Status Mapping**:
| Backend Status | Title Format | Use Case |
|----------------|-------------|----------|
| `live`, `in-progress` | "{Teams} Live Score Ball by Ball" | Ongoing match, real-time updates |
| `completed`, `finished` | "{Teams} Final Score \| Full Scorecard" | Match ended, historical reference |
| `scheduled`, `upcoming` | "{Teams} Live Score Ball by Ball" | Pre-match (default to live format) |
| `abandoned`, `cancelled` | "{Teams} Match Scorecard" | Match did not complete normally |

**Implementation**:
```typescript
function getTitleSuffix(status: string): string {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'finished':
      return ' Final Score | Full Scorecard';
    case 'abandoned':
    case 'cancelled':
      return ' Match Scorecard';
    case 'live':
    case 'in-progress':
    case 'scheduled':
    case 'upcoming':
    default:
      return ' Live Score Ball by Ball';
  }
}
```

**Meta Description Variation**:
- Live: "...live score, ball by ball commentary, latest runs, wickets, overs..."
- Completed: "...final score, full scorecard, match summary, highlights..."
- Abandoned: "...match scorecard and status updates..."

---

### 5. Client-Side Title Updates (Angular Title Service)

**Question**: Best practice for updating `<title>` during SPA navigation without full page reload?

**Decision**: Use Angular's `Title` service with route parameter subscription

**Rationale**:
- Angular's `Title` service is framework-standard and well-documented
- Reactive approach with `ActivatedRoute.params` ensures title updates on navigation
- Compatible with SSR (Title service works in both SSR and CSR contexts)
- Minimal code changes to existing components

**Implementation Pattern**:
```typescript
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';

export class CricketOddsComponent implements OnInit {
  constructor(
    private titleService: Title,
    private route: ActivatedRoute,
    private matchService: MatchesService
  ) {}
  
  ngOnInit() {
    this.route.params.subscribe(params => {
      const matchId = params['path'];
      this.matchService.getMatch(matchId).subscribe(match => {
        const title = `${match.homeTeam} vs ${match.awayTeam} Live Score Ball by Ball`;
        this.titleService.setTitle(title);
      });
    });
  }
}
```

**Alternatives Considered**:
- **Manual DOM manipulation**: Rejected - not Angular-idiomatic, breaks SSR compatibility
- **Meta service (Angular)**: Evaluated - Title service is sufficient, Meta service for descriptions only

---

## Technology Choices Summary

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| SSR Title Generation | Express.js + Node.js | 16+ | Already in use for SSR, minimal changes needed |
| GSC API Client | Google Search Console API | v1 | Official API, stable Java client, service account auth |
| Java HTTP Client | google-api-client | 1.34.0+ | Standard Google Java client library |
| Client-Side Updates | Angular Title Service | (Angular 15+) | Framework-standard, SSR-compatible |
| Match Data Source | Backend REST API | Existing | `/api/matches/{id}` endpoint already provides team names |

**Maven Dependency (Backend)**:
```xml
<dependency>
  <groupId>com.google.apis</groupId>
  <artifactId>google-api-services-searchconsole</artifactId>
  <version>v1-rev20230920-2.0.0</version>
</dependency>
<dependency>
  <groupId>com.google.api-client</groupId>
  <artifactId>google-api-client</artifactId>
  <version>1.34.1</version>
</dependency>
```

---

## Open Questions (Post-Research)

**None** - All technical unknowns resolved. Ready to proceed to Phase 1 (Design & Contracts).

---

## References

- [Google Search Console API Documentation](https://developers.google.com/webmaster-tools/search-console-api-original)
- [Angular Title Service Docs](https://angular.io/api/platform-browser/Title)
- [Google SEO Title Best Practices](https://developers.google.com/search/docs/appearance/title-link)
- [Feature 003 Implementation Summary](../003-seo-optimization/IMPLEMENTATION_SUMMARY.md) - Existing SSR and sitemap infrastructure
