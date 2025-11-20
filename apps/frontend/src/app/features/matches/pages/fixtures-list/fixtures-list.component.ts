/**
 * Fixtures List Component
 * Purpose: Display upcoming/scheduled cricket matches from Feature 005 API
 * Route: /fixtures/match-list
 * Created: 2025-11-18
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UpcomingMatchesService, UpcomingMatchDTO } from '../../services/upcoming-matches.service';

@Component({
  selector: 'app-fixtures-list',
  templateUrl: './fixtures-list.component.html',
  styleUrls: ['./fixtures-list.component.css']
})
export class FixturesListComponent implements OnInit, OnDestroy {
  // Match data
  fixtures: UpcomingMatchDTO[] = [];
  filteredFixtures: UpcomingMatchDTO[] = [];
  
  // Loading states
  isLoading = true;
  hasError = false;
  errorMessage = '';
  
  // Filter and search
  searchQuery = '';
  selectedStatus = 'all';
  statusOptions = [
    { value: 'all', label: 'All Fixtures' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'postponed', label: 'Postponed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];
  
  // Pagination
  currentPage = 0;
  pageSize = 20;
  totalItems = 0;
  
  // Auto-refresh
  lastUpdated: Date = null;
  private autoRefreshInterval = 15 * 60 * 1000; // 15 minutes in milliseconds
  
  // Unsubscribe subject
  private destroy$ = new Subject<void>();
  
  constructor(
    private upcomingMatchesService: UpcomingMatchesService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    this.loadFixtures();
    this.startAutoRefresh();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  /**
   * Start auto-refresh timer (every 15 minutes)
   */
  private startAutoRefresh(): void {
    interval(this.autoRefreshInterval)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        console.log('Auto-refreshing fixtures...');
        this.loadFixtures();
      });
  }
  
  /**
   * Load fixtures from API
   */
  loadFixtures(): void {
    this.isLoading = true;
    this.hasError = false;
    
    const status = this.selectedStatus === 'all' ? undefined : this.selectedStatus;
    
    this.upcomingMatchesService.getUpcomingMatches(this.currentPage, this.pageSize, status)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (response) => {
          // Filter: Only show matches that haven't started yet (future matches only)
          const currentTime = Math.floor(Date.now() / 1000); // Current Unix timestamp in seconds
          const allMatches = response.items;
          
          this.fixtures = allMatches.filter(fixture => 
            fixture.startTime > currentTime  // Only future matches
          );
          
          this.totalItems = this.fixtures.length;
          this.lastUpdated = new Date();
          this.applySearch();
          this.isLoading = false;
          
          const filteredCount = allMatches.length - this.fixtures.length;
          console.log('✅ Showing', this.fixtures.length, 'upcoming matches');
          if (filteredCount > 0) {
            console.log('⏸️ Hidden', filteredCount, 'past/started matches');
          }
        },
        (error) => {
          this.hasError = true;
          this.errorMessage = 'Failed to load fixtures. Please try again later.';
          this.isLoading = false;
          console.error('Error loading fixtures:', error);
        }
      );
  }
  
  /**
   * Apply search filter
   */
  applySearch(): void {
    if (!this.searchQuery.trim()) {
      this.filteredFixtures = [...this.fixtures];
      return;
    }
    
    const query = this.searchQuery.toLowerCase().trim();
    this.filteredFixtures = this.fixtures.filter(fixture => 
      fixture.matchTitle.toLowerCase().includes(query) ||
      fixture.seriesName.toLowerCase().includes(query) ||
      fixture.teamA.name.toLowerCase().includes(query) ||
      fixture.teamB.name.toLowerCase().includes(query) ||
      (fixture.venue && fixture.venue.name && fixture.venue.name.toLowerCase().includes(query)) ||
      (fixture.venue && fixture.venue.city && fixture.venue.city.toLowerCase().includes(query))
    );
  }
  
  /**
   * Handle search query change
   */
  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.applySearch();
  }
  
  /**
   * Handle status filter change
   */
  onStatusChange(): void {
    this.currentPage = 0;
    this.loadFixtures();
  }
  
  /**
   * Handle page change
   */
  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadFixtures();
  }
  
  /**
   * Refresh fixtures
   */
  onRefresh(): void {
    this.loadFixtures();
  }
  
  /**
   * Format Unix timestamp to readable date/time
   */
  formatDateTime(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  /**
   * Format date only
   */
  formatDate(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
  
  /**
   * Format time only
   */
  formatTime(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  /**
   * Get status badge class
   */
  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'scheduled':
        return 'status-scheduled';
      case 'postponed':
        return 'status-postponed';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-default';
    }
  }
  
  /**
   * Check if match is upcoming (within 24 hours)
   */
  isUpcomingSoon(timestamp: number): boolean {
    const now = Date.now() / 1000;
    const hoursUntil = (timestamp - now) / 3600;
    return hoursUntil > 0 && hoursUntil <= 24;
  }
  
  /**
   * Get time until match starts
   */
  getTimeUntilMatch(timestamp: number): string {
    const now = Date.now() / 1000;
    const secondsUntil = timestamp - now;
    
    if (secondsUntil < 0) {
      return 'Started';
    }
    
    const daysUntil = Math.floor(secondsUntil / 86400);
    const hoursUntil = Math.floor((secondsUntil % 86400) / 3600);
    const minutesUntil = Math.floor((secondsUntil % 3600) / 60);
    
    if (daysUntil > 0) {
      return `In ${daysUntil} day${daysUntil > 1 ? 's' : ''}`;
    } else if (hoursUntil > 0) {
      return `In ${hoursUntil} hour${hoursUntil > 1 ? 's' : ''}`;
    } else if (minutesUntil > 0) {
      return `In ${minutesUntil} minute${minutesUntil > 1 ? 's' : ''}`;
    } else {
      return 'Starting soon';
    }
  }
  
  /**
   * TrackBy function for ngFor optimization
   */
  trackByFixtureId(index: number, fixture: UpcomingMatchDTO): number {
    return fixture.id;
  }
}
