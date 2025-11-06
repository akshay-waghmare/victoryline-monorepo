# Component Contract: Match Card

**Component Name**: `MatchCardComponent`  
**Selector**: `app-match-card`  
**Purpose**: Display match information with live updates and animations  
**Created**: 2025-11-06

---

## Component Interface

### Inputs

```typescript
/**
 * Match data to display
 * @required
 */
@Input() match!: MatchCardViewModel;

/**
 * Enable animations (default: true)
 * @optional
 */
@Input() enableAnimations: boolean = true;

/**
 * Card layout variant
 * @optional
 * @default 'default'
 */
@Input() variant: 'default' | 'compact' | 'detailed' = 'default';

/**
 * Show match details button
 * @optional
 * @default true
 */
@Input() showDetailsButton: boolean = true;

/**
 * Maximum height for card (for scrollable containers)
 * @optional
 */
@Input() maxHeight?: string;
```

### Outputs

```typescript
/**
 * Emitted when user clicks the card
 */
@Output() cardClick = new EventEmitter<string>(); // Emits match ID

/**
 * Emitted when user clicks "View Details" button
 */
@Output() detailsClick = new EventEmitter<string>(); // Emits match ID

/**
 * Emitted when score updates (for analytics)
 */
@Output() scoreUpdated = new EventEmitter<ScoreUpdateEvent>();

/**
 * Emitted when card enters/leaves viewport (for lazy loading)
 */
@Output() visibilityChange = new EventEmitter<boolean>(); // true = visible
```

### Event Interfaces

```typescript
/**
 * Score update event data
 */
export interface ScoreUpdateEvent {
  matchId: string;
  team: 'team1' | 'team2';
  previousScore: ScoreInfo | null;
  newScore: ScoreInfo;
  timestamp: Date;
}
```

---

## Public Methods

```typescript
/**
 * Manually trigger score update animation
 * @param team Which team's score to animate
 */
public triggerScoreAnimation(team: 'team1' | 'team2'): void;

/**
 * Refresh card data (useful for polling)
 */
public refresh(): void;

/**
 * Highlight card temporarily (e.g., for search results)
 * @param duration Duration in milliseconds (default: 2000)
 */
public highlight(duration?: number): void;

/**
 * Check if card is currently in viewport
 * @returns true if visible
 */
public isVisible(): boolean;
```

---

## Component State

```typescript
/**
 * Internal component state (not exposed via API)
 */
interface MatchCardState {
  // Hover state
  isHovered: boolean;
  
  // Animation state
  isAnimating: boolean;
  animationQueue: ScoreUpdateAnimation[];
  
  // Visibility state
  isInViewport: boolean;
  intersectionObserver: IntersectionObserver | null;
  
  // Previous data (for change detection)
  previousMatch: MatchCardViewModel | null;
}
```

---

## Template Structure

```html
<div class="match-card"
     [attr.data-status]="match.status"
     [attr.data-variant]="variant"
     [class.is-live]="match.isLive"
     [class.is-hovered]="isHovered"
     [style.max-height]="maxHeight"
     (click)="onCardClick()"
     (mouseenter)="onMouseEnter()"
     (mouseleave)="onMouseLeave()">
  
  <!-- Status Badge -->
  <div class="match-card__status-badge"
       [style.background-color]="match.statusColor">
    {{ match.displayStatus }}
  </div>
  
  <!-- Team 1 -->
  <div class="match-card__team" #team1Container>
    <img [src]="match.team1.logoUrl" 
         [alt]="match.team1.name"
         class="match-card__team-logo">
    <div class="match-card__team-info">
      <h3 class="match-card__team-name">{{ match.team1.name }}</h3>
      <p class="match-card__team-short">{{ match.team1.shortName }}</p>
    </div>
    <div class="match-card__score" 
         [@scoreUpdate]="scoreAnimationState"
         *ngIf="match.team1.score">
      {{ match.team1.score.displayText }}
    </div>
  </div>
  
  <!-- VS Separator -->
  <div class="match-card__separator">VS</div>
  
  <!-- Team 2 -->
  <div class="match-card__team" #team2Container>
    <!-- Similar structure to Team 1 -->
  </div>
  
  <!-- Match Info -->
  <div class="match-card__info">
    <span class="match-card__venue">
      <mat-icon>location_on</mat-icon>
      {{ match.venue }}
    </span>
    <span class="match-card__time">
      <mat-icon>schedule</mat-icon>
      {{ match.timeDisplay }}
    </span>
  </div>
  
  <!-- Details Button -->
  <button mat-raised-button
          color="primary"
          class="match-card__details-btn"
          *ngIf="showDetailsButton"
          (click)="onDetailsClick($event)">
    View Details
    <mat-icon>chevron_right</mat-icon>
  </button>
  
  <!-- Live Indicator (pulsing dot) -->
  <div class="match-card__live-indicator" 
       *ngIf="match.isLive"
       [@pulse]="'active'">
  </div>
  
  <!-- Staleness Warning -->
  <div class="match-card__staleness-warning"
       *ngIf="match.staleness === 'warning' || match.staleness === 'error'"
       [attr.data-level]="match.staleness">
    <mat-icon>warning</mat-icon>
    <span>Data may be outdated</span>
  </div>
</div>
```

---

## Styling Contract

### CSS Custom Properties (Theme Integration)

```scss
.match-card {
  // Colors
  --match-card-bg: var(--color-background-elevated);
  --match-card-border: var(--color-border);
  --match-card-text-primary: var(--color-text-primary);
  --match-card-text-secondary: var(--color-text-secondary);
  --match-card-hover-bg: var(--color-background-hover);
  
  // Spacing
  --match-card-padding: var(--spacing-md);
  --match-card-gap: var(--spacing-sm);
  
  // Borders
  --match-card-radius: var(--border-radius-lg);
  --match-card-border-width: 1px;
  
  // Shadows
  --match-card-shadow: var(--shadow-md);
  --match-card-shadow-hover: var(--shadow-lg);
  
  // Transitions
  --match-card-transition-duration: 200ms;
  --match-card-transition-easing: ease-in-out;
}
```

### State Classes

```scss
// Hover state
.match-card.is-hovered {
  transform: translateY(-4px);
  box-shadow: var(--match-card-shadow-hover);
}

// Live state
.match-card.is-live {
  border-color: var(--color-match-live);
}

// Compact variant
.match-card[data-variant="compact"] {
  --match-card-padding: var(--spacing-sm);
  --match-card-gap: var(--spacing-xs);
}

// Staleness warnings
.match-card__staleness-warning[data-level="warning"] {
  background-color: var(--color-warning);
}

.match-card__staleness-warning[data-level="error"] {
  background-color: var(--color-error);
}
```

---

## Animation Definitions

```typescript
/**
 * Score update animation
 */
trigger('scoreUpdate', [
  transition('* => updated', [
    style({ transform: 'scale(1.0)', color: 'inherit' }),
    animate('300ms ease-out', style({ 
      transform: 'scale(1.15)', 
      color: 'var(--color-primary)' 
    })),
    animate('200ms ease-in', style({ 
      transform: 'scale(1.0)', 
      color: 'inherit' 
    }))
  ])
]);

/**
 * Live indicator pulse animation
 */
trigger('pulse', [
  state('active', style({ opacity: 1 })),
  transition('* => active', [
    animate('1500ms ease-in-out', keyframes([
      style({ opacity: 1, offset: 0 }),
      style({ opacity: 0.5, offset: 0.5 }),
      style({ opacity: 1, offset: 1 })
    ]))
  ])
]);
```

---

## Lifecycle Behavior

### OnInit
1. Set up IntersectionObserver for visibility tracking
2. Store initial match data in `previousMatch`
3. Check if animations should be enabled based on user preferences
4. Subscribe to theme changes if needed

### OnChanges
1. Detect changes in `match` input
2. If score changed, trigger score update animation (if enabled and live)
3. Update `previousMatch` reference
4. Emit `scoreUpdated` event if applicable

### OnDestroy
1. Disconnect IntersectionObserver
2. Unsubscribe from all subscriptions
3. Clear animation queue

---

## Performance Characteristics

### Change Detection
- Strategy: `OnPush` (requires manual change detection triggers)
- Input changes detected via `ngOnChanges`
- Internal state changes trigger `ChangeDetectorRef.markForCheck()`

### DOM Interactions
- Uses `ViewChild` to access team containers for animations
- Intersection Observer used for lazy loading
- Event delegation for click handling (single listener on card)

### Memory Management
- Animation queue limited to 5 pending animations
- Old animations cancelled when new ones arrive
- IntersectionObserver properly disconnected on destroy

---

## Accessibility Requirements

### Keyboard Navigation
- Card is focusable (`tabindex="0"`)
- Supports Enter/Space to trigger click
- Focus visible with outline

### Screen Reader Support
- Card has `role="article"`
- Status badge has `aria-live="polite"` for live matches
- Team names and scores have proper semantic HTML
- Details button has descriptive `aria-label`

### ARIA Attributes
```html
<div class="match-card"
     role="article"
     [attr.aria-label]="getMatchAriaLabel()"
     tabindex="0">
  
  <div class="match-card__status-badge"
       [attr.aria-live]="match.isLive ? 'polite' : 'off'">
    {{ match.displayStatus }}
  </div>
  
  <button [attr.aria-label]="'View details for ' + match.team1.name + ' vs ' + match.team2.name">
    View Details
  </button>
</div>
```

### Helper Method
```typescript
private getMatchAriaLabel(): string {
  const team1 = this.match.team1.name;
  const team2 = this.match.team2.name;
  const status = this.match.displayStatus;
  const time = this.match.timeDisplay;
  
  return `${team1} vs ${team2}, ${status}, ${time}`;
}
```

---

## Testing Contract

### Unit Tests Required
1. **Input validation**
   - Required inputs throw error if missing
   - Optional inputs use default values
   
2. **Event emissions**
   - `cardClick` emits on card click
   - `detailsClick` emits on button click
   - `scoreUpdated` emits when score changes
   
3. **Animation triggers**
   - Score animation triggered when score changes (live matches only)
   - Animation disabled when `enableAnimations` is false
   - Animation respects `prefers-reduced-motion`
   
4. **Accessibility**
   - Card has correct ARIA attributes
   - Keyboard navigation works
   - Focus management correct

### Integration Tests Required
1. **With ThemeService**
   - Card updates when theme changes
   - Colors match theme configuration
   
2. **With AnimationService**
   - Animations coordinated with service
   - Performance monitoring works
   
3. **With MatchService**
   - Real-time updates reflected in UI
   - Staleness warnings appear correctly

---

## Dependencies

### Required Services
- `ThemeService`: Get current theme colors
- `AnimationService`: Coordinate animations, check performance
- `ChangeDetectorRef`: Trigger change detection with OnPush strategy

### Optional Services
- `AnalyticsService`: Track user interactions

### Required Libraries
- `@angular/material`: UI components (button, icon)
- `@angular/animations`: Animation framework

---

## Usage Examples

### Basic Usage
```html
<app-match-card 
  [match]="matchData"
  (cardClick)="navigateToMatch($event)"
  (detailsClick)="openMatchDetails($event)">
</app-match-card>
```

### Compact Variant (for lists)
```html
<app-match-card 
  [match]="matchData"
  [variant]="'compact'"
  [showDetailsButton]="false">
</app-match-card>
```

### Disabled Animations (for performance)
```html
<app-match-card 
  [match]="matchData"
  [enableAnimations]="false">
</app-match-card>
```

### With Max Height (scrollable container)
```html
<div class="match-list">
  <app-match-card 
    *ngFor="let match of matches"
    [match]="match"
    [maxHeight]="'200px'">
  </app-match-card>
</div>
```

---

## Version History

- **v1.0.0** (2025-11-06): Initial contract definition
