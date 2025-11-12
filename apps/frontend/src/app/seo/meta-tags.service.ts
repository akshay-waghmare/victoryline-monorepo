import { Injectable } from '@angular/core';

export interface CanonicalMeta {
  title: string;
  description: string;
  canonicalUrl: string;
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
}

@Injectable({ providedIn: 'root' })
export class MetaTagsService {
  private canonicalHost = 'https://www.crickzen.com';

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

  // Placeholder: Wire to Angular Meta/Title services in a follow-up task.
  setPageMeta(_path: string, _meta: CanonicalMeta) {
    // Intentionally left as a stub for MVP wiring.
  }
}
