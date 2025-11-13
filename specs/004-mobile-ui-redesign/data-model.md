# Data Model: Mobile-First UI/UX Redesign

**Feature**: 004-mobile-ui-redesign  
**Date**: 2025-11-13  
**Phase**: Phase 1 (Design & Contracts)

This document defines the data structures, component interfaces, and state models for mobile components.

---

## Component Data Models

### 1. MatchCard Component

**Purpose**: Display match information in mobile-optimized card format

**Props (Inputs)**:

```typescript
interface MatchCardProps {
  match: Match;                    // Match data
  layout?: 'compact' | 'expanded'; // Default: 'compact'
  showStatus?: boolean;            // Show LIVE/upcoming indicator, default: true
  clickable?: boolean;             // Enable tap to navigate, default: true
}

interface Match {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  status: 'live' | 'upcoming' | 'completed';
  format: 'T20' | 'ODI' | 'TEST';
  venue: string;
  startTime: string; // ISO 8601
  score?: {
    homeScore: string; // e.g., "185/7"
    awayScore: string;
    overs?: string; // e.g., "20.0"
  };
  result?: string; // For completed matches
}

interface Team {
  id: string;
  name: string;
  abbreviation: string; // 3-letter code for fallback
  logoUrl: string;
}
```

**Events (Outputs)**:

```typescript
@Output() cardClick = new EventEmitter<string>(); // Emits match ID
```

**State**:

```typescript
interface MatchCardState {
  isHovered: boolean;
  isPressed: boolean; // Touch feedback
  imageLoadError: boolean;
}
```

---

### 2. StickyHeader Component

**Purpose**: Fixed header showing score on match details page (mobile)

**Props**:

```typescript
interface StickyHeaderProps {
  homeTeam: Team;
  awayTeam: Team;
  currentScore: {
    homeScore: string;
    awayScore: string;
    overs?: string;
  };
  status: 'live' | 'completed' | 'upcoming';
  isSticky: boolean; // Controlled by scroll position
}
```

**State**:

```typescript
interface StickyHeaderState {
  isVisible: boolean; // Based on scroll threshold
  isAnimating: boolean; // Slide-in animation state
}
```

---

### 3. ConnectionStatus Component

**Purpose**: Display WebSocket connection status indicator

**Props**:

```typescript
interface ConnectionStatusProps {
  status: 'connected' | 'reconnecting' | 'disconnected';
  retryCount?: number;
  position?: 'top' | 'bottom'; // Default: 'bottom'
}
```

**State**:

```typescript
interface ConnectionStatusState {
  isVisible: boolean;
  message: string;
  severity: 'info' | 'warning' | 'error';
}
```

---

### 4. LazyImage Component

**Purpose**: Lazy-loaded responsive images with fallback

**Props**:

```typescript
interface LazyImageProps {
  src: string;
  srcset?: string; // e.g., "logo-1x.png 1x, logo-2x.png 2x"
  alt: string;
  fallbackText?: string; // Team abbreviation for text fallback
  aspectRatio?: string; // e.g., "1/1", "16/9"
  loading?: 'lazy' | 'eager'; // Default: 'lazy'
}
```

**State**:

```typescript
interface LazyImageState {
  isLoaded: boolean;
  hasError: boolean;
  isIntersecting: boolean; // For custom lazy load (if needed)
}
```

---

### 5. TouchFeedback Directive

**Purpose**: Provide ripple/highlight effect on tap

**Props**:

```typescript
interface TouchFeedbackProps {
  color?: string; // Ripple color, default: 'rgba(0,0,0,0.1)'
  duration?: number; // ms, default: 300
  disabled?: boolean;
}
```

**State** (internal):

```typescript
interface RippleState {
  x: number; // Touch point X
  y: number; // Touch point Y
  isAnimating: boolean;
}
```

---

### 6. SwipeGesture Directive

**Purpose**: Handle swipe left/right for tab navigation

**Props**:

```typescript
interface SwipeGestureProps {
  threshold?: number; // px, default: 30
  velocity?: number; // default: 0.3
  direction?: 'horizontal' | 'vertical' | 'both'; // default: 'horizontal'
}
```

**Events**:

```typescript
@Output() swipeLeft = new EventEmitter<void>();
@Output() swipeRight = new EventEmitter<void>();
@Output() swipeUp = new EventEmitter<void>();
@Output() swipeDown = new EventEmitter<void>();
```

---

### 7. PullToRefresh Directive

**Purpose**: Pull-down gesture to refresh match data

**Props**:

```typescript
interface PullToRefreshProps {
  threshold?: number; // px, default: 80
  disabled?: boolean;
  refreshing?: boolean; // External loading state
}
```

**Events**:

```typescript
@Output() refresh = new EventEmitter<void>();
```

**State**:

```typescript
interface PullToRefreshState {
  pullDistance: number; // How far user has pulled
  isRefreshing: boolean;
  canRelease: boolean; // Pulled past threshold
}
```

---

### 8. SkeletonCard Component (Existing, Enhanced)

**Purpose**: Loading placeholder for match cards

**Props**:

```typescript
interface SkeletonCardProps {
  count?: number; // Number of skeletons, default: 1
  layout?: 'compact' | 'expanded'; // Match MatchCard layouts
  animate?: boolean; // Shimmer animation, default: true
}
```

---

### 9. ViewportService

**Purpose**: Detect viewport size and provide responsive utilities

**Methods**:

```typescript
interface ViewportService {
  isMobile$: Observable<boolean>; // <768px
  isTablet$: Observable<boolean>; // 768-1023px
  isDesktop$: Observable<boolean>; // ≥1024px
  currentBreakpoint$: Observable<'mobile-sm' | 'mobile-md' | 'mobile-lg' | 'tablet' | 'desktop'>;
  
  isMobile(): boolean; // Synchronous check
  getViewportWidth(): number;
  getViewportHeight(): number;
}
```

**Implementation Notes**:

- Uses `BreakpointObserver` from Angular CDK
- Debounces resize events (300ms)
- Caches current breakpoint to avoid unnecessary recalculations

---

### 10. WebSocketConnectionService (Enhanced)

**Purpose**: Monitor WebSocket connection and expose status

**Existing Methods** (assumed):
```typescript
interface WebSocketService {
  connect(): void;
  disconnect(): void;
  send(message: any): void;
  onMessage$: Observable<any>;
}
```

**New Methods** (to be added):

```typescript
interface WebSocketConnectionService extends WebSocketService {
  connectionStatus$: Observable<'connected' | 'reconnecting' | 'disconnected'>;
  retryCount$: Observable<number>;
  lastConnectedTime$: Observable<Date | null>;
  
  forceReconnect(): void;
}
```

---

## Page-Level State Models

### Home Page State

```typescript
interface HomePageState {
  matches: Match[];
  filteredMatches: Match[];
  activeFilter: 'all' | 'live' | 'upcoming' | 'completed';
  isLoading: boolean;
  error: string | null;
  webSocketConnected: boolean;
}
```

### Match Details Page State

```typescript
interface MatchDetailsPageState {
  match: Match | null;
  activeTab: 'scorecard' | 'commentary' | 'stats' | 'info';
  scorecardData: ScorecardData | null;
  commentaryData: CommentaryData | null;
  statsData: StatsData | null;
  isLoading: boolean;
  error: string | null;
  webSocketConnected: boolean;
  stickyHeaderVisible: boolean; // Scroll-based
}

interface ScorecardData {
  innings: Innings[];
}

interface Innings {
  battingTeam: Team;
  bowlingTeam: Team;
  batsmen: Batsman[];
  bowlers: Bowler[];
  extras: number;
  total: string; // e.g., "185/7"
  overs: string;
}

interface Batsman {
  id: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isOut: boolean;
  dismissal?: string; // e.g., "c Smith b Anderson"
}

interface Bowler {
  id: string;
  name: string;
  overs: string; // e.g., "4.0"
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
}

interface CommentaryData {
  balls: BallCommentary[];
}

interface BallCommentary {
  over: number;
  ballNumber: number;
  runs: number;
  bowler: string;
  batsman: string;
  commentary: string;
  timestamp: string;
  isWicket: boolean;
  isBoundary: boolean;
}

interface StatsData {
  partnerships: Partnership[];
  fallOfWickets: FallOfWicket[];
  runRate: {
    current: number;
    required?: number; // For chases
  };
}

interface Partnership {
  batsman1: string;
  batsman2: string;
  runs: number;
  balls: number;
}

interface FallOfWicket {
  wicketNumber: number;
  runs: number;
  over: string;
  batsman: string;
}
```

---

## Validation Rules

### Match Card Validation

- `match.id`: Required, non-empty string
- `match.homeTeam`, `match.awayTeam`: Required, must have `id`, `name`, `abbreviation`, `logoUrl`
- `match.status`: Required, must be one of `'live' | 'upcoming' | 'completed'`
- `match.startTime`: Required, valid ISO 8601 date string
- `match.score`: Optional, but if present, must have `homeScore` and `awayScore`

### Image Validation

- `src`: Required, valid URL or relative path
- `alt`: Required, non-empty string (accessibility)
- `srcset`: Optional, but if present, must follow `"url descriptor, url descriptor"` format

### Gesture Validation

- `threshold`: Optional, but if present, must be positive number
- `velocity`: Optional, but if present, must be between 0 and 1

---

## State Transitions

### Match Status Lifecycle

```
upcoming → live → completed
```

- **upcoming**: Match hasn't started, show countdown timer
- **live**: Match in progress, enable WebSocket updates, show LIVE badge
- **completed**: Match finished, show result, disable WebSocket

### Connection Status Lifecycle

```
disconnected → reconnecting → connected
```

- **disconnected**: WebSocket closed, show error snackbar, attempt reconnect
- **reconnecting**: Reconnecting in progress, show progress indicator
- **connected**: WebSocket active, dismiss snackbar, enable live updates

### Pull-to-Refresh Lifecycle

```
idle → pulling → threshold_reached → refreshing → idle
```

- **idle**: No user interaction
- **pulling**: User dragging down, show pull indicator
- **threshold_reached**: Pulled past threshold (80px), release to refresh
- **refreshing**: Fetch new data, show spinner
- **idle**: Refresh complete, reset state

---

## Component Relationships

```
HomePageComponent
├── MatchCardComponent (multiple)
│   ├── LazyImageComponent (team logos)
│   ├── TouchFeedbackDirective (ripple on tap)
│   └── ConnectionStatusComponent (if WebSocket disconnected)
├── PullToRefreshDirective (entire page)
└── SkeletonCardComponent (loading state)

MatchDetailsPageComponent
├── StickyHeaderComponent (scroll-based)
│   └── LazyImageComponent (team logos)
├── TabNavComponent (existing, enhanced with SwipeGestureDirective)
├── ScorecardTabComponent
│   └── LazyImageComponent (player photos)
├── CommentaryTabComponent
├── StatsTabComponent
├── ConnectionStatusComponent
└── SkeletonCardComponent (loading state)
```

---

## API Data Contracts (Existing, No Changes)

This feature does not introduce new API endpoints. It consumes existing backend APIs with the following assumed structure:

### GET /api/v1/matches (Home Page)

**Response**:

```json
{
  "success": true,
  "data": {
    "matches": [
      {
        "id": "match-123",
        "homeTeam": {
          "id": "team-1",
          "name": "India",
          "abbreviation": "IND",
          "logoUrl": "/assets/team-logos/india.png"
        },
        "awayTeam": {
          "id": "team-2",
          "name": "Australia",
          "abbreviation": "AUS",
          "logoUrl": "/assets/team-logos/australia.png"
        },
        "status": "live",
        "format": "T20",
        "venue": "Melbourne Cricket Ground",
        "startTime": "2025-11-13T10:00:00Z",
        "score": {
          "homeScore": "185/7",
          "awayScore": "120/4",
          "overs": "15.3"
        }
      }
    ]
  },
  "error": null,
  "timestamp": "2025-11-13T12:00:00Z"
}
```

### GET /api/v1/matches/{id} (Match Details)

**Response**: Similar to above, with additional `scorecardData`, `commentaryData`, `statsData` fields

### WebSocket: /ws/match/{id} (Live Updates)

**Message Format**:

```json
{
  "type": "score_update",
  "matchId": "match-123",
  "data": {
    "homeScore": "186/7",
    "overs": "15.4",
    "lastBall": {
      "runs": 1,
      "bowler": "Starc",
      "batsman": "Kohli",
      "commentary": "Short of length, pulled to deep mid-wicket for a single"
    }
  },
  "timestamp": "2025-11-13T12:00:15Z"
}
```

---

## Persistence & Caching

**LocalStorage** (optional enhancements, future scope):
- Theme preference: `victoryline_theme` ('light' | 'dark')
- Filter preference: `victoryline_match_filter` ('all' | 'live' | 'upcoming' | 'completed')

**In-Memory State**:
- Current matches list (RxJS BehaviorSubject)
- Active filter (RxJS BehaviorSubject)
- WebSocket connection status (RxJS BehaviorSubject)

**No Backend Persistence**: This feature is frontend-only, no new backend storage required.

---

## Data Flow Diagrams

### Home Page Data Flow

```
User Opens Home Page
        ↓
   HTTP GET /api/v1/matches
        ↓
   Display SkeletonCards (loading)
        ↓
   API Response Received
        ↓
   Render MatchCards
        ↓
   User Taps Match Card
        ↓
   Navigate to /match/{id}
```

### Match Details Live Update Flow

```
User Opens Match Details
        ↓
   HTTP GET /api/v1/matches/{id}
        ↓
   Display Loading State
        ↓
   API Response → Render Initial State
        ↓
   WebSocket Connect (if status === 'live')
        ↓
   Receive Score Update Message
        ↓
   Update StickyHeader + Commentary
        ↓
   (Loop: Listen for more updates)
```

### WebSocket Reconnection Flow

```
WebSocket Connection Lost
        ↓
   ConnectionStatusService detects disconnection
        ↓
   Emit 'disconnected' status
        ↓
   ConnectionStatusComponent shows snackbar
        ↓
   Attempt Reconnect (exponential backoff)
        ↓
   Emit 'reconnecting' status
        ↓
   Connection Established
        ↓
   Emit 'connected' status
        ↓
   ConnectionStatusComponent dismisses snackbar
```

---

## Conclusion

All component data models, state transitions, and API contracts are now defined. Proceed to **Phase 1 Contracts** to document component APIs in detail, then generate **quickstart.md** for developer setup.