import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

export interface CanonicalMeta {
  title: string;
  description: string;
  canonicalUrl: string;
  keywords?: string; // Match-specific keywords
  robots?: string; // e.g., 'index,follow' | 'noindex,follow'
  og?: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
  };
  twitter?: {
    card?: 'summary_large_image' | 'summary';
    site?: string;
  };
  jsonLd?: Record<string, any>; // For structured data injection
}

@Injectable({ providedIn: 'root' })
export class MetaTagsService {
  private canonicalHost = 'https://www.crickzen.com';
  private isBrowser: boolean;

  constructor(
    private meta: Meta,
    private titleService: Title,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  // Ensures canonical URL uses the configured host consistently
  ensureCanonicalHost(url: string): string {
    try {
      const u = new URL(url, this.canonicalHost);
      u.protocol = 'https:';
      u.host = new URL(this.canonicalHost).host;
      return u.toString();
    } catch {
      return this.canonicalHost;
    }
  }

  // Build match page metadata based on minimal inputs
  // For live matches, set isLive=true and provide finalUrl for canonical handoff
  buildMatchMeta(input: {
    path: string; // e.g., /match/123 or /cric-live/123
    title: string;
    description: string;
    ogImage?: string;
    isLive?: boolean; // true if this is a live match page
    finalUrl?: string; // season-scoped URL for canonical (when isLive=true)
  }): CanonicalMeta {
    // Live→final canonical handoff: during live, canonical points to final season-scoped URL
    const canonicalUrl = input.isLive && input.finalUrl
      ? this.ensureCanonicalHost(input.finalUrl)
      : this.ensureCanonicalHost(input.path);

    return {
      title: input.title,
      description: input.description,
      canonicalUrl,
      robots: 'index,follow',
      og: {
        title: input.title,
        description: input.description,
        image: input.ogImage,
        url: canonicalUrl,
      },
      twitter: {
        card: 'summary_large_image',
        site: '@crickzen',
      },
    };
  }

  /**
   * Build final season-scoped URL from match data
   * Example: /match/ipl/2023/mumbai-indians-vs-chennai-super-kings/t20/2023-05-29
   */
  buildFinalMatchUrl(match: {
    tournament?: string;
    season?: string;
    homeTeam?: string;
    awayTeam?: string;
    format?: string;
    date?: string; // YYYY-MM-DD
  }): string | null {
    const { tournament, season, homeTeam, awayTeam, format, date } = match;
    
    // Return null if any required field is missing (fall back to current path)
    if (!tournament || !season || !homeTeam || !awayTeam || !format || !date) {
      return null;
    }

    const slugify = (str: string) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `/match/${slugify(tournament)}/${slugify(season)}/${slugify(homeTeam)}-vs-${slugify(awayTeam)}/${slugify(format)}/${date}`;
  }

  /**
   * Apply SEO meta tags to the current page
   * Updates title, description, canonical, OG tags, Twitter cards, and JSON-LD
   */
  setPageMeta(path: string, meta: CanonicalMeta): void {
    // Set page title
    this.titleService.setTitle(meta.title);

    // Set meta description
    this.meta.updateTag({ name: 'description', content: meta.description });

    // Set keywords if provided
    if (meta.keywords) {
      this.meta.updateTag({ name: 'keywords', content: meta.keywords });
    }

    // Set robots directive
    if (meta.robots) {
      this.meta.updateTag({ name: 'robots', content: meta.robots });
    }

    // Set Open Graph tags
    if (meta.og) {
      if (meta.og.title) {
        this.meta.updateTag({ property: 'og:title', content: meta.og.title });
      }
      if (meta.og.description) {
        this.meta.updateTag({ property: 'og:description', content: meta.og.description });
      }
      if (meta.og.image) {
        this.meta.updateTag({ property: 'og:image', content: meta.og.image });
      }
      if (meta.og.url) {
        this.meta.updateTag({ property: 'og:url', content: meta.og.url });
      }
      this.meta.updateTag({ property: 'og:type', content: 'website' });
      this.meta.updateTag({ property: 'og:site_name', content: 'Crickzen' });
    }

    // Set Twitter Card tags
    if (meta.twitter) {
      this.meta.updateTag({ name: 'twitter:card', content: meta.twitter.card || 'summary_large_image' });
      if (meta.twitter.site) {
        this.meta.updateTag({ name: 'twitter:site', content: meta.twitter.site });
      }
      this.meta.updateTag({ name: 'twitter:title', content: meta.title });
      this.meta.updateTag({ name: 'twitter:description', content: meta.description });
      if (meta.og && meta.og.image) {
        this.meta.updateTag({ name: 'twitter:image', content: meta.og.image });
      }
    }

    // Update canonical link element
    this.updateCanonicalLink(meta.canonicalUrl);

    // Update JSON-LD structured data
    if (meta.jsonLd) {
      this.updateJsonLd(meta.jsonLd);
    }
  }

  /**
   * Update or create the canonical link element
   */
  private updateCanonicalLink(url: string): void {
    if (!this.document) return;

    let link: HTMLLinkElement | null = this.document.querySelector('link[rel="canonical"]');
    
    if (link) {
      link.setAttribute('href', url);
    } else {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('href', url);
      this.document.head.appendChild(link);
    }
  }

  /**
   * Update or create JSON-LD script element
   */
  private updateJsonLd(data: Record<string, any>): void {
    if (!this.document) return;

    // Find existing or create new script element
    let script: HTMLScriptElement | null = this.document.querySelector('script[data-seo-jsonld="match"]');
    
    if (!script) {
      script = this.document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('data-seo-jsonld', 'match');
      this.document.head.appendChild(script);
    }
    
    script.textContent = JSON.stringify(data);
  }

  /**
   * Build SEO-optimized title for a match
   * Format: "TEAM1 vs TEAM2 Live Score | Series Name 2025 | Crickzen"
   */
  buildMatchTitle(team1: string, team2: string, series?: string, isLive?: boolean): string {
    const statusPrefix = isLive ? 'Live Score: ' : '';
    const seriesSuffix = series ? ` | ${series}` : '';
    return `${statusPrefix}${team1} vs ${team2}${seriesSuffix} | Crickzen`;
  }

  /**
   * Build SEO-optimized description for a match
   */
  buildMatchDescription(team1: string, team2: string, venue?: string, isLive?: boolean): string {
    const liveText = isLive ? 'Live cricket score, ball-by-ball updates, ' : '';
    const venueText = venue ? ` at ${venue}` : '';
    return `${liveText}${team1} vs ${team2}${venueText}. Get scorecard, squads, and match analysis on Crickzen!`;
  }

  /**
   * Build match-specific keywords
   */
  buildMatchKeywords(team1: string, team2: string, series?: string, venue?: string): string {
    const keywords = [
      `${team1} vs ${team2}`,
      `${team1} vs ${team2} live score`,
      `${team1} ${team2} match`,
      `${team1} live score`,
      `${team2} live score`,
      'live cricket score',
      'ball by ball updates'
    ];
    
    if (series) {
      keywords.push(series);
      keywords.push(`${series} live`);
    }
    
    if (venue) {
      keywords.push(venue);
    }
    
    keywords.push('Crickzen', 'cricket scorecard', 'match updates');
    
    return keywords.join(', ');
  }

  /**
   * Build SportsEvent JSON-LD for a match
   */
  buildMatchJsonLd(input: {
    name: string;
    team1: string;
    team2: string;
    startDate: string; // ISO 8601
    url: string;
    venue?: string;
    description?: string;
    status?: 'Scheduled' | 'InProgress' | 'Completed';
  }): Record<string, any> {
    return {
      '@context': 'https://schema.org',
      '@type': 'SportsEvent',
      name: input.name,
      description: input.description || `${input.team1} vs ${input.team2} cricket match`,
      startDate: input.startDate,
      url: input.url,
      eventStatus: input.status === 'InProgress' ? 'https://schema.org/EventScheduled' : 
                   input.status === 'Completed' ? 'https://schema.org/EventEnded' :
                   'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: input.venue ? {
        '@type': 'Place',
        name: input.venue
      } : undefined,
      competitor: [
        { '@type': 'SportsTeam', name: input.team1 },
        { '@type': 'SportsTeam', name: input.team2 }
      ],
      organizer: {
        '@type': 'Organization',
        name: 'Crickzen',
        url: 'https://www.crickzen.com'
      }
    };
  }
}
