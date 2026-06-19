import { Injectable } from '@angular/core';
import { extractMatchRouteSuffix, extractSlugFromUrl, normalizeMatchRoutePath } from '../core/utils/match-utils';
import { buildBaseMatchCanonicalPath, createMatchRouteIntent, deriveMatchLifecycleState, evaluateMatchCanonicalPolicy, MatchRouteSurface } from './match-canonical-policy';
import { MatchSeoViewModel } from './match-seo.models';
import { getOgImageForMatch } from './og-images';

interface SlugParts {
  team1: string;
  team2: string;
  series: string;
}

@Injectable({ providedIn: 'root' })
export class MatchSeoService {
  private readonly host = 'https://www.crickzen.com';

  build(input: {
    routeSlug: string;
    requestedPath?: string;
    matchUrl?: string;
    matchInfo?: any;
    currentMatch?: any;
    isFallback?: boolean;
  }): MatchSeoViewModel {
    const routeSlug = (input.routeSlug || '').trim();
    const sourceSlug = this.getCanonicalSlug(routeSlug, input.matchUrl, input.currentMatch);
    const parsed = this.parseSlug(sourceSlug);
    const matchInfo = input.matchInfo || {};
    const team1 = this.cleanName(matchInfo.team1_name || this.getTeamName(input.currentMatch, 'team1') || (parsed && parsed.team1) || '');
    const team2 = this.cleanName(matchInfo.team2_name || this.getTeamName(input.currentMatch, 'team2') || (parsed && parsed.team2) || '');
    const hasTeams = !!(team1 && team2);
    const isNumericRoute = /^\d+$/.test(routeSlug);
    const isValidSlug = !!(sourceSlug && sourceSlug.indexOf('-vs-') !== -1 && parsed && hasTeams);
    const teams = hasTeams ? `${team1} vs ${team2}` : 'Cricket match';
    const statusLabel = this.getStatusLabel(matchInfo, input.currentMatch);
    const isCompleted = /completed|finished|result/i.test(statusLabel) || /won by|match drawn|match tied/i.test(matchInfo.lastKnownState || matchInfo.resultSummary || '');
    const lifecycle = deriveMatchLifecycleState(statusLabel, matchInfo.lastKnownState || matchInfo.resultSummary || '');
    const requestedPath = this.getRequestedPath(input.requestedPath, routeSlug, sourceSlug);
    const normalizedRoutePath = normalizeMatchRoutePath(requestedPath || input.matchUrl || '');
    const routeSuffix = extractMatchRouteSuffix(requestedPath || input.matchUrl || '');
    const routeIntent = createMatchRouteIntent({
      requestedPath: requestedPath,
      routeSlug: routeSlug,
      normalizedSlug: sourceSlug,
      surface: this.getRouteSurface(routeSuffix, requestedPath, normalizedRoutePath),
      lifecycle: lifecycle,
      suffix: routeSuffix,
      isLegacyAlias: this.isLegacyAlias(routeSuffix),
      isResolvable: isValidSlug && !(input.isFallback && isNumericRoute)
    });
    const canonicalDecision = evaluateMatchCanonicalPolicy(routeIntent);
    const canonicalPath = canonicalDecision.canonicalPath || normalizedRoutePath || requestedPath || '/matches';
    const isIndexable = isValidSlug && canonicalDecision.robots === 'index,follow' && !(input.isFallback && isNumericRoute);
    const title = isIndexable
      ? `${teams}${isCompleted ? ' Match Result & Scorecard' : ' Live Score & Match Updates'}`
      : 'Cricket Match Not Available | Crickzen';
    const series = this.resolveSeries(
      matchInfo.series_name || (input.currentMatch && input.currentMatch.seriesName) || '',
      parsed && parsed.series,
      team1,
      team2
    );
    const breadcrumbSeries = this.getBreadcrumbSeries(series);
    const ogImageUrl = this.host + getOgImageForMatch(sourceSlug || routeSlug || 'match');
    const description = isIndexable
      ? this.buildDescription(teams, series, isCompleted)
      : 'This cricket match page is not currently available. Browse Crickzen for live cricket scores, schedules, results, and scorecards.';
    const canonicalUrl = this.host + canonicalPath;
    const h1 = isIndexable ? `${teams}${isCompleted ? ' Match Result & Scorecard' : ' Live Score Today'}` : 'Cricket match not available';
    const summary = isIndexable
      ? this.buildSummary(teams, series, statusLabel, isCompleted)
      : 'This match could not be resolved to a reliable scorecard yet. Use the match centre to find live scores, upcoming fixtures, and recent cricket results.';

    return {
      canonicalPath,
      canonicalUrl,
      title,
      description,
      ogImageUrl,
      h1,
      robots: isIndexable ? 'index,follow' : 'noindex,follow',
      teams,
      team1: team1 || 'Team A',
      team2: team2 || 'Team B',
      series,
      breadcrumbSeries,
      statusLabel,
      summary,
      isIndexable,
      routeIntent,
      canonicalDecision
    };
  }

  private getRequestedPath(requestedPath: string | undefined, routeSlug: string, sourceSlug: string): string {
    var fromInput = (requestedPath || '').trim();
    if (fromInput) {
      return fromInput;
    }

    return buildBaseMatchCanonicalPath(sourceSlug || routeSlug) || (routeSlug ? '/cric-live/' + routeSlug : '');
  }

  private getRouteSurface(routeSuffix: string | null, requestedPath: string, normalizedRoutePath: string | null): MatchRouteSurface {
    if (!routeSuffix) {
      return 'base';
    }

    switch (routeSuffix) {
      case 'live':
        return 'live';
      case 'commentary':
        return 'commentary';
      case 'scorecard':
      case 'match-scorecard':
        return 'scorecard';
      case 'report':
      case 'match-report':
        return 'report';
      case 'info':
      case 'match-details':
        return 'legacy';
      default:
        return normalizedRoutePath && requestedPath !== normalizedRoutePath ? 'unknown' : 'base';
    }
  }

  private isLegacyAlias(routeSuffix: string | null): boolean {
    return routeSuffix === 'live'
      || routeSuffix === 'scorecard'
      || routeSuffix === 'info'
      || routeSuffix === 'match-scorecard'
      || routeSuffix === 'match-details';
  }

  private getCanonicalSlug(routeSlug: string, matchUrl?: string, currentMatch?: any): string {
    const fromMatchUrl = extractSlugFromUrl(matchUrl || '');
    if (fromMatchUrl) {
      return fromMatchUrl;
    }

    const sourceUrl = currentMatch && (currentMatch.url || currentMatch.matchUrl);
    const fromCurrent = extractSlugFromUrl(sourceUrl || '');
    if (fromCurrent) {
      return fromCurrent;
    }

    const externalKey = currentMatch && currentMatch.externalMatchKey;
    return externalKey || routeSlug || '';
  }

  private parseSlug(slug: string): SlugParts | null {
    if (!slug || slug.indexOf('-vs-') === -1) {
      return null;
    }

    const parts = slug.split('-').filter(Boolean);
    const vsIndex = parts.indexOf('vs');
    if (vsIndex <= 0 || vsIndex >= parts.length - 1) {
      return null;
    }

    const ordinalIndex = parts.findIndex((part, index) => index > vsIndex && /^\d+(st|nd|rd|th)$/i.test(part));
    const team2End = ordinalIndex > vsIndex ? ordinalIndex : Math.min(parts.length, vsIndex + 2);
    const team1 = this.formatTeamTokens(parts.slice(0, vsIndex));
    const team2 = this.formatTeamTokens(parts.slice(vsIndex + 1, team2End));
    const seriesTokens = ordinalIndex > -1 ? parts.slice(ordinalIndex) : parts.slice(team2End);
    const series = this.formatSeriesTokens(seriesTokens);

    return { team1, team2, series };
  }

  private getTeamName(match: any, key: 'team1' | 'team2'): string {
    if (!match) {
      return '';
    }

    const team = match[key];
    if (team && team.name) {
      return team.name;
    }

    return match[`${key}Name`] || '';
  }

  private formatTeamTokens(tokens: string[]): string {
    return tokens
      .filter(Boolean)
      .map(token => token.length <= 3 ? token.toUpperCase() : this.titleCaseToken(token))
      .join('-')
      .replace(/-/g, ' ');
  }

  private formatSeriesTokens(tokens: string[]): string {
    const cleaned = tokens.join('-')
      .replace(/-?match-updates-[a-z0-9]+$/i, '');

    return cleaned
      .split('-')
      .filter(Boolean)
      .map(token => this.formatSeriesToken(token))
      .join(' ');
  }

  private formatSeriesToken(token: string): string {
    if (/^odi$/i.test(token)) {
      return 'ODI';
    }
    if (/^t20i$/i.test(token)) {
      return 'T20I';
    }
    if (/^t20$/i.test(token)) {
      return 'T20';
    }
    if (/^wc$/i.test(token)) {
      return 'WC';
    }
    return this.titleCaseToken(token);
  }

  private titleCaseToken(token: string): string {
    return token ? token.charAt(0).toUpperCase() + token.slice(1).toLowerCase() : '';
  }

  private cleanName(value: string): string {
    return (value || '').replace(/\s+/g, ' ').trim();
  }

  private cleanSeries(value: string): string {
    return this.cleanName(value)
      .replace(/^\d+(st|nd|rd|th)\s+(match|t20i?|odi|test)\s+/i, '')
      .replace(/\bmatch updates\b.*$/i, '')
      .trim();
  }

  private resolveSeries(rawSeries: string, parsedSeries: string | null, team1: string, team2: string): string {
    const cleanedRaw = this.cleanSeries(rawSeries);
    const cleanedParsed = this.cleanSeries(parsedSeries || '');
    const normalizedRaw = cleanedRaw.toLowerCase();
    const containsBothTeams = !!(
      team1
      && team2
      && normalizedRaw.indexOf(team1.toLowerCase()) !== -1
      && normalizedRaw.indexOf(team2.toLowerCase()) !== -1
    );
    const looksLikeScheduleRow = /\b\d{1,2}:\d{2}\s*(am|pm)\b/i.test(cleanedRaw);

    if ((containsBothTeams || looksLikeScheduleRow) && cleanedParsed) {
      return cleanedParsed;
    }

    return cleanedRaw || cleanedParsed;
  }

  private getBreadcrumbSeries(series: string): string {
    return this.cleanName(series).replace(/\s+\d{4}$/i, '').trim() || 'Cricket Series';
  }

  private getStatusLabel(matchInfo: any, currentMatch: any): string {
    const status = (matchInfo && (matchInfo.match_status || matchInfo.status))
      || (currentMatch && currentMatch.status)
      || 'Live';
    return String(status).replace(/_/g, ' ');
  }

  private buildDescription(teams: string, series: string, isCompleted: boolean): string {
    if (isCompleted) {
      return `Get ${teams} match result, final scorecard, innings summary, venue details and updates${series ? ` from ${series}` : ''}.`;
    }

    return `Follow ${teams} live score, scorecard, toss, playing XI, venue and result${series ? ` in ${series}` : ''}.`;
  }

  private buildSummary(teams: string, series: string, statusLabel: string, isCompleted: boolean): string {
    const statusText = isCompleted ? 'match result, final scorecard, and key updates' : 'live score today, scorecard, toss update, playing XI, and match result tracker';
    return `${teams} ${statusText}${series ? ` for ${series}` : ''}. Follow today's cricket match live score, venue context, innings updates, and result on Crickzen.`;
  }
}
