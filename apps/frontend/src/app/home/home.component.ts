import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { EventListService } from '../component/event-list.service';
import { Router } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { BlogListService, BlogPost } from '../component/blog-list.service';
import { MatchesService } from '../features/matches/services/matches.service';
import { MatchCardViewModel, MatchStatus } from '../features/matches/models/match-card.models';
import { filterLiveMatches, filterUpcomingMatches, filterCompletedMatches } from '../core/utils/match-utils';
import { Subscription } from 'rxjs';
import { ViewportService } from '../services/viewport.service';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {

  @ViewChild('scrollContainer', { read: ElementRef }) scrollContainer!: ElementRef;
  
  // New: Match data with strong typing
  liveMatches: MatchCardViewModel[] = [];
  upcomingMatches: MatchCardViewModel[] = [];
  recentMatches: MatchCardViewModel[] = [];
  isLoadingMatches = true;
  hasMatchError = false;
  
  // Mobile layout state
  isMobileView = false;
  currentOrientation: 'portrait' | 'landscape' = 'portrait';
  
  // Subscription for auto-refresh
  private matchSubscription?: Subscription;
  private viewportSubscription?: Subscription;
  
  // Existing: Blog posts
  blogPosts: BlogPost[];

  constructor(
    private eventListService: EventListService,
    private matchesService: MatchesService, // New: Matches service
    private viewportService: ViewportService, // New: Viewport service for responsive behavior
    private router: Router,
    private metaService: Meta,
    private titleService: Title,
    private blogListService: BlogListService,
    ) { }

  ngOnInit(): void {
    // Load blog posts
    this.blogListService.getBlogPosts().subscribe((data) => {
      this.blogPosts = data;
      console.log(this.blogPosts);
    });

    // Load matches using new MatchesService
    this.loadMatches();
    
    // Subscribe to viewport changes for responsive behavior (T025)
    this.viewportSubscription = this.viewportService.isMobile$.subscribe(isMobile => {
      this.isMobileView = isMobile;
      console.log('Mobile view:', isMobile);
    });
    
    // Subscribe to orientation changes (T025)
    this.viewportService.orientation$.subscribe(orientation => {
      this.currentOrientation = orientation;
      console.log('Orientation changed:', orientation);
      this.handleOrientationChange(orientation);
    });
  }
  
  /**
   * Load matches and categorize them with auto-refresh every 30 seconds
   * T041 - Integration with new MatchCardComponent
   */
  loadMatches(): void {
    this.isLoadingMatches = true;
    this.hasMatchError = false;
    
    // Subscribe to auto-refreshing matches (updates every 30 seconds)
    this.matchSubscription = this.matchesService.getLiveMatchesWithAutoRefresh().subscribe(
      (matches) => {
        // Categorize matches into sections
        this.liveMatches = filterLiveMatches(matches);
        this.upcomingMatches = filterUpcomingMatches(matches).slice(0, 3); // Show top 3 upcoming
        this.recentMatches = filterCompletedMatches(matches).slice(0, 3); // Show top 3 recent
        
        console.log('Live matches updated:', this.liveMatches);
        console.log('Upcoming matches:', this.upcomingMatches);
        console.log('Recent matches:', this.recentMatches);
        
        this.isLoadingMatches = false;
      },
      (error) => {
        console.error('Error loading matches:', error);
        this.hasMatchError = true;
        this.isLoadingMatches = false;
      }
    );
  }
  
  /**
   * Cleanup on component destroy
   */
  ngOnDestroy(): void {
    // Unsubscribe from match updates
    if (this.matchSubscription) {
      this.matchSubscription.unsubscribe();
    }
    
    // Unsubscribe from viewport updates
    if (this.viewportSubscription) {
      this.viewportSubscription.unsubscribe();
    }
    
    // Stop auto-refresh timer
    this.matchesService.stopAutoRefresh();
  }
  
  /**
   * Handle mobile match card click (T026)
   * Navigate to match details page
   */
  onMobileMatchClick(matchId: string): void {
    const match = [...this.liveMatches, ...this.upcomingMatches, ...this.recentMatches]
      .find(m => m.id === matchId);
    
    if (match) {
      this.onMatchClick(match);
    }
  }
  
  /**
   * Handle orientation change (T025)
   * Adapt layout without page reload
   */
  handleOrientationChange(orientation: 'portrait' | 'landscape'): void {
    console.log(`Orientation changed to ${orientation}`);
    
    // Update CSS classes or layout properties if needed
    // The CSS media queries will handle most of the layout changes
    // This method is here for any JavaScript-specific adjustments
    
    // Force reflow to ensure smooth transition
    if (this.scrollContainer && this.scrollContainer.nativeElement) {
      const element = this.scrollContainer.nativeElement;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _ = element.offsetHeight; // Trigger reflow
    }
  }
  
  /**
   * Handle match card click
   */
  onMatchClick(match: MatchCardViewModel): void {
    // Update meta tags
    this.updateMetaTagsForMatch(match);
    
    // Navigate to match details using the original URL structure
    if (match.matchUrl) {
      // Extract the match URL path from the full URL
      // URL format: https://crex.com/scoreboard/.../ind-a-vs-sa-a-2nd-test.../live
      const urlParts = match.matchUrl.split('/');
      const matchUrlPath = urlParts[urlParts.length - 2]; // Get the part before '/live'
      
      // Navigate to cric-live route (existing route in the app)
      this.router.navigate(['cric-live', matchUrlPath]);
    } else {
      console.warn('No match URL available for navigation');
    }
  }
  
  /**
   * Handle details button click
   */
  onDetailsClick(match: MatchCardViewModel): void {
    console.log('Details clicked for match:', match);
    this.onMatchClick(match);
  }
  
  /**
   * Update meta tags for match
   */
  updateMetaTagsForMatch(match: MatchCardViewModel): void {
    const title = `${match.team1.name} vs ${match.team2.name} - ${match.displayStatus}`;
    const description = `Live cricket score: ${match.team1.name} vs ${match.team2.name} at ${match.venue}`;
    const keywords = `${match.team1.name}, ${match.team2.name}, cricket match, live score, ${match.venue}`;
    
    this.titleService.setTitle(title);
    this.metaService.updateTag({ name: 'description', content: description });
    this.metaService.updateTag({ name: 'keywords', content: keywords });
    this.metaService.updateTag({ property: 'og:title', content: title });
    this.metaService.updateTag({ property: 'og:description', content: description });
  }
  
  /**
   * TrackBy function for ngFor optimization
   */
  trackByMatchId(index: number, match: MatchCardViewModel): string {
    return match.id;
  }

  // ===== OLD CODE BELOW - KEPT FOR BACKWARD COMPATIBILITY =====
  // Can be removed after migration is complete

  parseLiveMatchUrl(url: string) {
    const result1 = this.extractTeamAndTournament(url);
    console.log(`URL1 -> Team: ${result1.teamName}, Tournament: ${result1.tournamentName}`);
    const parts = url.split('/').slice(2); // Ignore the first empty part and 'scoreboard'

    //const date = '27 July'; // Assuming we have the date already or can derive it
    const title = result1.tournamentName;
    const description = `${parts[2].replace(/-/g, ' ')}`; // Create a description
    const teams = result1.teamName;

    const team1 = this.extractTeams(teams).team1;
    const team2 = this.extractTeams(teams).team2;

    const matchUrl =parts[5];
    //const startTime = '06:00 PM'; // Assuming we have the start time already or can derive it

    return {
      //date,
      title,
      description,
      team1,
      team2,
      matchUrl,
      //startTime
    };
  }

  // ===== OLD CODE BELOW - KEPT FOR REFERENCE ONLY =====
  // These methods are no longer used but kept for backward compatibility
  // Can be removed after full migration is verified

  // navigateToMatch(match: any): void {
  //   this.updateMetaTags(match);
  //   this.router.navigate(['cric-live', match.matchUrl]);
  // }

  // updateMetaTags(match: any): void {
  //   this.titleService.setTitle(match.title);
  //   this.metaService.updateTag({ name: 'description', content: match.description });
  //   this.metaService.updateTag({ name: 'keywords', content: `${match.team1}, ${match.team2}, cricket match, live score, ${match.title}` });
  //   this.metaService.updateTag({ property: 'og:title', content: match.title });
  //   this.metaService.updateTag({ property: 'og:description', content: match.description });
  // }
  

  private formatTeamName(team: string): string {
    return team.toUpperCase();
  }

  /**
   * Scroll carousel left by section ID
   */
  scrollLeft(containerId: string): void {
    const container = document.getElementById(containerId);
    if (container) {
      const scrollAmount = container.offsetWidth * 0.8; // Scroll 80% of container width
      container.scrollBy({
        left: -scrollAmount,
        behavior: 'smooth'
      });
    }
  }

  /**
   * Scroll carousel right by section ID
   */
  scrollRight(containerId: string): void {
    const container = document.getElementById(containerId);
    if (container) {
      const scrollAmount = container.offsetWidth * 0.8; // Scroll 80% of container width
      container.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });
    }
  }

  /**
   * Check if we can scroll left
   */
  canScrollLeft(containerId: string): boolean {
    const container = document.getElementById(containerId);
    return container ? container.scrollLeft > 0 : false;
  }

  /**
   * Check if we can scroll right
   */
  canScrollRight(containerId: string): boolean {
    const container = document.getElementById(containerId);
    if (!container) return false;
    return container.scrollLeft < (container.scrollWidth - container.clientWidth - 1);
  }


 extractTeamAndTournament(url: string): { teamName: string | null, tournamentName: string | null } {
    // Regular expression to capture the part of the URL with team names and tournament name
    const pattern = /\/([a-z0-9\-]+)\/(live|scorecard)$/i;

    // Search for the pattern in the URL
    const match = url.match(pattern);

    if (match) {
        // The full match for the team names and tournament name
        const fullMatch = match[1];
        
        // Split on hyphens to separate the match details
        const parts = fullMatch.split('-');

        // Handle cases with team names and tournament name
        if (parts.length >= 5) {
            // Extract team names (everything before the first 'match')
            const teamPart = parts.slice(0, parts.indexOf('match') - 1).join('-');

            // Extract tournament name (everything after the 'match')
            const matchIndex = parts.indexOf('match');
            const tournamentName = parts.slice(matchIndex + 1).join('-');

            return { teamName: teamPart, tournamentName: tournamentName };
        }
    }

    return { teamName: null, tournamentName: null };
}

extractTeams(matchString: string): { team1: string, team2: string } | null {
  // Check if the match string contains the "-vs-" separator
  if (matchString.includes("-vs-")) {
      // Split the string at "-vs-" to get the two teams
      const teams = matchString.split("-vs-");

      // Ensure we have exactly two teams
      if (teams.length === 2) {
          return {
              team1: teams[0], // First team
              team2: teams[1]  // Second team
          };
      }else if(teams.length > 2)
      {
        const firstVsIndex = matchString.indexOf("-vs-");

    // If "-vs-" is found
    if (firstVsIndex !== -1) {
        // Extract the substring before and after the first "-vs-"
        const team1Part = matchString.substring(0, firstVsIndex);
        const team2Part = matchString.substring(firstVsIndex + 4); // Skip over "-vs-"

        // Split team2Part by "-" to get the first word after "vs", which would be the second team
        const team2Array = team2Part.split("-");
        const team2 = team2Array[0];

        return {
            team1: team1Part, // The first team is the part before "-vs-"
            team2: team2 // The second team is the first segment after "-vs-"
        };
    }
      }
  }
  // Return null if the format is incorrect
  return null;
}

 extractTournamentName(matchString: string): string | null {
    // Define the pattern to match the 'match' part (e.g., 1st-match, 4th-match, etc.)
    const matchPattern = /\d{1,2}(st|nd|rd|th)-match/i;

    // Search for the matchPattern in the matchString
    const match = matchString.match(matchPattern);

    if (match) {
        // Extract everything after the matched "1st-match" or "4th-match" part
        const startIndex = match.index! + match[0].length; // Start after the match part
        const tournamentName = matchString.substring(startIndex + 1); // Extract the tournament name
        return tournamentName.trim(); // Return trimmed tournament name
    }

    // Return null if the pattern is not found
    return null;
}
openNews(url: string): void {
  window.open(url, '_blank');
}

}
