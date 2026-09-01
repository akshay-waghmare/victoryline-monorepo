import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';

import { StructuredDataService } from './structured-data.service';

describe('StructuredDataService', () => {
  let service: StructuredDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        StructuredDataService,
        { provide: DOCUMENT, useValue: document }
      ]
    });

    service = TestBed.get(StructuredDataService);
  });

  it('includes richer event fields when provided', () => {
    const event = service.sportsEvent({
      name: 'Texas Super Kings vs Seattle Orcas Live Score Today',
      url: 'https://www.crickzen.com/cric-live/example',
      description: 'Live score and match updates.',
      homeTeam: 'Texas Super Kings',
      awayTeam: 'Seattle Orcas',
      startDate: '2026-06-19T00:30:00.000Z',
      location: {
        name: 'Grand Prairie Cricket Stadium, Dallas',
        address: {
          addressLocality: 'Dallas',
          addressRegion: 'Texas',
          addressCountry: 'US'
        }
      },
      status: 'Scheduled',
      offersUrl: 'https://www.crickzen.com/cric-live/example',
      image: 'https://www.crickzen.com/assets/og/crickzen-default-1200x630.jpg',
      organizerName: 'CrickZen',
      organizerUrl: 'https://www.crickzen.com'
    });

    expect(event.startDate).toBe('2026-06-19T00:30:00.000Z');
    expect(event.location.address.addressLocality).toBe('Dallas');
    expect(event.organizer.name).toBe('CrickZen');
    expect(event.offers.url).toBe('https://www.crickzen.com/cric-live/example');
    expect(event.image).toEqual(['https://www.crickzen.com/assets/og/crickzen-default-1200x630.jpg']);
  });

  it('builds NewsArticle and LiveBlogPosting schemas for freshness pages', () => {
    const newsArticle = service.newsArticle({
      headline: 'TSK vs SO Live Updates',
      description: 'Rolling match-day updates and key moments.',
      url: 'https://www.crickzen.com/cricket-live-updates/example',
      datePublished: '2026-06-28T10:00:00.000Z',
      dateModified: '2026-06-28T10:15:00.000Z',
      articleSection: 'Live match updates',
      keywords: ['tsk vs so live updates', 'today match updates']
    });

    const liveBlog = service.liveBlogPosting({
      headline: 'TSK vs SO Live Updates',
      description: 'Rolling match-day updates and key moments.',
      url: 'https://www.crickzen.com/cricket-live-updates/example',
      datePublished: '2026-06-28T10:00:00.000Z',
      dateModified: '2026-06-28T10:15:00.000Z',
      articleSection: 'Live match updates',
      keywords: ['tsk vs so live updates'],
      liveBlogUpdates: [
        {
          headline: 'Wicket moment',
          url: 'https://www.crickzen.com/cricket-live-updates/example#update-1',
          datePublished: '2026-06-28T10:12:00.000Z',
          articleBody: 'A wicket changes the chase.'
        }
      ]
    });

    expect(newsArticle['@type']).toBe('NewsArticle');
    expect(newsArticle.articleSection).toBe('Live match updates');
    expect(newsArticle.keywords).toEqual(['tsk vs so live updates', 'today match updates']);
    expect(liveBlog['@type']).toBe('LiveBlogPosting');
    expect(liveBlog.liveBlogUpdate.length).toBe(1);
    expect(liveBlog.liveBlogUpdate[0].headline).toBe('Wicket moment');
  });

  it('builds Organization schema for global trust markup', () => {
    const organization = service.organization({
      name: 'CrickZen',
      url: 'https://www.crickzen.com/',
      logoUrl: 'https://www.crickzen.com/assets/img/logos/crickzen-circular-logo-512.png',
      description: 'Live cricket coverage',
      sameAs: ['https://social.example.test/crickzen']
    });

    expect(organization['@type']).toBe('Organization');
    expect(organization.name).toBe('CrickZen');
    expect(organization.logo.url).toContain('crickzen-circular-logo-512.png');
  });

  it('builds the canonical homepage WebSite identity', () => {
    const website = service.website({
      name: 'CrickZen',
      alternateName: 'crickzen.com',
      url: 'https://www.crickzen.com/',
      description: 'Live cricket scores and match intelligence from CrickZen.'
    });

    expect(website['@type']).toBe('WebSite');
    expect(website.name).toBe('CrickZen');
    expect(website.alternateName).toBe('crickzen.com');
    expect(website.url).toBe('https://www.crickzen.com/');
    expect(website.description).toContain('CrickZen');
  });

  it('emits one first-class Website schema when page schemas are replaced', () => {
    service.setPageSchemas([
      service.website({
        name: 'CrickZen',
        alternateName: 'crickzen.com',
        url: 'https://www.crickzen.com/'
      })
    ]);

    service.setPageSchemas([
      service.website({
        name: 'CrickZen',
        alternateName: 'crickzen.com',
        url: 'https://www.crickzen.com/'
      })
    ]);

    const scripts = document.head.querySelectorAll('script[data-schema="crickzen-jsonld"]');
    const websites = Array.prototype.filter.call(scripts, (node: any) => {
      try {
        return JSON.parse(node.text)['@type'] === 'WebSite';
      } catch (_) {
        return false;
      }
    });

    expect(websites.length).toBe(1);
  });
});
