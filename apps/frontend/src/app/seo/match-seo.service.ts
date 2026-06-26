import { Injectable } from '@angular/core';
import { extractMatchRouteSuffix, extractSlugFromUrl, normalizeMatchRoutePath } from '../core/utils/match-utils';
import { buildBaseMatchCanonicalPath, createMatchRouteIntent, deriveMatchLifecycleState, evaluateMatchCanonicalPolicy, MatchLifecycleState, MatchRouteSurface } from './match-canonical-policy';
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
    const team1Short = this.resolveTeamShortName(matchInfo, input.currentMatch, 'team1', team1);
    const team2Short = this.resolveTeamShortName(matchInfo, input.currentMatch, 'team2', team2);
    const hasTeams = !!(team1 && team2);
    const isNumericRoute = /^\d+$/.test(routeSlug);
    const isValidSlug = !!(sourceSlug && sourceSlug.indexOf('-vs-') !== -1 && parsed && hasTeams);
    const teams = hasTeams ? `${team1} vs ${team2}` : 'Cricket match';
    const shortTeams = this.buildShortTeams(team1Short, team2Short, teams);
    const statusLabel = this.getStatusLabel(matchInfo, input.currentMatch);
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
      ? this.buildTitle(teams, shortTeams, lifecycle)
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
      ? this.buildDescription(teams, shortTeams, series, lifecycle)
      : 'This cricket match page is not currently available. Browse Crickzen for live cricket scores, schedules, results, and scorecards.';
    const canonicalUrl = this.host + canonicalPath;
    const h1 = isIndexable ? this.buildH1(teams, shortTeams, lifecycle) : 'Cricket match not available';
    const summary = isIndexable
      ? this.buildSummary(teams, shortTeams, series, lifecycle)
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
      team1Short,
      team2Short,
      shortTeams,
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

  private buildTitle(teams: string, shortTeams: string, lifecycle: MatchLifecycleState): string {
    switch (lifecycle) {
      case 'prematch':
        return this.appendShortTeams(`${teams} Live Score, Match Preview & Playing XI`, shortTeams, 'title');
      case 'postmatch':
        return this.appendShortTeams(`${teams} Match Result & Full Scorecard`, shortTeams, 'title');
      default:
        return this.appendShortTeams(`${teams} Live Score, Commentary & Scorecard`, shortTeams, 'title');
    }
  }

  private buildH1(teams: string, shortTeams: string, lifecycle: MatchLifecycleState): string {
    switch (lifecycle) {
      case 'prematch':
        return this.appendShortTeams(`${teams} Live Score, Preview & Playing XI`, shortTeams, 'h1');
      case 'postmatch':
        return this.appendShortTeams(`${teams} Match Result & Scorecard`, shortTeams, 'h1');
      default:
        return this.appendShortTeams(`${teams} Live Score, Commentary & Scorecard`, shortTeams, 'h1');
    }
  }

  private buildDescription(teams: string, shortTeams: string, series: string, lifecycle: MatchLifecycleState): string {
    switch (lifecycle) {
      case 'prematch':
        return `Track ${teams} live score before start with match preview, toss updates, playing XI, venue details, and fixture context${series ? ` in ${series}` : ''}. ${shortTeams} coverage stays on this canonical match page.`;
      case 'postmatch':
        return `Get ${teams} match result, full scorecard, innings summary, venue details, and key updates${series ? ` from ${series}` : ''}. ${shortTeams} result coverage stays on this canonical match page.`;
      default:
        return `Follow ${teams} live score, ball-by-ball commentary, scorecard, toss, playing XI, venue, and match result${series ? ` in ${series}` : ''}. ${shortTeams} commentary and scorecard stay on this canonical match page.`;
    }
  }

  private buildSummary(teams: string, shortTeams: string, series: string, lifecycle: MatchLifecycleState): string {
    switch (lifecycle) {
      case 'prematch':
        return `${teams} match preview, live score tracker, toss watch, and playing XI updates${series ? ` for ${series}` : ''}. ${shortTeams} start-time, venue, and fixture build-up stay together on Crickzen.`;
      case 'postmatch':
        return `${teams} match result, full scorecard, and innings summary${series ? ` for ${series}` : ''}. ${shortTeams} final result, venue context, and archived score details stay together on Crickzen.`;
      default:
        return `${teams} live score, commentary, and scorecard${series ? ` for ${series}` : ''}. ${shortTeams} innings updates, playing XI context, and match result tracking stay together on Crickzen.`;
    }
  }

  private resolveTeamShortName(matchInfo: any, currentMatch: any, key: 'team1' | 'team2', fullName: string): string {
    var explicit = this.cleanName(
      (matchInfo && (
        matchInfo[key + '_short_name']
        || matchInfo[key + 'ShortName']
        || matchInfo[key + '_short']
        || matchInfo[key + '_abbreviation']
      ))
      || (currentMatch && currentMatch[key] && (
        currentMatch[key].shortName
        || currentMatch[key].short_code
        || currentMatch[key].abbreviation
      ))
      || (currentMatch && currentMatch[key + 'ShortName'])
      || ''
    );

    if (explicit) {
      return this.normalizeShortTeamName(explicit);
    }

    return this.buildShortTeamName(fullName);
  }

  private buildShortTeams(team1Short: string, team2Short: string, teams: string): string {
    if (team1Short && team2Short) {
      return team1Short + ' vs ' + team2Short;
    }

    return teams;
  }

  private buildShortTeamName(fullName: string): string {
    var normalized = this.cleanName(fullName);
    if (!normalized) {
      return '';
    }

    if (this.isLikelyShortTeamName(normalized)) {
      return this.normalizeShortTeamName(normalized);
    }

    var shorthandMap: { [key: string]: string } = {
      'india': 'IND',
      'australia': 'AUS',
      'england': 'ENG',
      'pakistan': 'PAK',
      'south africa': 'SA',
      'new zealand': 'NZ',
      'sri lanka': 'SL',
      'west indies': 'WI',
      'bangladesh': 'BAN',
      'afghanistan': 'AFG',
      'ireland': 'IRE',
      'zimbabwe': 'ZIM',
      'nepal': 'NEP',
      'oman': 'OMA',
      'namibia': 'NAM',
      'thailand': 'THA',
      'uzbekistan': 'UZB',
      'united states of america': 'USA',
      'united states': 'USA'
    };
    var lowered = normalized.toLowerCase();
    if (shorthandMap[lowered]) {
      return shorthandMap[lowered];
    }

    var tokens = normalized.split(/[\s-]+/).filter(Boolean).filter(function(token) {
      return ['and', 'of', 'the'].indexOf(token.toLowerCase()) === -1;
    });

    if (tokens.length > 1) {
      return tokens.slice(0, 4).map(function(token) {
        return token.charAt(0).toUpperCase();
      }).join('');
    }

    return normalized.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase();
  }

  private normalizeShortTeamName(value: string): string {
    return value.replace(/\s+/g, ' ').trim().toUpperCase();
  }

  private isLikelyShortTeamName(value: string): boolean {
    var compact = value.replace(/[\s.-]/g, '');
    return compact.length <= 4 || /^[A-Z0-9\s.-]+$/.test(value);
  }

  private appendShortTeams(base: string, shortTeams: string, target: 'title' | 'h1'): string {
    if (!shortTeams || !base || base.indexOf(shortTeams) !== -1) {
      return base;
    }

    return target === 'title'
      ? base + ' | ' + shortTeams
      : base + ' (' + shortTeams + ')';
  }
}
