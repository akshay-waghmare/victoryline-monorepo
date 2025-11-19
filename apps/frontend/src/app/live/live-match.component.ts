import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface LiveEvent {
  id: number;
  matchId: string;
  message: string;
  eventType: string;
  overLabel?: string;
  inningsLabel?: string;
  createdAt: string;
}

interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  error: string | null;
  retryCount: number;
}

@Component({
  selector: 'app-live-match',
  templateUrl: './live-match.component.html',
  styleUrls: ['./live-match.component.css']
})
export class LiveMatchComponent implements OnInit, OnDestroy {
  matchId: string | null = null;
  events: LiveEvent[] = [];
  loading = true;
  
  connectionStatus: ConnectionStatus = {
    connected: false,
    reconnecting: false,
    error: null,
    retryCount: 0
  };

  private eventSource: EventSource | null = null;
  private destroy$ = new Subject<void>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000; // Start with 2 seconds
  private maxReconnectDelay = 30000; // Max 30 seconds
  private reconnectTimeout: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const matchId = params.get('matchId');
        if (matchId) {
          this.matchId = matchId;
          this.connectToLiveUpdates(matchId);
        } else {
          this.connectionStatus.error = 'Invalid match ID';
          this.loading = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.cleanup();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Connect to SSE endpoint for live updates
   */
  private connectToLiveUpdates(matchId: string): void {
    const apiUrl = this.getApiUrl();
    const url = `${apiUrl}/live/matches/${matchId}/stream`;

    console.log(`[LiveMatch] Connecting to: ${url}`);

    try {
      this.eventSource = new EventSource(url);

      // Connection opened
      this.eventSource.onopen = () => {
        console.log('[LiveMatch] Connection opened');
        this.connectionStatus.connected = true;
        this.connectionStatus.reconnecting = false;
        this.connectionStatus.error = null;
        this.reconnectAttempts = 0;
        this.loading = false;
        this.cdr.detectChanges();
      };

      // Message received
      this.eventSource.onmessage = (event) => {
        this.handleMessage(event);
      };

      // Error occurred
      this.eventSource.onerror = (error) => {
        this.handleError(error);
      };

      // Custom event types (if backend sends them)
      this.eventSource.addEventListener('live-event', (event: any) => {
        this.handleMessage(event);
      });

    } catch (error) {
      console.error('[LiveMatch] Failed to create EventSource:', error);
      this.connectionStatus.error = 'Failed to establish connection';
      this.loading = false;
      this.attemptReconnect();
    }
  }

  /**
   * Handle incoming SSE message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      // Add timestamp if not present
      if (!data.createdAt) {
        data.createdAt = new Date().toISOString();
      }

      // Add to events array (prepend for newest first)
      this.events.unshift(data);

      // Limit to 100 events to prevent memory issues
      if (this.events.length > 100) {
        this.events = this.events.slice(0, 100);
      }

      console.log('[LiveMatch] Event received:', data);

      // Announce to screen readers
      this.announceEvent(data);

    } catch (error) {
      console.error('[LiveMatch] Failed to parse event:', error, event.data);
    }
  }

  /**
   * Handle connection error
   */
  private handleError(error: any): void {
    console.error('[LiveMatch] SSE Error:', error);

    this.connectionStatus.connected = false;
    this.connectionStatus.error = 'Connection lost';
    this.cdr.detectChanges();

    // Close the existing connection
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    // Attempt to reconnect
    this.attemptReconnect();
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[LiveMatch] Max reconnection attempts reached');
      this.connectionStatus.error = 'Failed to reconnect. Please refresh the page.';
      this.connectionStatus.reconnecting = false;
      this.cdr.detectChanges();
      return;
    }

    this.reconnectAttempts++;
    this.connectionStatus.reconnecting = true;
    this.connectionStatus.retryCount = this.reconnectAttempts;
    this.cdr.detectChanges();

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    console.log(`[LiveMatch] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      if (this.matchId) {
        this.connectToLiveUpdates(this.matchId);
      }
    }, delay);
  }

  /**
   * Manual reconnect triggered by user
   */
  reconnect(): void {
    console.log('[LiveMatch] Manual reconnect triggered');
    this.reconnectAttempts = 0;
    this.connectionStatus.error = null;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.matchId) {
      this.connectToLiveUpdates(this.matchId);
    }
  }

  /**
   * Announce event to screen readers for accessibility
   */
  private announceEvent(event: LiveEvent): void {
    const liveRegion = document.getElementById('live-updates-announcer');
    if (liveRegion) {
      // Clear and set new content for screen reader announcement
      liveRegion.textContent = '';
      setTimeout(() => {
        liveRegion.textContent = `${event.eventType}: ${event.message}`;
      }, 100);
    }
  }

  /**
   * Get API base URL
   */
  private getApiUrl(): string {
    // In production, use environment variable or relative path
    return window.location.origin + '/api';
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    if (this.eventSource) {
      console.log('[LiveMatch] Closing SSE connection');
      this.eventSource.close();
      this.eventSource = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.connectionStatus.connected = false;
  }

  /**
   * Format timestamp for display
   */
  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Get CSS class for event type
   */
  getEventClass(eventType: string): string {
    const typeMap: { [key: string]: string } = {
      'WICKET': 'event-wicket',
      'FOUR': 'event-boundary',
      'SIX': 'event-boundary',
      'OVER_COMPLETE': 'event-over',
      'INNINGS_BREAK': 'event-innings',
      'MATCH_START': 'event-start',
      'MATCH_END': 'event-end'
    };
    return typeMap[eventType] || 'event-default';
  }

  /**
   * Get icon for event type
   */
  getEventIcon(eventType: string): string {
    const iconMap: { [key: string]: string } = {
      'WICKET': '🎯',
      'FOUR': '4️⃣',
      'SIX': '6️⃣',
      'OVER_COMPLETE': '🔄',
      'INNINGS_BREAK': '☕',
      'MATCH_START': '🏏',
      'MATCH_END': '🏆'
    };
    return iconMap[eventType] || '📢';
  }

  /**
   * Back to matches list
   */
  goBack(): void {
    this.router.navigate(['/matches']);
  }

  /**
   * TrackBy function for ngFor performance
   */
  trackByEventId(index: number, event: LiveEvent): number {
    return event.id || index;
  }
}
