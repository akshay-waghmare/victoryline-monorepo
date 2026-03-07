# Research: Competitor-Informed UI Uplift

**Feature Branch**: `009-competitor-ui-uplift`  
**Created**: 2026-03-07

---

## Competitor Deep Dive

### 1. Crex.com — UI Architecture Analysis

**Homepage Layout (top → bottom)**:
```
┌─────────────────────────────────────────────────────┐
│  NAVBAR: Logo | Home | Series | Teams | Fixtures    │
│          | Stats Corner                             │
├─────────────────────────────────────────────────────┤
│  MATCH CAROUSEL (horizontal scroll):                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ T20 WC → │ │ T20 WC → │ │ INDW vs  │            │
│  │ 🇳🇿 NZ   │ │ 🇮🇳 IND   │ │ AUS →    │            │
│  │ 🇮🇳 IND   │ │ 🇬🇧 ENG   │ │ 🇮🇳 INDW  │            │
│  │ Tomorrow │ │ IND won  │ │ Day 2    │            │
│  │ 7:00 PM  │ │ by 7 runs│ │ Tea Break│            │
│  └──────────┘ └──────────┘ └──────────┘            │
├─────────────────────────────────────────────────────┤
│  TOP HEADLINES (news feed):                         │
│  ┌─────────────────────────────────────────────┐    │
│  │ [img] Title text...             3 min ago   │    │
│  │       Tags: NEW ZEALAND | T20 WC 2026       │    │
│  └─────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────┐    │
│  │ [img] Title text...            20 min ago   │    │
│  │       Tags: INDIA | NEW ZEALAND             │    │
│  └─────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────┤
│  FOOTER: About | Contact | Privacy | Terms          │
└─────────────────────────────────────────────────────┘
```

**Match Card Anatomy (Crex)**:
```
┌─────────────────────────────────────┐
│ T20 WC 2026 →         [series link] │  ← Series badge with arrow
├─────────────────────────────────────┤
│ 2nd Semi Final T20                  │  ← Match type
│ Wankhede Stadium, Mumbai            │  ← Venue
├─────────────────────────────────────┤
│ 🇮🇳 IND   253-7   20.0             │  ← Team flag + name + score
│ 🇬🇧 ENG   246-7   20.0             │
├─────────────────────────────────────┤
│ IND won by 7 runs                   │  ← Result
│ Player of the match: Sanju Samson   │  ← POTM
└─────────────────────────────────────┘
```

**Scorecard Page Sections (Crex)**:
1. Match header (team flags + scores + result ribbon)
2. Tab bar: Match Info | Live | Scorecard
3. Innings toggle (tabs or accordion)
4. BATTING table: Player name (with dismissal mode + expandable arrow), Runs, Balls, 4s, 6s, SR
5. Extras row: breakdown (b, lb, w, nb, p)
6. BOWLING table: Bowler, Overs, Maidens, Runs, Wickets, Economy
7. FALL OF WICKETS table: Batsman, Score-Wicket, Over
8. PARTNERSHIP section: Visual bars with Batter 1 runs (left) + total partnership + Batter 2 runs (right)
9. YET TO BAT: Player cards with avatar + name + batting average

**Series Page (Crex)**:
- Horizontal series flag carousel at top
- Month-grouped list below
- Each entry: Series name + date range, clickable
- Filter dropdowns: Format (All/T20/ODI/Test) + Series Type (All/International/Domestic)
- Pagination: Previous/Next

**Key Technical Observations**:
- Uses Akamaized CDN for team images: `cricketvectors.akamaized.net/Teams/{code}.png`
- Team codes: O (India), S (England), R (New Zealand), P (South Africa), etc.
- Match IDs are short alphanumeric: YAA, YAB, etc.
- Series IDs: 1UY (T20 WC 2026), 2EX (National T20 Cup), etc.

---

### 2. Cricbuzz.com — UI Architecture Analysis

**Homepage Layout (top → bottom)**:
```
┌─────────────────────────────────────────────────────┐
│  NAVBAR: Logo | Links | Search | Premium            │
├─────────────────────────────────────────────────────┤
│  MATCH TICKER STRIP (horizontal, persistent):       │
│  │ Only Test • INDW vs AUSW │ 2nd SF • T20 WC │ .. │
│  │ INDW 198  AUSW 217-4     │ IND 253-7        │    │
│  │ Day 2: Tea Break         │ ENG 246-7         │    │
│  │        [SCHEDULE]        │ India won by 7    │    │
│  │                          │ [FORECAST][TABLE] │    │
├─────────────────────────────────────────────────────┤
│  FEATURED VIDEOS:            │  TOP STORIES:         │
│  ┌──────────┐ ┌──────────┐  │  ┌──────────────────┐ │
│  │ [thumb]  │ │ [thumb]  │  │  │ T20 WC 2026     │ │
│  │ 6:08     │ │ 3:48     │  │  │ [hero img]      │ │
│  │ Title... │ │ Title... │  │  │ Headline...     │ │
│  └──────────┘ └──────────┘  │  │ Subtext...      │ │
│                              │  └──────────────────┘ │
├─────────────────────────────────────────────────────┤
│  MOBILE BOTTOM TAB BAR:                             │
│  Home | Matches | Series | Videos | News            │
└─────────────────────────────────────────────────────┘
```

**Match Ticker Card (Cricbuzz)**:
```
┌─────────────────────────────────────────┐
│ 2nd Semi-Final • ICC Men's T20 WC 2026 │  ← Context line
│ T20I                                    │  ← Format badge
│ 🇮🇳 IND  253-7 (20)                    │  ← Team with flag
│ 🇬🇧 ENG  246-7 (20)                    │
│ India won by 7 runs                     │
│ [FORECAST] [TABLE] [SCHEDULE]           │  ← Quick action links
└─────────────────────────────────────────┘
```

**Match Detail Page Tabs (Cricbuzz)** — most comprehensive in the industry:
| Tab | Content |
|-----|---------|
| Info | Series, Venue, Date/Time, Toss, Umpires |
| Live | Ball-by-ball commentary with over summary |
| Scorecard | Batting + Bowling tables per innings |
| Squads | Playing XI with role badges |
| Points Table | Series standings |
| Overs | Over-by-over summary grid |
| Highlights | Key moments |
| Full Commentary | Complete ball-by-ball text |
| News | Match-related articles |

**Ball-by-Ball Commentary Format (Cricbuzz)**:
```
Over Summary: 20: W 1 1 6 Wd 6 6 (22 runs) ENG 246-7

19.6  Shivam Dube to Jofra Archer, SIX, three sixes in the final over...
19.5  Shivam Dube to Jofra Archer, wide, too wide outside off...
19.4  Shivam Dube to Jofra Archer, SIX, misses the yorker...
19.3  Shivam Dube to Jamie Overton, 1 run, another good yorker...
```
- Over number (19.6) is strong/bold
- Event type in caps: SIX, wide, FOUR, OUT
- Descriptive text follows

**Navigation Menu (Cricbuzz)**:
Full hamburger/menu contains:
- My Account, Browse Series, Browse Team, Browse Player
- Schedule, Archives, Auction Tracker, Photos
- ICC Rankings (Men/Women), World Test Championship
- Records, News, Videos
- Quick links: T20 WC, Go ad-free, India Men/Women

---

### 3. Gap Analysis Matrix

| Feature | Crex | Cricbuzz | Crickzen | Gap Level |
|---------|------|----------|----------|-----------|
| Match ticker strip | ✅ | ✅ | ❌ | Critical |
| Team flags on cards | ✅ | ✅ | ❌ | Critical |
| Series-grouped matches | ✅ | ✅ | ❌ | Critical |
| Series listing page | ✅ | ✅ | ❌ | High |
| Countdown timers | ✅ | ❌ | ❌ | Medium |
| Player of the Match | ✅ | ✅ | ❌ | High |
| Partnerships (visual) | ✅ | ❌ | ❌ | High |
| Fall of wickets | ✅ | ✅ | ❌ | High |
| Yet to bat section | ✅ | ❌ | ❌ | Medium |
| Ball-by-ball commentary | ❌ | ✅ | ❌ | High |
| Over-by-over summary | ❌ | ✅ | ❌ | High |
| Match squads/XI | ❌ | ✅ | ❌ | Medium |
| Points table | ❌ | ✅ | ❌ | Medium |
| Stats leaderboard | ✅ | ✅ | ❌ | Medium |
| Mobile bottom tabs | ❌ | ✅ | ❌ | High |
| Dark/light theme | ❌ | ❌ | ✅ | ✅ Advantage |
| Score animations | ❌ | ❌ | ✅ | ✅ Advantage |
| Skeleton loading | ❌ | ❌ | ✅ | ✅ Advantage |
| WebSocket live updates | ❌ | ❌ | ✅ | ✅ Advantage |
| Single navbar (no sidebar) | ✅ | ✅ | ❌ | High |
| Featured videos | ❌ | ✅ | ❌ | Low (defer) |
| News feed with tags | ✅ | ✅ | ❌ | Medium (defer) |
| Fantasy integration | ✅ | ❌ | ❌ | Low (defer) |
| Premium subscription | ❌ | ✅ | ❌ | Low (defer) |
| Photos gallery | ❌ | ✅ | ❌ | Low (defer) |
| Archives | ❌ | ✅ | ❌ | Low (defer) |
| ICC Rankings | ❌ | ✅ | ❌ | Low (defer) |

**Crickzen Advantages Over Competitors**:
1. Dark/Light theme — neither Crex nor Cricbuzz offer theme switching
2. Real-time WebSocket score updates — competitors likely use polling
3. Skeleton loading states — smooth perceived performance
4. Score update animations — visual polish competitors lack
5. Modern design token system (in SCSS) — well-architected even if underutilized

---

### 4. Team Flag Implementation Research

**Options for team flag assets**:

| Option | Pros | Cons |
|--------|------|------|
| `circle-flags` npm package | SVG, tree-shakeable, 300+ flags, open source (MIT) | Only country flags, not team logos |
| `flag-icons` npm package | CSS-based, easy to use, comprehensive | Larger bundle, bitmap-based |
| Custom SVG sprite sheet | Full control, optimized bundle | Manual maintenance |
| CDN flags (like Crex uses) | No bundle impact | External dependency, CORS, latency |
| Team code → emoji flag | Zero bundle, universal | Not all platforms render well, no team logos |

**Recommendation**: Use `circle-flags` npm package for country flags (SVG, small, tree-shakeable). Map team codes to ISO 3166-1 alpha-2 country codes:

```typescript
const TEAM_FLAG_MAP: Record<string, string> = {
  'IND': 'in', 'AUS': 'au', 'ENG': 'gb', 'NZ': 'nz',
  'SA': 'za', 'PAK': 'pk', 'SL': 'lk', 'WI': 'wi', // WI needs custom
  'BAN': 'bd', 'ZIM': 'zw', 'AFG': 'af', 'IRE': 'ie',
  'SCO': 'gb-sct', 'NAM': 'na', 'UAE': 'ae', 'NEP': 'np',
  'OMA': 'om', 'PNG': 'pg', 'HK': 'hk', 'KUW': 'kw',
  // ... domestic teams use franchise logos (separate asset)
};
```

---

### 5. Angular Material 7 Constraints

The current codebase is on Angular Material 7. This constrains which Material components are available:

**Available** (can use today):
- `mat-tab-group` / `mat-tab` — for match detail tabs
- `mat-icon` — for bottom tab bar icons
- `mat-button` / `mat-icon-button` — for filter buttons
- `mat-card` — for leaderboard cards
- `mat-table` / `mat-sort` — for stats leaderboard
- `mat-chip` — for series badges
- `mat-tooltip` — for info tooltips
- `mat-menu` — for "More" dropdown

**Not available** (Angular Mat 7 limitations):
- `mat-tab-nav-bar` with routing — available but limited
- CDK virtual scrolling — limited in v7
- `mat-badge` — available but basic

**Custom implementations needed**:
- Bottom tab bar — custom component (Material 7 doesn't have a bottom nav)
- Match ticker — custom horizontal scroll component
- Partnership bars — custom SVG or CSS component
- Countdown timer — custom pipe/component with RxJS interval

---

### 6. Performance Considerations

**Current performance risks**:
- Bootstrap 4 CSS + Angular Material CSS + custom styles = large CSS bundle
- jQuery + Popper.js loaded for Bootstrap JS but unused in Angular context
- Multiple CDN render-blocking resources (Font Awesome, Google Fonts)
- 2,657-line cricket-odds CSS

**Recommendations**:
1. Inline critical CSS for match ticker and navbar
2. Lazy-load non-critical components (stats, series pages)
3. Use `trackBy` functions on all `*ngFor` directives in match lists
4. Virtual scroll for long series lists
5. Debounce ticker score updates (group updates within 500ms window)
6. Use `OnPush` change detection for pure display components (flags, badges, timers)
