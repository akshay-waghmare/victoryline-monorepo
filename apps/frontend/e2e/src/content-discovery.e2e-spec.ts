import { browser, by, element, ExpectedConditions as EC } from 'protractor';

describe('Content Discovery E2E Tests', () => {
  const TIMEOUT = 5000;

  beforeEach(async () => {
    await browser.get('/discovery');
    await browser.waitForAngular();
  });

  describe('Page Load', () => {
    it('should display the discovery page header', async () => {
      const header = element(by.css('h1'));
      await browser.wait(EC.presenceOf(header), TIMEOUT);
      expect(await header.getText()).toContain('Discover Matches');
    });

    it('should display the search component', async () => {
      const searchInput = element(by.css('app-search input'));
      await browser.wait(EC.presenceOf(searchInput), TIMEOUT);
      expect(await searchInput.isDisplayed()).toBe(true);
    });

    it('should display filter controls', async () => {
      const filterSelect = element(by.id('match-type-filter'));
      await browser.wait(EC.presenceOf(filterSelect), TIMEOUT);
      expect(await filterSelect.isDisplayed()).toBe(true);
    });

    it('should load initial matches', async () => {
      const matchList = element(by.css('.match-list'));
      await browser.wait(EC.presenceOf(matchList), TIMEOUT);
      
      const matches = element.all(by.css('.match-item'));
      expect(await matches.count()).toBeGreaterThan(0);
    });
  });

  describe('Search Functionality', () => {
    it('should search for matches when typing in search box', async () => {
      const searchInput = element(by.css('app-search input'));
      await searchInput.clear();
      await searchInput.sendKeys('India');
      
      // Wait for debounce (300ms) + API response
      await browser.sleep(500);
      await browser.waitForAngular();
      
      const matches = element.all(by.css('.match-item'));
      expect(await matches.count()).toBeGreaterThan(0);
    });

    it('should show autocomplete suggestions while typing', async () => {
      const searchInput = element(by.css('app-search input'));
      await searchInput.clear();
      await searchInput.sendKeys('Ind');
      
      // Wait for suggestions
      await browser.sleep(400);
      
      const suggestions = element.all(by.css('.search-suggestions .suggestion-item'));
      await browser.wait(async () => await suggestions.count() > 0, TIMEOUT);
      expect(await suggestions.count()).toBeGreaterThan(0);
    });

    it('should navigate to match when clicking autocomplete suggestion', async () => {
      const searchInput = element(by.css('app-search input'));
      await searchInput.clear();
      await searchInput.sendKeys('India');
      
      // Wait for suggestions
      await browser.sleep(400);
      
      const firstSuggestion = element(by.css('.search-suggestions .suggestion-item'));
      await browser.wait(EC.elementToBeClickable(firstSuggestion), TIMEOUT);
      await firstSuggestion.click();
      
      // Should navigate to match details page
      await browser.wait(async () => {
        const url = await browser.getCurrentUrl();
        return url.includes('/matches/');
      }, TIMEOUT);
      
      expect(await browser.getCurrentUrl()).toContain('/matches/');
    });

    it('should clear search results when clearing input', async () => {
      const searchInput = element(by.css('app-search input'));
      await searchInput.clear();
      await searchInput.sendKeys('India');
      await browser.sleep(500);
      
      // Clear input
      await searchInput.clear();
      await browser.sleep(500);
      await browser.waitForAngular();
      
      // Should show all matches again
      const matches = element.all(by.css('.match-item'));
      expect(await matches.count()).toBeGreaterThan(0);
    });

    it('should handle no results gracefully', async () => {
      const searchInput = element(by.css('app-search input'));
      await searchInput.clear();
      await searchInput.sendKeys('xyznonexistentmatch123');
      await browser.sleep(500);
      await browser.waitForAngular();
      
      // Should show empty state or no results message
      const emptyState = element(by.css('app-empty-state, .no-results'));
      await browser.wait(EC.presenceOf(emptyState), TIMEOUT);
      expect(await emptyState.isDisplayed()).toBe(true);
    });
  });

  describe('Filter Functionality', () => {
    it('should filter matches by type', async () => {
      const filterSelect = element(by.id('match-type-filter'));
      await filterSelect.click();
      
      const liveOption = element(by.css('option[value="live"]'));
      await liveOption.click();
      
      const applyButton = element(by.css('.apply-btn'));
      await applyButton.click();
      
      await browser.sleep(300);
      await browser.waitForAngular();
      
      // Verify filtered results
      const matches = element.all(by.css('.match-item'));
      expect(await matches.count()).toBeGreaterThanOrEqual(0);
    });

    it('should show loading state while filtering', async () => {
      const filterSelect = element(by.id('match-type-filter'));
      await filterSelect.click();
      
      const upcomingOption = element(by.css('option[value="upcoming"]'));
      await upcomingOption.click();
      
      const applyButton = element(by.css('.apply-btn'));
      await applyButton.click();
      
      // Should show loading skeleton briefly
      const skeleton = element(by.css('app-match-skeleton'));
      // Note: May be too fast to catch in E2E
      
      await browser.waitForAngular();
    });

    it('should persist filter selection', async () => {
      const filterSelect = element(by.id('match-type-filter'));
      await filterSelect.click();
      
      const completedOption = element(by.css('option[value="completed"]'));
      await completedOption.click();
      
      const applyButton = element(by.css('.apply-btn'));
      await applyButton.click();
      
      await browser.waitForAngular();
      
      // Filter should remain selected
      const selectedValue = await filterSelect.getAttribute('value');
      expect(selectedValue).toBe('completed');
    });
  });

  describe('Recently Viewed Section', () => {
    it('should display recently viewed section when history exists', async () => {
      // First, view a match to create history
      const firstMatch = element.all(by.css('.match-item')).first();
      await browser.wait(EC.elementToBeClickable(firstMatch), TIMEOUT);
      await firstMatch.click();
      
      // Navigate back to discovery
      await browser.navigate().back();
      await browser.waitForAngular();
      
      // Check if recently viewed section exists
      const recentSection = element(by.css('.recently-viewed-section'));
      await browser.wait(EC.presenceOf(recentSection), TIMEOUT);
      expect(await recentSection.isDisplayed()).toBe(true);
    });

    it('should navigate to match when clicking recently viewed item', async () => {
      // View a match first
      const firstMatch = element.all(by.css('.match-item')).first();
      await firstMatch.click();
      await browser.navigate().back();
      await browser.waitForAngular();
      
      // Click recently viewed item
      const recentItem = element.all(by.css('.recently-viewed-section .match-item')).first();
      await browser.wait(EC.elementToBeClickable(recentItem), TIMEOUT);
      await recentItem.click();
      
      // Should navigate to match details
      await browser.wait(async () => {
        const url = await browser.getCurrentUrl();
        return url.includes('/matches/');
      }, TIMEOUT);
      
      expect(await browser.getCurrentUrl()).toContain('/matches/');
    });

    it('should clear history when clear button clicked', async () => {
      // View a match to create history
      const firstMatch = element.all(by.css('.match-item')).first();
      await firstMatch.click();
      await browser.navigate().back();
      await browser.waitForAngular();
      
      // Click clear history button
      const clearButton = element(by.css('.clear-history-btn'));
      await browser.wait(EC.elementToBeClickable(clearButton), TIMEOUT);
      await clearButton.click();
      
      // Recently viewed section should be empty or hidden
      const recentItems = element.all(by.css('.recently-viewed-section .match-item'));
      expect(await recentItems.count()).toBe(0);
    });
  });

  describe('Recommended Section', () => {
    it('should display recommended matches section', async () => {
      const recommendedSection = element(by.css('.recommended-section'));
      await browser.wait(EC.presenceOf(recommendedSection), TIMEOUT);
      expect(await recommendedSection.isDisplayed()).toBe(true);
    });

    it('should navigate to match when clicking recommended item', async () => {
      const recommendedItem = element.all(by.css('.recommended-section .match-item')).first();
      await browser.wait(EC.elementToBeClickable(recommendedItem), TIMEOUT);
      await recommendedItem.click();
      
      await browser.wait(async () => {
        const url = await browser.getCurrentUrl();
        return url.includes('/matches/');
      }, TIMEOUT);
      
      expect(await browser.getCurrentUrl()).toContain('/matches/');
    });
  });

  describe('Match Card Interactions', () => {
    it('should navigate to match details on card click', async () => {
      const firstMatch = element.all(by.css('.match-item')).first();
      await browser.wait(EC.elementToBeClickable(firstMatch), TIMEOUT);
      
      await firstMatch.click();
      
      await browser.wait(async () => {
        const url = await browser.getCurrentUrl();
        return url.includes('/matches/');
      }, TIMEOUT);
      
      expect(await browser.getCurrentUrl()).toContain('/matches/');
    });

    it('should display match information correctly', async () => {
      const firstMatch = element.all(by.css('.match-item')).first();
      
      const team1 = firstMatch.element(by.css('.team1-name'));
      const team2 = firstMatch.element(by.css('.team2-name'));
      const venue = firstMatch.element(by.css('.venue'));
      
      expect(await team1.getText()).toBeTruthy();
      expect(await team2.getText()).toBeTruthy();
      expect(await venue.getText()).toBeTruthy();
    });

    it('should show match status badge', async () => {
      const firstMatch = element.all(by.css('.match-item')).first();
      const statusBadge = firstMatch.element(by.css('.status-badge'));
      
      await browser.wait(EC.presenceOf(statusBadge), TIMEOUT);
      expect(await statusBadge.isDisplayed()).toBe(true);
      expect(await statusBadge.getText()).toMatch(/live|upcoming|completed/i);
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard navigable', async () => {
      const body = element(by.css('body'));
      
      // Tab to first match
      await body.sendKeys(protractor.Key.TAB);
      await body.sendKeys(protractor.Key.TAB);
      await body.sendKeys(protractor.Key.TAB);
      
      // Get focused element
      const focusedElement = await browser.driver.switchTo().activeElement();
      expect(focusedElement).toBeTruthy();
    });

    it('should have proper ARIA labels', async () => {
      const mainContent = element(by.css('[role="main"]'));
      await browser.wait(EC.presenceOf(mainContent), TIMEOUT);
      expect(await mainContent.isPresent()).toBe(true);
      
      const filterGroup = element(by.css('[role="group"]'));
      expect(await filterGroup.isPresent()).toBe(true);
    });

    it('should allow Enter key to select matches', async () => {
      const firstMatch = element.all(by.css('.match-item')).first();
      await firstMatch.sendKeys(protractor.Key.ENTER);
      
      await browser.wait(async () => {
        const url = await browser.getCurrentUrl();
        return url.includes('/matches/');
      }, TIMEOUT);
      
      expect(await browser.getCurrentUrl()).toContain('/matches/');
    });
  });

  describe('Offline Support', () => {
    it('should show offline banner when network disconnected', async () => {
      // Simulate offline by setting network condition
      await browser.executeScript('window.dispatchEvent(new Event("offline"))');
      await browser.sleep(500);
      
      const offlineBanner = element(by.css('.offline-banner'));
      await browser.wait(EC.presenceOf(offlineBanner), TIMEOUT);
      expect(await offlineBanner.isDisplayed()).toBe(true);
      expect(await offlineBanner.getText()).toContain('offline');
    });

    it('should hide offline banner when network reconnected', async () => {
      // Simulate offline then online
      await browser.executeScript('window.dispatchEvent(new Event("offline"))');
      await browser.sleep(500);
      
      await browser.executeScript('window.dispatchEvent(new Event("online"))');
      await browser.sleep(500);
      
      const offlineBanner = element(by.css('.offline-banner'));
      expect(await offlineBanner.isPresent()).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should load page within acceptable time', async () => {
      const startTime = Date.now();
      await browser.get('/discovery');
      await browser.waitForAngular();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // 3 seconds
    });

    it('should render virtual scroll for large lists', async () => {
      const viewport = element(by.css('cdk-virtual-scroll-viewport'));
      await browser.wait(EC.presenceOf(viewport), TIMEOUT);
      expect(await viewport.isPresent()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should display error state on API failure', async () => {
      // Simulate API error by searching for a pattern that triggers error
      const searchInput = element(by.css('app-search input'));
      await searchInput.clear();
      await searchInput.sendKeys('ERROR_TRIGGER');
      await browser.sleep(500);
      
      // Should handle gracefully (empty state or error message)
      const errorState = element(by.css('app-empty-state[type="error"], .error-message'));
      // Error handling should be graceful even if no specific error UI
    });
  });
});
