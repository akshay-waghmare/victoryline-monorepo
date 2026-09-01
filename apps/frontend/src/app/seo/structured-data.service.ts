import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

export type JsonLd = Record<string, any>;

export interface StructuredDataLocationInput {
  name: string;
  address?: string | {
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry?: string;
  };
}

export interface ArticleStructuredDataInput {
  headline: string;
  description: string;
  url: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  authorName?: string;
  articleSection?: string;
  keywords?: string[];
  isAccessibleForFree?: boolean;
}

export interface LiveBlogUpdateStructuredDataInput {
  headline: string;
  url: string;
  datePublished: string;
  articleBody?: string;
}

export interface LiveBlogPostingStructuredDataInput extends ArticleStructuredDataInput {
  coverageStartTime?: string;
  coverageEndTime?: string;
  liveBlogUpdates: LiveBlogUpdateStructuredDataInput[];
  about?: JsonLd;
}

export interface StructuredDataLinkItem {
  name: string;
  url: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class StructuredDataService {
  constructor(@Inject(DOCUMENT) private document: any) {}

  sportsEvent(input: {
    name: string;
    url: string;
    homeTeam: string;
    awayTeam: string;
    startDate?: string; // ISO 8601
    endDate?: string; // ISO 8601
    description?: string;
    location?: string | StructuredDataLocationInput;
    status?: 'Scheduled' | 'LiveEvent' | 'EventCompleted';
    offersUrl?: string;
    image?: string;
    organizerName?: string;
    organizerUrl?: string;
  }): JsonLd {
    return this.cleanObject({
      '@context': 'https://schema.org',
      '@type': 'SportsEvent',
      name: input.name,
      url: input.url,
      description: input.description,
      sport: 'Cricket',
      startDate: input.startDate,
      endDate: input.endDate,
      eventStatus: this.toEventStatusUrl(input.status || 'Scheduled'),
      location: this.buildLocation(input.location),
      offers: input.offersUrl ? { '@type': 'Offer', url: input.offersUrl } : undefined,
      image: input.image ? [input.image] : undefined,
      organizer: input.organizerName ? this.cleanObject({
        '@type': 'Organization',
        name: input.organizerName,
        url: input.organizerUrl
      }) : undefined,
      homeTeam: { '@type': 'SportsTeam', name: input.homeTeam },
      awayTeam: { '@type': 'SportsTeam', name: input.awayTeam },
      competitor: [
        { '@type': 'SportsTeam', name: input.homeTeam },
        { '@type': 'SportsTeam', name: input.awayTeam }
      ]
    });
  }

  article(input: ArticleStructuredDataInput): JsonLd {
    return this.buildArticleSchema('Article', input);
  }

  newsArticle(input: ArticleStructuredDataInput): JsonLd {
    return this.buildArticleSchema('NewsArticle', input);
  }

  liveBlogPosting(input: LiveBlogPostingStructuredDataInput): JsonLd {
    return this.cleanObject({
      '@context': 'https://schema.org',
      '@type': 'LiveBlogPosting',
      headline: input.headline,
      description: input.description,
      image: input.image ? [input.image] : undefined,
      datePublished: input.datePublished,
      dateModified: input.dateModified || input.datePublished,
      coverageStartTime: input.coverageStartTime || input.datePublished,
      coverageEndTime: input.coverageEndTime || input.dateModified || input.datePublished,
      articleSection: input.articleSection,
      keywords: input.keywords,
      isAccessibleForFree: input.isAccessibleForFree !== false,
      author: {
        '@type': 'Organization',
        name: input.authorName || 'CrickZen'
      },
      publisher: {
        '@type': 'Organization',
        name: 'CrickZen',
        logo: {
          '@type': 'ImageObject',
          url: 'https://www.crickzen.com/assets/icons/icon-512x512.png'
        }
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': input.url
      },
      about: input.about,
      liveBlogUpdate: (input.liveBlogUpdates || []).map((entry) => this.cleanObject({
        '@type': 'BlogPosting',
        headline: entry.headline,
        url: entry.url,
        datePublished: entry.datePublished,
        articleBody: entry.articleBody
      }))
    });
  }

  organization(input: {
    name: string;
    url: string;
    logoUrl?: string;
    description?: string;
    sameAs?: string[];
  }): JsonLd {
    return this.cleanObject({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: input.name,
      url: input.url,
      description: input.description,
      logo: input.logoUrl ? {
        '@type': 'ImageObject',
        url: input.logoUrl
      } : undefined,
      sameAs: input.sameAs
    });
  }

  website(input: {
    name: string;
    url: string;
    alternateName?: string | string[];
    description?: string;
  }): JsonLd {
    return this.cleanObject({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: input.name,
      alternateName: input.alternateName,
      url: input.url,
      description: input.description
    });
  }

  team(input: { name: string; logoUrl?: string }): JsonLd {
    return this.cleanObject({
      '@context': 'https://schema.org',
      '@type': 'SportsTeam',
      name: input.name,
      logo: input.logoUrl,
    });
  }

  person(input: { name: string; affiliation?: string; image?: string }): JsonLd {
    return this.cleanObject({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: input.name,
      affiliation: input.affiliation
        ? { '@type': 'Organization', name: input.affiliation }
        : undefined,
      image: input.image,
    });
  }

  breadcrumbs(items: Array<{ name: string; url: string }>): JsonLd {
    return this.cleanObject({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((it, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: it.name,
        item: it.url,
      })),
    });
  }

  page(input: {
    name: string;
    description: string;
    url: string;
    type?: 'WebPage' | 'CollectionPage';
  }): JsonLd {
    return this.cleanObject({
      '@context': 'https://schema.org',
      '@type': input.type || 'WebPage',
      name: input.name,
      description: input.description,
      url: input.url,
      isPartOf: {
        '@type': 'WebSite',
        name: 'CrickZen',
        url: 'https://www.crickzen.com/'
      }
    });
  }

  itemList(input: {
    name: string;
    url?: string;
    description?: string;
    items: StructuredDataLinkItem[];
  }): JsonLd {
    return this.cleanObject({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: input.name,
      url: input.url,
      description: input.description,
      numberOfItems: input.items ? input.items.length : 0,
      itemListElement: (input.items || []).map((item, index) => this.cleanObject({
        '@type': 'ListItem',
        position: index + 1,
        url: item.url,
        item: this.cleanObject({
          '@type': 'WebPage',
          name: item.name,
          url: item.url,
          description: item.description
        })
      }))
    });
  }

  faqPage(items: Array<{ question: string; answer: string }>): JsonLd {
    return this.cleanObject({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: (items || []).map((item) => this.cleanObject({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer
        }
      }))
    });
  }

  setPageSchemas(items: JsonLd[]): void {
    if (!this.document || !this.document.head) {
      return;
    }

    this.clearPageSchemas();

    items.forEach((item) => {
      const script = this.document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('data-schema', 'crickzen-jsonld');
      script.text = JSON.stringify(item);
      this.document.head.appendChild(script);
    });
  }

  clearPageSchemas(): void {
    if (!this.document || !this.document.head) {
      return;
    }

    const nodes = this.document.head.querySelectorAll('script[data-schema="crickzen-jsonld"]');
    Array.prototype.forEach.call(nodes, (node) => {
      if (node && node.parentNode) {
        node.parentNode.removeChild(node);
      }
    });
  }

  setGlobalSchemas(items: JsonLd[]): void {
    if (!this.document || !this.document.head) {
      return;
    }

    this.clearGlobalSchemas();

    items.forEach((item) => {
      const script = this.document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('data-global-schema', 'crickzen-jsonld');
      script.text = JSON.stringify(item);
      this.document.head.appendChild(script);
    });
  }

  clearGlobalSchemas(): void {
    if (!this.document || !this.document.head) {
      return;
    }

    const nodes = this.document.head.querySelectorAll('script[data-global-schema="crickzen-jsonld"]');
    Array.prototype.forEach.call(nodes, (node) => {
      if (node && node.parentNode) {
        node.parentNode.removeChild(node);
      }
    });
  }

  getPageSchemas(): JsonLd[] {
    if (!this.document || !this.document.head) {
      return [];
    }

    const nodes = this.document.head.querySelectorAll('script[data-schema="crickzen-jsonld"]');
    const items: JsonLd[] = [];
    Array.prototype.forEach.call(nodes, (node) => {
      if (node && node.text) {
        try {
          items.push(JSON.parse(node.text));
        } catch (e) {
          // Ignore unparseable script nodes
        }
      }
    });
    return items;
  }

  private buildArticleSchema(type: 'Article' | 'NewsArticle', input: ArticleStructuredDataInput): JsonLd {
    return this.cleanObject({
      '@context': 'https://schema.org',
      '@type': type,
      headline: input.headline,
      description: input.description,
      image: input.image ? [input.image] : undefined,
      datePublished: input.datePublished,
      dateModified: input.dateModified || input.datePublished,
      articleSection: input.articleSection,
      keywords: input.keywords,
      isAccessibleForFree: input.isAccessibleForFree !== false,
      author: {
        '@type': 'Organization',
        name: input.authorName || 'CrickZen'
      },
      publisher: {
        '@type': 'Organization',
        name: 'CrickZen',
        logo: {
          '@type': 'ImageObject',
          url: 'https://www.crickzen.com/assets/icons/icon-512x512.png'
        }
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': input.url
      }
    });
  }

  private toEventStatusUrl(status: 'Scheduled' | 'LiveEvent' | 'EventCompleted'): string {
    switch (status) {
      case 'LiveEvent':
        return 'https://schema.org/EventInProgress';
      case 'EventCompleted':
        return 'https://schema.org/EventCompleted';
      default:
        return 'https://schema.org/EventScheduled';
    }
  }

  private buildLocation(location?: string | StructuredDataLocationInput): any {
    if (!location) {
      return undefined;
    }

    if (typeof location === 'string') {
      return this.cleanObject({
        '@type': 'Place',
        name: location
      });
    }

    if (!location.name) {
      return undefined;
    }

    return this.cleanObject({
      '@type': 'Place',
      name: location.name,
      address: location.address && typeof location.address === 'object'
        ? Object.assign({ '@type': 'PostalAddress' }, location.address)
        : location.address
    });
  }

  private cleanObject(value: any): any {
    if (Array.isArray(value)) {
      return value
        .map((item) => this.cleanObject(item))
        .filter((item) => item !== undefined && item !== null && item !== '');
    }

    if (value && typeof value === 'object') {
      const cleaned: any = {};
      Object.keys(value).forEach((key) => {
        const nextValue = this.cleanObject(value[key]);
        if (nextValue === undefined || nextValue === null || nextValue === '') {
          return;
        }
        if (Array.isArray(nextValue) && nextValue.length === 0) {
          return;
        }
        cleaned[key] = nextValue;
      });
      return cleaned;
    }

    return value;
  }
}
