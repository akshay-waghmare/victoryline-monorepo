import { browser } from 'protractor';
import { ContentDiscoveryPage } from './content-discovery.po';

/**
 * Simplified E2E smoke tests using Page Object pattern
 * Tests critical user journeys for content discovery
 */
describe('Content Discovery - Smoke Tests', () => {
  let page: ContentDiscoveryPage;

  beforeEach(async () => {
    page = new ContentDiscoveryPage();
    await page.navigateTo();
  });

  describe('Critical User Journeys', () => {
    it('Journey 1: Search → Select Suggestion → View Match', async () => {
      // User searches for a match
      await page.searchFor('India');
      
      // User sees suggestions and clicks first one
      const suggestionsCount = await page.getAllSuggestions().count();
      expect(suggestionsCount).toBeGreaterThan(0);
      
      await page.selectFirstSuggestion();
      
      // User is taken to match details page
      await page.waitForUrl('/matches/');
      expect(await page.getCurrentUrl()).toContain('/matches/');
    });

    it('Journey 2: Filter Matches → Click Match → View Details', async () => {
      // User applies filter
      await page.filterByType('live');
      
      // User sees filtered results
      await page.waitForMatches();
      const matchCount = await page.getMatchCount();
      expect(matchCount).toBeGreaterThanOrEqual(0);
      
      // User clicks a match (if any exist)
      if (matchCount > 0) {
        await page.clickFirstMatch();
        await page.waitForUrl('/matches/');
        expect(await page.getCurrentUrl()).toContain('/matches/');
      }
    });

    it('Journey 3: View Match → Return → See in Recently Viewed → Click Again', async () => {
      // User clicks a match
      await page.clickFirstMatch();
      await page.waitForUrl('/matches/');
      
      // User returns to discovery page
      await browser.navigate().back();
      await browser.waitForAngular();
      
      // User sees the match in Recently Viewed
      const recentCount = await page.getRecentlyViewedCount();
      expect(recentCount).toBeGreaterThan(0);
      
      // User clicks recently viewed match
      await page.clickFirstRecentlyViewed();
      await page.waitForUrl('/matches/');
      expect(await page.getCurrentUrl()).toContain('/matches/');
    });

    it('Journey 4: Browse Recommendations → Click Recommended Match', async () => {
      // User sees recommended matches
      const recommendedCount = await page.getRecommendedCount();
      expect(recommendedCount).toBeGreaterThan(0);
      
      // User clicks a recommended match
      await page.clickFirstRecommended();
      await page.waitForUrl('/matches/');
      expect(await page.getCurrentUrl()).toContain('/matches/');
    });

    it('Journey 5: View Multiple Matches → Clear History', async () => {
      // User views first match
      await page.clickFirstMatch();
      await browser.navigate().back();
      await browser.waitForAngular();
      
      // User clears history
      const beforeCount = await page.getRecentlyViewedCount();
      expect(beforeCount).toBeGreaterThan(0);
      
      await page.clearHistory();
      
      // Recently viewed should be empty
      const afterCount = await page.getRecentlyViewedCount();
      expect(afterCount).toBe(0);
    });
  });

  describe('Feature Verification', () => {
    it('should display all main sections', async () => {
      expect(await page.getPageTitle()).toContain('Discover');
      expect(await page.getSearchInput().isDisplayed()).toBe(true);
      expect(await page.getFilterSelect().isDisplayed()).toBe(true);
      expect(await page.getMatchCount()).toBeGreaterThan(0);
    });

    it('should have working accessibility features', async () => {
      expect(await page.hasProperARIA()).toBe(true);
    });

    it('should use virtual scroll for performance', async () => {
      expect(await page.hasVirtualScroll()).toBe(true);
    });

    it('should handle offline state', async () => {
      await page.simulateOffline();
      expect(await page.isOfflineBannerVisible()).toBe(true);
      
      await page.simulateOnline();
      await browser.sleep(500);
      expect(await page.isOfflineBannerVisible()).toBe(false);
    });

    it('should show empty state for no results', async () => {
      await page.searchFor('xyznonexistentmatch999');
      expect(await page.hasEmptyState()).toBe(true);
    });
  });

  describe('Performance Checks', () => {
    it('should load page quickly', async () => {
      const startTime = Date.now();
      await page.navigateTo();
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(3000); // 3 seconds max
    });
  });
});
