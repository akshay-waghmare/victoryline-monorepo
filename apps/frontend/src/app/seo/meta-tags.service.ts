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
  buildMatchMeta(input: {
    path: string; // e.g., /match/123
    title: string;
    description: string;
    ogImage?: string;
  }): CanonicalMeta {
    const canonicalUrl = this.ensureCanonicalHost(input.path);
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

  // Placeholder: Wire to Angular Meta/Title services in a follow-up task.
  setPageMeta(_path: string, _meta: CanonicalMeta) {
    // Intentionally left as a stub for MVP wiring.
  }
}
