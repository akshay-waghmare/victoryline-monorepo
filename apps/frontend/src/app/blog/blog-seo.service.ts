import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';

/**
 * Blog SEO Service
 * 
 * Manages SEO metadata for blog pages including:
 * - Page title
 * - Meta descriptions
 * - Open Graph tags
 * - Twitter Card tags
 * - Canonical URLs
 * - JSON-LD structured data
 */
@Injectable({
  providedIn: 'root'
})
export class BlogSeoService {
  private isBrowser: boolean;

  constructor(
    private meta: Meta,
    private title: Title,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  /**
   * Set the page title
   */
  setTitle(title: string): void {
    this.title.setTitle(title);
    this.setMetaTag('og:title', title);
    this.setMetaTag('twitter:title', title);
  }

  /**
   * Set meta description
   */
  setMetaDescription(description: string): void {
    this.meta.updateTag({ name: 'description', content: description });
    this.setMetaTag('og:description', description);
    this.setMetaTag('twitter:description', description);
  }

  /**
   * Set a meta tag
   */
  setMetaTag(name: string, content: string): void {
    if (name.startsWith('og:')) {
      this.meta.updateTag({ property: name, content });
    } else if (name.startsWith('twitter:')) {
      this.meta.updateTag({ name, content });
    } else if (name.startsWith('article:')) {
      // For article tags, add multiple tags instead of replacing
      this.meta.addTag({ property: name, content });
    } else {
      this.meta.updateTag({ name, content });
    }
  }

  /**
   * Set canonical URL
   */
  setCanonicalUrl(path: string): void {
    if (!this.isBrowser) {
      return;
    }

    const origin = window.location.origin;
    const canonicalUrl = `${origin}${path}`;

    // Remove existing canonical link if present
    const existingLink = document.querySelector('link[rel="canonical"]');
    if (existingLink) {
      existingLink.setAttribute('href', canonicalUrl);
    } else {
      // Create new canonical link
      const link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('href', canonicalUrl);
      document.head.appendChild(link);
    }

    // Also set og:url
    this.setMetaTag('og:url', canonicalUrl);
  }

  /**
   * Set JSON-LD structured data
   */
  setJsonLd(data: any): void {
    if (!this.isBrowser) {
      return;
    }

    // Remove existing JSON-LD script if present
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Create new JSON-LD script
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(data);
    document.head.appendChild(script);
  }

  /**
   * Clear all blog-specific meta tags
   */
  clearMetaTags(): void {
    // Remove article tags
    const articleTags = document.querySelectorAll('meta[property^="article:"]');
    articleTags.forEach(tag => tag.remove());

    // Remove JSON-LD
    const jsonLdScript = document.querySelector('script[type="application/ld+json"]');
    if (jsonLdScript) {
      jsonLdScript.remove();
    }

    // Reset to default title
    this.title.setTitle('Crickzen - Cricket Scores, News, and Analysis');

    // Reset default meta description
    this.setMetaDescription('Get live cricket scores, match updates, news, and expert analysis on Crickzen.');
  }

  /**
   * Set default SEO tags for blog list page
   */
  setBlogListMeta(): void {
    this.setTitle('Cricket Blog - News, Updates & Analysis | Crickzen');
    this.setMetaDescription('Read the latest cricket news, match updates, player analysis, and expert insights on the Crickzen blog.');
    this.setCanonicalUrl('/blog');
    
    this.setMetaTag('og:type', 'website');
    this.setMetaTag('twitter:card', 'summary_large_image');
  }

  /**
   * Set robots meta tag
   */
  setRobots(content: string): void {
    this.meta.updateTag({ name: 'robots', content });
  }

  /**
   * Set multiple Open Graph images
   */
  setOgImages(images: string[]): void {
    images.forEach(imageUrl => {
      this.meta.addTag({ property: 'og:image', content: imageUrl });
    });
  }

  /**
   * Generate NewsArticle JSON-LD structured data
   * 
   * Use this for cricket news and match analysis posts to improve
   * visibility in Google News and search results.
   */
  setNewsArticleJsonLd(article: {
    headline: string;
    description: string;
    imageUrl: string;
    datePublished: string;
    dateModified?: string;
    authorName?: string;
    section?: string;
    keywords?: string[];
  }): void {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      'headline': article.headline,
      'description': article.description,
      'image': article.imageUrl,
      'datePublished': article.datePublished,
      'dateModified': article.dateModified || article.datePublished,
      'author': {
        '@type': 'Organization',
        'name': article.authorName || 'Crickzen Editorial Team'
      },
      'publisher': {
        '@type': 'Organization',
        'name': 'Crickzen',
        'logo': {
          '@type': 'ImageObject',
          'url': `${this.getSiteUrl()}/assets/logo.png`,
          'width': 600,
          'height': 60
        }
      },
      'mainEntityOfPage': {
        '@type': 'WebPage',
        '@id': this.getCurrentUrl()
      },
      'articleSection': article.section || 'Cricket News',
      'keywords': article.keywords && article.keywords.join(', ') || ''
    };

    this.setJsonLd(jsonLd);
  }

  /**
   * Generate BlogPosting JSON-LD structured data
   * 
   * Use this for general blog posts and evergreen content.
   */
  setBlogPostingJsonLd(article: {
    headline: string;
    description: string;
    imageUrl: string;
    datePublished: string;
    dateModified?: string;
    authorName?: string;
    wordCount?: number;
    tags?: string[];
  }): void {
    const jsonLd: any = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      'headline': article.headline,
      'description': article.description,
      'image': article.imageUrl,
      'datePublished': article.datePublished,
      'dateModified': article.dateModified || article.datePublished,
      'author': {
        '@type': 'Person',
        'name': article.authorName || 'Crickzen Editorial Team'
      },
      'publisher': {
        '@type': 'Organization',
        'name': 'Crickzen',
        'logo': {
          '@type': 'ImageObject',
          'url': `${this.getSiteUrl()}/assets/logo.png`
        }
      },
      'mainEntityOfPage': {
        '@type': 'WebPage',
        '@id': this.getCurrentUrl()
      }
    };

    if (article.wordCount) {
      jsonLd.wordCount = article.wordCount;
    }

    if (article.tags && article.tags.length > 0) {
      jsonLd.keywords = article.tags.join(', ');
    }

    this.setJsonLd(jsonLd);
  }

  /**
   * Generate SportsEvent JSON-LD for live match coverage
   */
  setSportsEventJsonLd(event: {
    name: string;
    description: string;
    startDate: string;
    location?: string;
    homeTeam: string;
    awayTeam: string;
    eventStatus?: 'EventScheduled' | 'EventPostponed' | 'EventCancelled';
  }): void {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'SportsEvent',
      'name': event.name,
      'description': event.description,
      'startDate': event.startDate,
      'eventStatus': `https://schema.org/${event.eventStatus || 'EventScheduled'}`,
      'location': event.location ? {
        '@type': 'Place',
        'name': event.location
      } : undefined,
      'homeTeam': {
        '@type': 'SportsTeam',
        'name': event.homeTeam
      },
      'awayTeam': {
        '@type': 'SportsTeam',
        'name': event.awayTeam
      },
      'sport': 'Cricket'
    };

    this.setJsonLd(jsonLd);
  }

  /**
   * Get current page URL
   */
  private getCurrentUrl(): string {
    if (!this.isBrowser) {
      return '';
    }
    return window.location.href;
  }

  /**
   * Get site base URL
   */
  private getSiteUrl(): string {
    if (!this.isBrowser) {
      return 'https://yourdomain.com';
    }
    return window.location.origin;
  }
}
