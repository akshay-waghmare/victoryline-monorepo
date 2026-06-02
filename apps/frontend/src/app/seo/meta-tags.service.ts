import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export interface CanonicalMeta {
  title: string;
  description: string;
  canonicalUrl: string;
  robots?: string; // e.g., 'index,follow' | 'noindex,follow'
  og?: {
    title?: string;
    description?: string;
    image?: string;
    imageWidth?: number;
    imageHeight?: number;
    url?: string;
  };
  twitter?: {
    card?: 'summary_large_image' | 'summary';
    site?: string;
    image?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class MetaTagsService {
  private canonicalHost = 'https://www.crickzen.com';

  constructor(
    private titleService: Title,
    private metaService: Meta,
    @Inject(DOCUMENT) private document: any
  ) {}

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

  setPageMeta(_path: string, meta: CanonicalMeta) {
    this.titleService.setTitle(meta.title);
    this.metaService.updateTag({ name: 'description', content: meta.description });
    this.metaService.updateTag({ name: 'robots', content: meta.robots || 'index,follow' });
    this.setCanonical(meta.canonicalUrl);

    this.metaService.updateTag({ property: 'og:title', content: meta.og && meta.og.title ? meta.og.title : meta.title });
    this.metaService.updateTag({ property: 'og:description', content: meta.og && meta.og.description ? meta.og.description : meta.description });
    this.metaService.updateTag({ property: 'og:url', content: meta.og && meta.og.url ? meta.og.url : meta.canonicalUrl });
    this.metaService.updateTag({ property: 'og:site_name', content: 'Crickzen' });
    this.metaService.updateTag({ property: 'og:type', content: 'website' });
    if (meta.og && meta.og.image) {
      this.metaService.updateTag({ property: 'og:image', content: meta.og.image });
      this.metaService.updateTag({ property: 'og:image:width', content: String(meta.og.imageWidth || 1200) });
      this.metaService.updateTag({ property: 'og:image:height', content: String(meta.og.imageHeight || 630) });
    } else {
      this.metaService.removeTag("property='og:image'");
      this.metaService.removeTag("property='og:image:width'");
      this.metaService.removeTag("property='og:image:height'");
    }

    this.metaService.updateTag({ name: 'twitter:card', content: (meta.twitter && meta.twitter.card) || 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: meta.og && meta.og.title ? meta.og.title : meta.title });
    this.metaService.updateTag({ name: 'twitter:description', content: meta.og && meta.og.description ? meta.og.description : meta.description });
    this.metaService.updateTag({ name: 'twitter:site', content: (meta.twitter && meta.twitter.site) || '@crickzen' });
    if (meta.twitter && meta.twitter.image) {
      this.metaService.updateTag({ name: 'twitter:image', content: meta.twitter.image });
    } else if (meta.og && meta.og.image) {
      this.metaService.updateTag({ name: 'twitter:image', content: meta.og.image });
    } else {
      this.metaService.removeTag("name='twitter:image'");
    }
  }

  private setCanonical(url: string): void {
    if (!this.document || !this.document.head) {
      return;
    }

    const canonicalUrl = this.ensureCanonicalHost(url);
    const existing = Array.from(this.document.head.querySelectorAll('link[rel="canonical"]')) as any[];
    let canonical = existing.shift();

    existing.forEach((node) => {
      if (node && node.parentNode) {
        node.parentNode.removeChild(node);
      }
    });

    if (!canonical) {
      canonical = this.document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      this.document.head.appendChild(canonical);
    }

    canonical.setAttribute('href', canonicalUrl);
  }
}
