import { HomeComponent } from './home.component';

describe('HomeComponent brand schema', () => {
  it('starts homepage schemas with one Website and one Organization identity', () => {
    var captured: any[] = [];
    var component = Object.create(HomeComponent.prototype) as HomeComponent;

    component.liveDiscoveryMatches = [];
    component.upcomingDiscoveryMatches = [];
    component.recentDiscoveryMatches = [];
    component.discoveryMatches = [];
    (component as any).structuredDataService = {
      website: function(input: any) { return Object.assign({ '@type': 'WebSite' }, input); },
      organization: function(input: any) { return Object.assign({ '@type': 'Organization' }, input); },
      page: function(input: any) { return Object.assign({ '@type': 'WebPage' }, input); },
      itemList: function(input: any) { return Object.assign({ '@type': 'ItemList' }, input); },
      setPageSchemas: function(items: any[]) { captured = items; }
    };

    (component as any).updateStructuredData();

    expect(captured[0]['@type']).toBe('WebSite');
    expect(captured[0].name).toBe('CrickZen');
    expect(captured[0].alternateName).toBe('crickzen.com');
    expect(captured[0].url).toBe('https://www.crickzen.com/');
    expect(captured[1]['@type']).toBe('Organization');
    expect(captured[1].name).toBe('CrickZen');
    expect(captured[1].logoUrl).toContain('crickzen-circular-logo-512.png');
    expect(captured.filter(function(item) { return item['@type'] === 'WebSite'; }).length).toBe(1);
  });
});
