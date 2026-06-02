import { Injectable } from '@angular/core';
import { extractSlugFromUrl } from '../core/utils/match-utils';
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
    const isIndexable = isValidSlug && !(input.isFallback && isNumericRoute);
    const teams = hasTeams ? `${team1} vs ${team2}` : 'Cricket match';
    const statusLabel = this.getStatusLabel(matchInfo, input.currentMatch);
    const isCompleted = /completed|finished|result/i.test(statusLabel) || /won by|match drawn|match tied/i.test(matchInfo.lastKnownState || matchInfo.resultSummary || '');
    const suffix = isCompleted ? ' Final Score | Full Scorecard' : ' Live Score Ball by Ball';
    const title = isIndexable ? this.truncateTitle(teams, suffix) : 'Cricket Match Not Available | Crickzen';
    const series = this.cleanSeries(matchInfo.series_name || (input.currentMatch && input.currentMatch.seriesName) || (parsed && parsed.series) || '');
    const ogImageUrl = this.host + getOgImageForMatch(sourceSlug || routeSlug || 'match');
    const description = isIndexable
      ? this.truncateDescription(`${teams} ${isCompleted ? 'final score, result, scorecard, and key match updates' : 'live score, wickets, overs, and ball-by-ball updates'}${series ? ` in ${series}` : ''}.`)
      : 'This cricket match page is not currently available. Browse Crickzen for live cricket scores, schedules, results, and scorecards.';
    const canonicalPath = isIndexable ? `/cric-live/${sourceSlug}` : (routeSlug ? `/cric-live/${routeSlug}` : '/matches');
    const canonicalUrl = this.host + canonicalPath;
    const h1 = isIndexable ? `${teams}${isCompleted ? ' Final Score' : ' Live Score Ball by Ball'}` : 'Cricket match not available';
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
      statusLabel,
      summary,
      isIndexable
    };
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
      .replace(/-?match-updates-[a-z0-9]+$/i, '')
      .replace(/-?[a-z0-9]{3,5}$/i, '');

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
      .replace(/\bmatch updates\b.*$/i, '')
      .replace(/\s+\b[A-Z0-9]{3,5}\b$/i, '')
      .trim();
  }

  private getStatusLabel(matchInfo: any, currentMatch: any): string {
    const status = (matchInfo && (matchInfo.match_status || matchInfo.status))
      || (currentMatch && currentMatch.status)
      || 'Live';
    return String(status).replace(/_/g, ' ');
  }

  private truncateTitle(teams: string, suffix: string): string {
    const full = teams + suffix;
    if (full.length <= 60) {
      return full;
    }

    const maxTeamsLength = Math.max(12, 60 - suffix.length - 3);
    const truncated = teams.substring(0, maxTeamsLength);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 8 ? truncated.substring(0, lastSpace) : truncated).trim() + '...' + suffix;
  }

  private truncateDescription(value: string): string {
    return value.length > 155 ? value.substring(0, 152).trim() + '...' : value;
  }

  private buildSummary(teams: string, series: string, statusLabel: string, isCompleted: boolean): string {
    const statusText = isCompleted ? 'final score and full scorecard' : 'live score and ball-by-ball updates';
    return `${teams} ${statusText}${series ? ` for ${series}` : ''}. Follow latest runs, wickets, overs, innings context, match status, and scorecard updates on Crickzen.`;
  }
}
