import { browser, by, element, ElementFinder, ExpectedConditions as EC } from 'protractor';

/**
 * Page Object for Content Discovery page
 * Encapsulates element selectors and common actions
 */
export class ContentDiscoveryPage {
  private readonly TIMEOUT = 5000;

  // Navigation
  async navigateTo(): Promise<void> {
    await browser.get('/discovery');
    await browser.waitForAngular();
  }

  async getCurrentUrl(): Promise<string> {
    return await browser.getCurrentUrl();
  }

  // Header elements
  getPageHeader(): ElementFinder {
    return element(by.css('h1'));
  }

  async getPageTitle(): Promise<string> {
    const header = this.getPageHeader();
    await browser.wait(EC.presenceOf(header), this.TIMEOUT);
    return await header.getText();
  }

  // Search elements
  getSearchInput(): ElementFinder {
    return element(by.css('app-search input'));
  }

  getSuggestionsList(): ElementFinder {
    return element(by.css('.search-suggestions'));
  }

  getAllSuggestions() {
    return element.all(by.css('.search-suggestions .suggestion-item'));
  }

  async searchFor(query: string): Promise<void> {
    const searchInput = this.getSearchInput();
    await searchInput.clear();
    await searchInput.sendKeys(query);
    await browser.sleep(500); // Wait for debounce + API
    await browser.waitForAngular();
  }

  async selectFirstSuggestion(): Promise<void> {
    await browser.sleep(400); // Wait for suggestions
    const firstSuggestion = element(by.css('.search-suggestions .suggestion-item'));
    await browser.wait(EC.elementToBeClickable(firstSuggestion), this.TIMEOUT);
    await firstSuggestion.click();
  }

  // Filter elements
  getFilterSelect(): ElementFinder {
    return element(by.id('match-type-filter'));
  }

  getApplyFiltersButton(): ElementFinder {
    return element(by.css('.apply-btn'));
  }

  async selectFilter(filterValue: string): Promise<void> {
    const filterSelect = this.getFilterSelect();
    await filterSelect.click();
    
    const option = element(by.css(`option[value="${filterValue}"]`));
    await option.click();
  }

  async applyFilters(): Promise<void> {
    const applyButton = this.getApplyFiltersButton();
    await applyButton.click();
    await browser.sleep(300);
    await browser.waitForAngular();
  }

  async filterByType(filterType: 'all' | 'live' | 'upcoming' | 'completed'): Promise<void> {
    await this.selectFilter(filterType);
    await this.applyFilters();
  }

  // Match list elements
  getAllMatches() {
    return element.all(by.css('.match-item'));
  }

  async getMatchCount(): Promise<number> {
    return await this.getAllMatches().count();
  }

  getFirstMatch(): ElementFinder {
    return this.getAllMatches().first();
  }

  async clickFirstMatch(): Promise<void> {
    const firstMatch = this.getFirstMatch();
    await browser.wait(EC.elementToBeClickable(firstMatch), this.TIMEOUT);
    await firstMatch.click();
  }

  async getMatchTeamNames(matchElement: ElementFinder): Promise<{ team1: string; team2: string }> {
    const team1 = await matchElement.element(by.css('.team1-name')).getText();
    const team2 = await matchElement.element(by.css('.team2-name')).getText();
    return { team1, team2 };
  }

  async getMatchStatus(matchElement: ElementFinder): Promise<string> {
    const statusBadge = matchElement.element(by.css('.status-badge'));
    return await statusBadge.getText();
  }

  // Recently viewed section
  getRecentlyViewedSection(): ElementFinder {
    return element(by.css('.recently-viewed-section'));
  }

  getRecentlyViewedMatches() {
    return element.all(by.css('.recently-viewed-section .match-item'));
  }

  async getRecentlyViewedCount(): Promise<number> {
    return await this.getRecentlyViewedMatches().count();
  }

  getClearHistoryButton(): ElementFinder {
    return element(by.css('.clear-history-btn'));
  }

  async clearHistory(): Promise<void> {
    const clearButton = this.getClearHistoryButton();
    await browser.wait(EC.elementToBeClickable(clearButton), this.TIMEOUT);
    await clearButton.click();
    await browser.waitForAngular();
  }

  async clickFirstRecentlyViewed(): Promise<void> {
    const firstRecent = this.getRecentlyViewedMatches().first();
    await browser.wait(EC.elementToBeClickable(firstRecent), this.TIMEOUT);
    await firstRecent.click();
  }

  // Recommended section
  getRecommendedSection(): ElementFinder {
    return element(by.css('.recommended-section'));
  }

  getRecommendedMatches() {
    return element.all(by.css('.recommended-section .match-item'));
  }

  async getRecommendedCount(): Promise<number> {
    return await this.getRecommendedMatches().count();
  }

  async clickFirstRecommended(): Promise<void> {
    const firstRecommended = this.getRecommendedMatches().first();
    await browser.wait(EC.elementToBeClickable(firstRecommended), this.TIMEOUT);
    await firstRecommended.click();
  }

  // Loading state
  getLoadingSkeleton(): ElementFinder {
    return element(by.css('app-match-skeleton'));
  }

  async isLoading(): Promise<boolean> {
    return await this.getLoadingSkeleton().isPresent();
  }

  // Empty state
  getEmptyState(): ElementFinder {
    return element(by.css('app-empty-state'));
  }

  async hasEmptyState(): Promise<boolean> {
    return await this.getEmptyState().isPresent();
  }

  async getEmptyStateMessage(): Promise<string> {
    const emptyState = this.getEmptyState();
    await browser.wait(EC.presenceOf(emptyState), this.TIMEOUT);
    return await emptyState.getText();
  }

  // Offline/online banners
  getOfflineBanner(): ElementFinder {
    return element(by.css('.offline-banner'));
  }

  getCachedDataBanner(): ElementFinder {
    return element(by.css('.cached-banner'));
  }

  async isOfflineBannerVisible(): Promise<boolean> {
    const banner = this.getOfflineBanner();
    return await banner.isPresent() && await banner.isDisplayed();
  }

  async isCachedBannerVisible(): Promise<boolean> {
    const banner = this.getCachedDataBanner();
    return await banner.isPresent() && await banner.isDisplayed();
  }

  // Accessibility helpers
  getMainContent(): ElementFinder {
    return element(by.css('[role="main"]'));
  }

  getFilterGroup(): ElementFinder {
    return element(by.css('[role="group"]'));
  }

  async hasProperARIA(): Promise<boolean> {
    const mainPresent = await this.getMainContent().isPresent();
    const filterGroupPresent = await this.getFilterGroup().isPresent();
    return mainPresent && filterGroupPresent;
  }

  // Performance helpers
  getVirtualScrollViewport(): ElementFinder {
    return element(by.css('cdk-virtual-scroll-viewport'));
  }

  async hasVirtualScroll(): Promise<boolean> {
    return await this.getVirtualScrollViewport().isPresent();
  }

  // Utility methods
  async waitForMatches(): Promise<void> {
    const matchList = element(by.css('.match-list'));
    await browser.wait(EC.presenceOf(matchList), this.TIMEOUT);
  }

  async waitForUrl(urlPattern: string): Promise<void> {
    await browser.wait(async () => {
      const url = await this.getCurrentUrl();
      return url.includes(urlPattern);
    }, this.TIMEOUT);
  }

  async simulateOffline(): Promise<void> {
    await browser.executeScript('window.dispatchEvent(new Event("offline"))');
    await browser.sleep(500);
  }

  async simulateOnline(): Promise<void> {
    await browser.executeScript('window.dispatchEvent(new Event("online"))');
    await browser.sleep(500);
  }

  async sendKeyboardAction(key: string): Promise<void> {
    const body = element(by.css('body'));
    await body.sendKeys(key);
  }
}
