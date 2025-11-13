# Component API Contracts

**Feature**: 004-mobile-ui-redesign  
**Date**: 2025-11-13  
**Phase**: Phase 1 (Design & Contracts)

This document provides complete API contracts for all mobile components, including TypeScript interfaces, usage examples, and integration patterns.

---

## 1. MatchCardComponent

### API Contract

```typescript
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-match-card',
  templateUrl: './match-card.component.html',
  styleUrls: ['./match-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MatchCardComponent {
  /**
   * Match data to display
   * @required
   */
  @Input() match!: Match;
  
  /**
   * Card layout variant
   * @default 'compact'
   */
  @Input() layout: 'compact' | 'expanded' = 'compact';
  
  /**
   * Show LIVE/upcoming status indicator
   * @default true
   */
  @Input() showStatus: boolean = true;
  
  /**
   * Enable card click interaction
   * @default true
   */
  @Input() clickable: boolean = true;
  
  /**
   * Emits match ID when card is clicked
   */
  @Output() cardClick = new EventEmitter<string>();
  
  onCardClick(): void {
    if (this.clickable) {
      this.cardClick.emit(this.match.id);
    }
  }
}
```

### Usage Example

```html
<!-- Home Page -->
<div class="matches-list">
  <app-match-card 
    *ngFor="let match of matches"
    [match]="match"
    [layout]="'compact'"
    [showStatus]="true"
    (cardClick)="navigateToMatch($event)"
    matRipple>
  </app-match-card>
</div>
```

```typescript
// home.component.ts
navigateToMatch(matchId: string): void {
  this.router.navigate(['/match', matchId]);
}
```

### Accessibility

- **ARIA**: `role="button"`, `aria-label="View details for {homeTeam} vs {awayTeam}"`
- **Keyboard**: `tabindex="0"`, Enter/Space trigger click
- **Screen Reader**: Announces match status, team names, score
- **Touch Target**: Minimum 44x44px (enforced via CSS)

---

## 2. StickyHeaderComponent

### API Contract

```typescript
@Component({
  selector: 'app-sticky-header',
  templateUrl: './sticky-header.component.html',
  styleUrls: ['./sticky-header.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StickyHeaderComponent implements OnInit, OnDestroy {
  @Input() homeTeam!: Team;
  @Input() awayTeam!: Team;
  @Input() currentScore!: { homeScore: string; awayScore: string; overs?: string };
  @Input() status!: 'live' | 'completed' | 'upcoming';
  
  /**
   * Scroll threshold (px) before header becomes sticky
   * @default 200
   */
  @Input() scrollThreshold: number = 200;
  
  isSticky: boolean = false;
  
  @HostListener('window:scroll', ['$event'])
  onScroll(): void {
    this.isSticky = window.pageYOffset > this.scrollThreshold;
  }
}
```

### Usage Example

```html
<!-- Match Details Page -->
<app-sticky-header
  [homeTeam]="match.homeTeam"
  [awayTeam]="match.awayTeam"
  [currentScore]="match.score"
  [status]="match.status"
  [scrollThreshold]="150">
</app-sticky-header>

<div class="match-content">
  <!-- Tabs, scorecard, commentary -->
</div>
```

### CSS (Mobile-First)

```css
.sticky-header {
  position: relative;
  top: 0;
  left: 0;
  width: 100%;
  background-color: var(--primary-color);
  color: var(--secondary-color);
  padding: var(--spacing-sm);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  z-index: 100;
}

.sticky-header.is-sticky {
  position: fixed;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(0);
}

.sticky-header:not(.is-sticky) {
  transform: translateY(-100%);
}
```

---

## 3. ConnectionStatusComponent

### API Contract

```typescript
@Component({
  selector: 'app-connection-status',
  template: `
    <div *ngIf="isVisible" 
         [class]="'connection-status ' + severity"
         role="alert"
         [attr.aria-live]="severity === 'error' ? 'assertive' : 'polite'">
      <mat-icon>{{ icon }}</mat-icon>
      <span>{{ message }}</span>
      <button *ngIf="status === 'disconnected'" 
              (click)="onRetry()" 
              mat-button>
        Retry
      </button>
    </div>
  `,
  styleUrls: ['./connection-status.component.css']
})
export class ConnectionStatusComponent implements OnInit, OnDestroy {
  @Input() status: 'connected' | 'reconnecting' | 'disconnected' = 'connected';
  @Input() retryCount: number = 0;
  @Input() position: 'top' | 'bottom' = 'bottom';
  
  @Output() retry = new EventEmitter<void>();
  
  get isVisible(): boolean {
    return this.status !== 'connected';
  }
  
  get severity(): 'info' | 'warning' | 'error' {
    switch (this.status) {
      case 'reconnecting': return 'warning';
      case 'disconnected': return 'error';
      default: return 'info';
    }
  }
  
  get message(): string {
    switch (this.status) {
      case 'reconnecting': return `Reconnecting... (Attempt ${this.retryCount})`;
      case 'disconnected': return 'Connection lost';
      default: return '';
    }
  }
  
  get icon(): string {
    switch (this.status) {
      case 'reconnecting': return 'sync';
      case 'disconnected': return 'wifi_off';
      default: return 'wifi';
    }
  }
  
  onRetry(): void {
    this.retry.emit();
  }
}
```

### Usage Example

```html
<!-- App Root or Match Details Page -->
<app-connection-status
  [status]="webSocketStatus$ | async"
  [retryCount]="retryCount$ | async"
  [position]="'bottom'"
  (retry)="forceReconnect()">
</app-connection-status>
```

```typescript
// app.component.ts or match-details.component.ts
export class AppComponent {
  webSocketStatus$ = this.connectionService.connectionStatus$;
  retryCount$ = this.connectionService.retryCount$;
  
  constructor(private connectionService: WebSocketConnectionService) {}
  
  forceReconnect(): void {
    this.connectionService.forceReconnect();
  }
}
```

---

## 4. LazyImageComponent

### API Contract

```typescript
@Component({
  selector: 'app-lazy-image',
  template: `
    <img 
      *ngIf="!error"
      [src]="src" 
      [srcset]="srcset"
      [alt]="alt"
      [loading]="loading"
      [style.aspect-ratio]="aspectRatio"
      (error)="onImageError()"
      [class]="imageClass"
    />
    <div *ngIf="error" class="image-placeholder" [style.aspect-ratio]="aspectRatio">
      <span class="fallback-text">{{ fallbackText }}</span>
    </div>
  `,
  styleUrls: ['./lazy-image.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LazyImageComponent {
  @Input() src!: string;
  @Input() srcset?: string;
  @Input() alt!: string;
  @Input() fallbackText: string = '?';
  @Input() aspectRatio?: string; // e.g., "1/1", "16/9"
  @Input() loading: 'lazy' | 'eager' = 'lazy';
  @Input() imageClass: string = '';
  
  error = false;
  
  onImageError(): void {
    this.error = true;
  }
}
```

### Usage Example

```html
<!-- Team Logo in Match Card -->
<app-lazy-image
  [src]="'assets/team-logos/' + team.id + '.png'"
  [srcset]="getTeamLogoSrcset(team.id)"
  [alt]="team.name + ' logo'"
  [fallbackText]="team.abbreviation"
  [aspectRatio]="'1/1'"
  imageClass="team-logo">
</app-lazy-image>
```

```typescript
getTeamLogoSrcset(teamId: string): string {
  return `
    assets/team-logos/${teamId}-1x.webp 1x,
    assets/team-logos/${teamId}-2x.webp 2x,
    assets/team-logos/${teamId}-3x.webp 3x
  `;
}
```

---

## 5. SwipeGestureDirective

### API Contract

```typescript
@Directive({
  selector: '[appSwipeGesture]'
})
export class SwipeGestureDirective implements OnInit, OnDestroy {
  @Input() swipeThreshold: number = 30; // px
  @Input() swipeVelocity: number = 0.3;
  @Input() swipeDirection: 'horizontal' | 'vertical' | 'both' = 'horizontal';
  
  @Output() swipeLeft = new EventEmitter<void>();
  @Output() swipeRight = new EventEmitter<void>();
  @Output() swipeUp = new EventEmitter<void>();
  @Output() swipeDown = new EventEmitter<void>();
  
  private hammer!: HammerManager;
  
  constructor(private el: ElementRef) {}
  
  ngOnInit(): void {
    this.initializeHammer();
  }
  
  private initializeHammer(): void {
    const direction = this.getHammerDirection();
    
    this.hammer = new Hammer(this.el.nativeElement, {
      recognizers: [
        [Hammer.Swipe, { direction, threshold: this.swipeThreshold, velocity: this.swipeVelocity }]
      ]
    });
    
    this.hammer.on('swipeleft', () => this.swipeLeft.emit());
    this.hammer.on('swiperight', () => this.swipeRight.emit());
    this.hammer.on('swipeup', () => this.swipeUp.emit());
    this.hammer.on('swipedown', () => this.swipeDown.emit());
  }
  
  private getHammerDirection(): number {
    switch (this.swipeDirection) {
      case 'horizontal': return Hammer.DIRECTION_HORIZONTAL;
      case 'vertical': return Hammer.DIRECTION_VERTICAL;
      case 'both': return Hammer.DIRECTION_ALL;
    }
  }
  
  ngOnDestroy(): void {
    this.hammer?.destroy();
  }
}
```

### Usage Example

```html
<!-- Match Details Tabs -->
<div class="tabs-container"
     appSwipeGesture
     [swipeThreshold]="40"
     (swipeLeft)="nextTab()"
     (swipeRight)="prevTab()">
  
  <mat-tab-group [(selectedIndex)]="activeTabIndex">
    <mat-tab label="Scorecard">...</mat-tab>
    <mat-tab label="Commentary">...</mat-tab>
    <mat-tab label="Stats">...</mat-tab>
  </mat-tab-group>
</div>
```

```typescript
// match-details.component.ts
activeTabIndex = 0;

nextTab(): void {
  if (this.activeTabIndex < this.tabs.length - 1) {
    this.activeTabIndex++;
  }
}

prevTab(): void {
  if (this.activeTabIndex > 0) {
    this.activeTabIndex--;
  }
}
```

---

## 6. PullToRefreshDirective

### API Contract

```typescript
@Directive({
  selector: '[appPullToRefresh]'
})
export class PullToRefreshDirective implements OnInit, OnDestroy {
  @Input() pullThreshold: number = 80; // px
  @Input() disabled: boolean = false;
  @Input() refreshing: boolean = false;
  
  @Output() refresh = new EventEmitter<void>();
  
  private startY: number = 0;
  private currentY: number = 0;
  private pullDistance: number = 0;
  
  constructor(private el: ElementRef, private renderer: Renderer2) {}
  
  ngOnInit(): void {
    this.initializePullToRefresh();
  }
  
  private initializePullToRefresh(): void {
    const element = this.el.nativeElement;
    
    this.renderer.listen(element, 'touchstart', (e: TouchEvent) => {
      if (this.disabled || this.refreshing) return;
      if (window.pageYOffset === 0) { // Only at top of page
        this.startY = e.touches[0].clientY;
      }
    });
    
    this.renderer.listen(element, 'touchmove', (e: TouchEvent) => {
      if (this.disabled || this.refreshing || this.startY === 0) return;
      
      this.currentY = e.touches[0].clientY;
      this.pullDistance = this.currentY - this.startY;
      
      if (this.pullDistance > 0) {
        // Show pull indicator (update UI)
        this.updatePullIndicator(this.pullDistance);
      }
    });
    
    this.renderer.listen(element, 'touchend', () => {
      if (this.pullDistance > this.pullThreshold) {
        this.refresh.emit();
      }
      
      // Reset
      this.startY = 0;
      this.pullDistance = 0;
      this.hidePullIndicator();
    });
  }
  
  private updatePullIndicator(distance: number): void {
    // Implementation: Show/update pull indicator UI
    console.log(`Pulled ${distance}px`);
  }
  
  private hidePullIndicator(): void {
    // Implementation: Hide pull indicator
  }
  
  ngOnDestroy(): void {
    // Cleanup listeners (handled by Renderer2)
  }
}
```

### Usage Example

```html
<!-- Home Page -->
<div class="home-page"
     appPullToRefresh
     [pullThreshold]="80"
     [refreshing]="isRefreshing"
     (refresh)="onRefresh()">
  
  <app-match-card *ngFor="let match of matches" [match]="match"></app-match-card>
</div>
```

```typescript
// home.component.ts
isRefreshing = false;

onRefresh(): void {
  this.isRefreshing = true;
  
  this.matchService.fetchMatches().subscribe(
    matches => {
      this.matches = matches;
      this.isRefreshing = false;
    },
    error => {
      console.error('Refresh failed', error);
      this.isRefreshing = false;
    }
  );
}
```

---

## 7. ViewportService

### API Contract

```typescript
@Injectable({ providedIn: 'root' })
export class ViewportService {
  private breakpointObserver: BreakpointObserver;
  
  /**
   * Observable that emits true when viewport is mobile (<768px)
   */
  public isMobile$: Observable<boolean>;
  
  /**
   * Observable that emits true when viewport is tablet (768-1023px)
   */
  public isTablet$: Observable<boolean>;
  
  /**
   * Observable that emits true when viewport is desktop (≥1024px)
   */
  public isDesktop$: Observable<boolean>;
  
  /**
   * Observable that emits current breakpoint name
   */
  public currentBreakpoint$: Observable<'mobile-sm' | 'mobile-md' | 'mobile-lg' | 'tablet' | 'desktop'>;
  
  constructor(breakpointObserver: BreakpointObserver) {
    this.breakpointObserver = breakpointObserver;
    this.initializeBreakpoints();
  }
  
  private initializeBreakpoints(): void {
    this.isMobile$ = this.breakpointObserver.observe(['(max-width: 767px)'])
      .pipe(map(state => state.matches));
    
    this.isTablet$ = this.breakpointObserver.observe(['(min-width: 768px) and (max-width: 1023px)'])
      .pipe(map(state => state.matches));
    
    this.isDesktop$ = this.breakpointObserver.observe(['(min-width: 1024px)'])
      .pipe(map(state => state.matches));
    
    // Current breakpoint logic...
  }
  
  /**
   * Synchronous check for mobile viewport
   */
  public isMobile(): boolean {
    return window.innerWidth < 768;
  }
  
  /**
   * Get current viewport width in pixels
   */
  public getViewportWidth(): number {
    return window.innerWidth;
  }
  
  /**
   * Get current viewport height in pixels
   */
  public getViewportHeight(): number {
    return window.innerHeight;
  }
}
```

### Usage Example

```typescript
// home.component.ts
export class HomeComponent implements OnInit {
  layout$: Observable<'compact' | 'expanded'>;
  
  constructor(private viewportService: ViewportService) {}
  
  ngOnInit(): void {
    this.layout$ = this.viewportService.isMobile$.pipe(
      map(isMobile => isMobile ? 'compact' : 'expanded')
    );
  }
}
```

```html
<app-match-card 
  *ngFor="let match of matches"
  [match]="match"
  [layout]="layout$ | async">
</app-match-card>
```

---

## Integration Patterns

### Pattern 1: Responsive Component with ViewportService

```typescript
export class ResponsiveMatchCardComponent implements OnInit {
  layout: 'compact' | 'expanded' = 'compact';
  
  constructor(private viewportService: ViewportService) {}
  
  ngOnInit(): void {
    this.viewportService.isMobile$.subscribe(isMobile => {
      this.layout = isMobile ? 'compact' : 'expanded';
    });
  }
}
```

### Pattern 2: Gesture-Enabled Tabs

```typescript
export class MatchDetailsComponent {
  activeTabIndex = 0;
  tabs = ['Scorecard', 'Commentary', 'Stats', 'Info'];
  
  nextTab(): void {
    this.activeTabIndex = Math.min(this.activeTabIndex + 1, this.tabs.length - 1);
  }
  
  prevTab(): void {
    this.activeTabIndex = Math.max(this.activeTabIndex - 1, 0);
  }
}
```

```html
<div appSwipeGesture (swipeLeft)="nextTab()" (swipeRight)="prevTab()">
  <mat-tab-group [(selectedIndex)]="activeTabIndex">
    <mat-tab *ngFor="let tab of tabs" [label]="tab">
      <!-- Tab content -->
    </mat-tab>
  </mat-tab-group>
</div>
```

### Pattern 3: Connection-Aware Component

```typescript
export class LiveMatchComponent implements OnInit {
  webSocketConnected$ = this.connectionService.connectionStatus$.pipe(
    map(status => status === 'connected')
  );
  
  constructor(private connectionService: WebSocketConnectionService) {}
  
  ngOnInit(): void {
    this.webSocketConnected$.subscribe(connected => {
      if (!connected) {
        console.warn('WebSocket disconnected, live updates paused');
      }
    });
  }
}
```

---

## Testing Contracts

### Unit Test Example

```typescript
describe('MatchCardComponent', () => {
  it('should emit cardClick when clicked and clickable=true', () => {
    const component = new MatchCardComponent();
    component.match = mockMatch;
    component.clickable = true;
    
    let emittedId: string | null = null;
    component.cardClick.subscribe(id => emittedId = id);
    
    component.onCardClick();
    
    expect(emittedId).toBe(mockMatch.id);
  });
  
  it('should not emit cardClick when clickable=false', () => {
    const component = new MatchCardComponent();
    component.match = mockMatch;
    component.clickable = false;
    
    let emitted = false;
    component.cardClick.subscribe(() => emitted = true);
    
    component.onCardClick();
    
    expect(emitted).toBe(false);
  });
});
```

### E2E Test Example (Cypress)

```javascript
describe('SwipeGesture', () => {
  it('should navigate to next tab on swipe left', () => {
    cy.visit('/match/123');
    cy.get('.tabs-container').should('be.visible');
    
    // Simulate swipe left
    cy.get('.tabs-container')
      .trigger('touchstart', { touches: [{ clientX: 200, clientY: 300 }] })
      .trigger('touchmove', { touches: [{ clientX: 100, clientY: 300 }] })
      .trigger('touchend');
    
    cy.get('.mat-tab-label-active').should('contain', 'Commentary');
  });
});
```

---

## Conclusion

All component APIs are now documented with TypeScript interfaces, usage examples, and integration patterns. Developers can reference this document when implementing or consuming mobile components.