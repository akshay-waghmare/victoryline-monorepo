# Content Discovery Feature

> **Smart, personalized match discovery with search, filtering, recommendations, and offline support**

## 📋 Overview

The Content Discovery feature is a comprehensive solution for helping users find cricket matches through intelligent filtering, search with autocomplete, personalized recommendations, and viewing history. Built with Angular 7, it includes offline support, analytics tracking, and production-ready rate limiting.

**Key Capabilities:**
- 🔍 **Smart Search** with autocomplete and debounced queries (300ms)
- 🎯 **Advanced Filtering** by match type (live/upcoming/completed) and league
- 📜 **Recently Viewed** history with localStorage persistence (20 items max)
- ⭐ **Personalized Recommendations** using 6-factor scoring algorithm
- 📱 **Offline Support** with IndexedDB caching (24-hour expiry)
- 📊 **Analytics Tracking** for all user interactions (7 event types)
- 🚀 **Performance** with virtual scrolling and lazy-loaded images
- ♿ **Accessibility** WCAG AA compliant with keyboard navigation
- 🔄 **Rate Limiting** with exponential backoff and retry UI

---

## 🏗️ Architecture

### Component Hierarchy

```
ContentDiscoveryComponent (Main Container)
├── SearchComponent (Search with Autocomplete)
├── MatchSkeletonComponent (Loading States)
├── EmptyStateComponent (No Results UI)
└── Match Cards (Virtual Scrolled List)
```

### Service Layer

```
┌─────────────────────────────────────────────────────┐
│         ContentDiscoveryComponent                   │
│  (Orchestrates UI, handles user interactions)       │
└────────────┬────────────────────────────────────────┘
             │
             ├──> DiscoveryFilterService ──> MatchesService (Backend API)
             │    (Filtering, search logic)
             │
             ├──> MatchHistoryService ──> localStorage
             │    (View tracking, favorites)
             │
             ├──> RecommendationService
             │    (6-factor scoring algorithm)
             │
             ├──> AnalyticsService ──> Google Analytics
             │    (Event tracking, gtag.js)
             │
             ├──> OfflineCacheService ──> IndexedDB
             │    (Offline data persistence)
             │
             ├──> NetworkStatusService ──> Navigator API
             │    (Online/offline detection)
             │
             └──> RateLimitService
                  (Exponential backoff, throttling)
```

### Data Flow

```
User Action (Search/Filter/Click)
      │
      ▼
ContentDiscoveryComponent
      │
      ├──> Analytics Tracking (Log event)
      │
      ├──> Rate Limiting Check (Throttle if needed)
      │
      ▼
DiscoveryFilterService
      │
      ├──> Cache Check (30s TTL)
      │    └── Cache Hit ──> Return cached data
      │
      └──> API Call (with retry logic)
           │
           ├──> Success ──> Cache + Offline Store + Update UI
           │
           └──> Failure ──> Retry (exponential backoff)
                           └──> Exhausted ──> Fallback to offline cache
```

---

## 📦 Components

### ContentDiscoveryComponent
**Path:** `content-discovery.component.ts` (242 lines)

**Responsibilities:**
- Orchestrate all discovery features
- Manage loading/error states
- Handle online/offline transitions
- Track analytics for user actions

**Key Properties:**
- `matches: MatchCardViewModel[]` - Filtered/searched matches
- `recentlyViewed: MatchCardViewModel[]` - Last 5 viewed matches
- `recommended: MatchCardViewModel[]` - Top 5 personalized recommendations
- `isOnline: boolean` - Network connectivity status
- `error: string | null` - Error message for retry UI

**Key Methods:**
- `loadInitial()` - Load initial matches on page load
- `applyFilters()` - Apply type/league filters
- `onSearch(query)` - Search matches by team/venue
- `onMatchClick(match, source, position?)` - Navigate to match details with tracking
- `retry()` - Retry after rate limit/network error

### SearchComponent
**Path:** `search.component.ts` (135 lines)

**Responsibilities:**
- Search input with debounced queries (300ms)
- Autocomplete suggestions dropdown
- 5-minute cache for suggestions

**Key Features:**
- RxJS Subject for input debouncing
- Keyboard navigation (Arrow keys, Enter)
- Click-outside to close dropdown
- Loading indicator during search

### MatchSkeletonComponent
**Path:** `match-skeleton.component.ts` (143 lines)

**Responsibilities:**
- Animated loading placeholder
- Compact and full-width variants
- Respects `prefers-reduced-motion`

### EmptyStateComponent
**Path:** `empty-state.component.ts` (142 lines)

**Responsibilities:**
- User-friendly empty state messages
- 4 types: no-results, no-history, no-recommendations, error
- Inline SVG icons
- Optional action button with callback

---

## 🔧 Services

### DiscoveryFilterService
**Path:** `discovery-filter.service.ts` (146 lines)

**Purpose:** Central service for filtering and searching matches

**Key Methods:**
- `getInitialMatches()` - Fetch all matches with 30s cache
- `filterMatches(filter)` - Filter by type/league with rate limiting
- `search(query)` - Search by team/venue with throttling (300ms)

**Caching Strategy:**
- 30-second cache TTL (matches auto-refresh interval)
- In-memory cache with timestamp validation
- Falls back to offline cache on failure

### MatchHistoryService
**Path:** `match-history.service.ts` (108 lines)

**Purpose:** Track viewed matches and identify favorite teams

**Key Methods:**
- `recordMatchView(match)` - Add to history (20-item FIFO)
- `getRecentlyViewed(limit?)` - Get recent matches (newest first)
- `getFavoriteTeams(limit?)` - Analyze most-viewed teams
- `clearHistory()` - Remove all history

**Storage:**
- localStorage key: `matchHistory`
- Max 20 items (FIFO removal)
- Graceful QuotaExceededError handling

### RecommendationService
**Path:** `recommendation.service.ts` (125 lines)

**Purpose:** Generate personalized match recommendations

**Scoring Algorithm (6 factors):**
1. **Live Matches** (+50 points) - Currently in progress
2. **Favorite Teams** (+30 points) - Based on view history
3. **Close Matches** (+10 points) - Score difference <20 runs
4. **Recent Matches** (+5 points) - Within last 7 days
5. **Popular Venues** (+3 points) - High-traffic stadiums
6. **League Priority** (+2 points) - Major tournaments

**Key Methods:**
- `getRecommendations(allMatches, limit)` - Score and rank matches
- Private scoring methods for each factor

### AnalyticsService
**Path:** `analytics.service.ts` (194 lines)

**Purpose:** Track user interactions for analytics platforms

**Event Types (7):**
1. `trackSearch(query, resultCount)` - Search queries
2. `trackAutocompleteSelection(matchId, title, position)` - Suggestion clicks
3. `trackFilterChange(type, value, resultCount)` - Filter applications
4. `trackRecommendationClick(matchId, title, position, reason?)` - Recommended clicks
5. `trackRecentlyViewedClick(matchId, title, position)` - History clicks
6. `trackMatchClick(matchId, title, source)` - All match clicks
7. `trackHistoryClear(itemCount)` - History clear action

**Features:**
- 1000-event buffer (FIFO cleanup)
- Google Analytics integration via gtag.js
- Console logging in development mode
- Event metadata preservation

### OfflineCacheService
**Path:** `offline-cache.service.ts` (283 lines)

**Purpose:** Cache data for offline access using IndexedDB

**Database Schema:**
- **searches** store - Search/filter results (cacheKey: query+filters)
- **matches** store - Individual match data (matchId)
- Indexes: timestamp for expiry checks

**Key Methods:**
- `cacheSearchResults(query, filters, results)` - Store search results
- `getCachedSearchResults(query, filters)` - Retrieve cached searches
- `cacheMatch(matchId, matchData)` - Store match details
- `getCachedMatch(matchId)` - Retrieve cached match

**Configuration:**
- 24-hour cache expiry
- Max 50 cached searches (oldest removed first)
- Automatic cleanup on cache full

### NetworkStatusService
**Path:** `network-status.service.ts` (133 lines)

**Purpose:** Monitor network connectivity and quality

**Key Observables:**
- `online$: Observable<boolean>` - Online/offline status
- `connectionQuality$: Observable<'good' | 'poor' | 'offline'>` - Connection quality

**Features:**
- Network Information API integration
- Metered connection detection (cellular, saveData)
- Active connection checks via favicon fetch
- Visibility change monitoring

### RateLimitService
**Path:** `rate-limit.service.ts` (212 lines)

**Purpose:** Prevent API overload with exponential backoff

**Configuration (default):**
- Max retries: 3
- Initial delay: 1000ms
- Max delay: 10000ms
- Backoff multiplier: 2x (1s → 2s → 4s)

**Key Methods:**
- `executeLimited(operation, config?)` - Wrap Promise with retry
- `throttleOperation(operation, key, minInterval)` - Prevent duplicates
- `shouldThrottle(key, maxConcurrent)` - Check concurrent operations
- `getOperationStatus(key)` - Get retry attempt count

---

## 🎨 UI Components & Styles

### Loading States
- **MatchSkeletonComponent**: Pulsing animation (1.5s ease-in-out)
- Shown during initial load, filtering, and search
- Compact variant for horizontal scrolls

### Empty States
- **EmptyStateComponent**: 4 types with SVG icons
- No results, no history, no recommendations, error
- Fade-in animation (300ms ease-out)

### Animations
- **fadeIn**: Match cards (opacity 0→1, translateY 10px→0)
- **slideDown**: Banners (offline, cached, error)
- **ripple**: Touch feedback on match cards
- **hover**: translateY(-2px) with enhanced shadow

### Accessibility
- **ARIA labels**: role="main", aria-labelledby, aria-live
- **Keyboard nav**: Tab, Enter, Space with visible focus indicators
- **WCAG AA**: 4.5:1 contrast ratio for all text
- **Screen reader**: Detailed match descriptions in aria-label

---

## 🚀 Getting Started

### Prerequisites
- Node.js 10.x or higher
- npm 6.x or higher
- Angular CLI 7.x

### Installation

```bash
# Navigate to frontend app
cd apps/frontend

# Install dependencies
npm install --legacy-peer-deps

# Serve development server
ng serve

# Navigate to http://localhost:4200/discovery
```

### Development

```bash
# Run unit tests
ng test

# Run E2E tests
ng e2e

# Build for production
ng build --prod

# Analyze bundle size
ng build --prod --stats-json
npm run webpack-bundle-analyzer dist/stats.json
```

---

## 🧪 Testing

### Unit Tests (Jasmine)
**Location:** `*.spec.ts` files (1,227 lines, 150+ tests)

**Coverage:**
- ✅ OfflineCacheService - Cache logic, expiry, IndexedDB
- ✅ NetworkStatusService - Online/offline, connection quality
- ✅ AnalyticsService - Event tracking, buffer management
- ✅ MatchHistoryService - localStorage, favorites, FIFO
- ✅ ContentDiscoveryComponent - Lifecycle, filters, search, offline

**Run Tests:**
```bash
ng test --code-coverage
```

### E2E Tests (Protractor)
**Location:** `e2e/src/content-discovery*.ts` (774 lines, 60+ tests)

**Critical Journeys:**
1. Search → Select Suggestion → View Match
2. Filter Matches → Click Match → View Details
3. View Match → Return → Recently Viewed → Click Again
4. Browse Recommendations → Click Match
5. View Multiple → Clear History

**Run Tests:**
```bash
ng e2e
```

---

## 📊 Performance Optimizations

### Virtual Scrolling
- **CDK Virtual Scroll**: Only renders visible items
- Viewport: 600px desktop, 500px mobile
- Item size: 140px per match card
- Handles 1000+ matches smoothly

### Lazy Loading
- **LazyLoadDirective**: Images load on intersection
- 200px buffer (loads before viewport)
- Blur filter while loading
- Fade-in animation on load
- Fallback for old browsers

### TrackBy Functions
- `trackByMatchId(index, match)` for *ngFor optimization
- Prevents unnecessary DOM re-renders
- Applied to all match lists

### Caching
- **30s cache** for match data
- **5min cache** for search suggestions
- **24h cache** for offline data
- In-memory + IndexedDB multi-tier

---

## 🔐 Security Considerations

### XSS Prevention
- Angular's built-in sanitization for user input
- No direct innerHTML usage
- Search queries escaped before display

### CSRF Protection
- CSRF tokens for mutations (future backend integration)
- Read-only operations don't modify state

### localStorage Security
- No sensitive data stored
- Only match IDs and view timestamps
- QuotaExceededError handling

### Rate Limiting
- Client-side throttling prevents abuse
- Exponential backoff for retries
- Max 3 retries per operation

---

## 📱 Browser Support

| Browser | Version | Notes |
|---------|---------|-------|
| Chrome | 60+ | Full support |
| Firefox | 55+ | Full support |
| Safari | 11+ | Full support |
| Edge | 79+ | Full support (Chromium) |
| IE | 11 | Partial (no IndexedDB, Network Info API) |

**Polyfills Included:**
- ES6 Promise
- Intersection Observer (lazy loading)
- IndexedDB (graceful degradation)

---

## 🚢 Deployment

### Build for Production

```bash
# Standard build
ng build --prod

# With service worker (offline support)
ng build --prod --service-worker

# Output: dist/frontend/
```

### Environment Configuration

**Production:**
- Enable service worker (ngsw-config.json)
- Configure Google Analytics tracking ID
- Set API base URL via environment.prod.ts

**Staging:**
- Disable analytics or use staging property
- Enable verbose logging for debugging

### CDN Considerations
- Static assets served via CDN
- Cache headers: 1 year for hashed files
- No cache for index.html

---

## 📈 Analytics Setup

### Google Analytics Integration

1. **Add gtag.js to index.html:**
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_TRACKING_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_TRACKING_ID');
</script>
```

2. **Events Tracked:**
- `content_discovery.search` - Search queries
- `content_discovery.autocomplete_select` - Autocomplete clicks
- `content_discovery.filter_change` - Filter applications
- `recommendations.recommendation_click` - Recommendation clicks
- `history.recently_viewed_click` - History clicks
- `content_discovery.match_click` - General match clicks
- `history.clear_history` - History clear

3. **Debug Mode:**
Set `localStorage.setItem('analytics_debug', 'true')` for console logging

---

## 🛠️ Troubleshooting

### Common Issues

**1. Search not working**
- Check network tab for API errors
- Verify debounce delay (300ms)
- Check rate limiting logs

**2. Offline cache not loading**
- IndexedDB may be disabled (private browsing)
- Check browser console for quota errors
- Verify 24-hour expiry hasn't passed

**3. Performance issues**
- Enable virtual scrolling (should be default)
- Check lazy loading is working (Network tab)
- Verify trackBy functions in templates

**4. Analytics not tracking**
- Verify gtag.js loaded (check Network tab)
- Check `isDevelopment()` method in AnalyticsService
- Enable debug mode: `localStorage.setItem('analytics_debug', 'true')`

---

## 🤝 Contributing

### Code Style
- Follow Angular Style Guide
- Use TypeScript strict mode
- 2-space indentation
- Max line length: 120 characters

### Pull Request Process
1. Create feature branch: `feature/content-discovery-xxx`
2. Write tests (maintain 70%+ coverage)
3. Update documentation
4. Pass linting: `ng lint`
5. Pass tests: `ng test && ng e2e`

---

## 📝 License

Copyright © 2024-2025 Crickzen. All rights reserved.

---

## 👥 Team

**Developed by:** Crickzen Development Team  
**Phase:** 6 - Content Discovery  
**Sprint:** November 2025  
**Status:** ✅ Production Ready

---

## 📚 Additional Resources

- [Angular Documentation](https://angular.io/docs)
- [RxJS Documentation](https://rxjs.dev/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Google Analytics for Web](https://developers.google.com/analytics/devguides/collection/gtagjs)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
