import { Injectable } from '@angular/core';

export type JsonLd = Record<string, any>;

@Injectable({ providedIn: 'root' })
export class StructuredDataService {
  sportsEvent(input: {
    name: string;
    startDate: string; // ISO 8601
    homeTeam: string;
    awayTeam: string;
    location?: string;
    status?: 'Scheduled' | 'LiveEvent' | 'EventCompleted';
    offersUrl?: string;
  }): JsonLd {
    return {
      '@context': 'https://schema.org',
      '@type': 'SportsEvent',
      name: input.name,
      startDate: input.startDate,
      eventStatus: input.status || 'Scheduled',
      location: input.location ? { '@type': 'Place', name: input.location } : undefined,
      offers: input.offersUrl ? { '@type': 'Offer', url: input.offersUrl } : undefined,
      homeTeam: { '@type': 'SportsTeam', name: input.homeTeam },
      awayTeam: { '@type': 'SportsTeam', name: input.awayTeam },
    };
  }

  team(input: { name: string; logoUrl?: string }): JsonLd {
    return {
      '@context': 'https://schema.org',
      '@type': 'SportsTeam',
      name: input.name,
      logo: input.logoUrl,
    };
  }

  person(input: { name: string; affiliation?: string; image?: string }): JsonLd {
    return {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: input.name,
      affiliation: input.affiliation
        ? { '@type': 'Organization', name: input.affiliation }
        : undefined,
      image: input.image,
    };
  }

  breadcrumbs(items: Array<{ name: string; url: string }>): JsonLd {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((it, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: it.name,
        item: it.url,
      })),
    };
  }
}
