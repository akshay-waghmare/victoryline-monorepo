import { MatchCardViewModel, MatchStatus } from '../features/matches/models/match-card.models';
import { buildCanonicalMatchPath } from '../core/utils/match-utils';

export type MatchFreshnessPageType = 'preview' | 'live-updates' | 'result';

export interface MatchFreshnessLink {
  href: string;
  label: string;
  summary: string;
  type: MatchFreshnessPageType;
}

export function getPrimaryFreshnessLinkForMatch(match: MatchCardViewModel): MatchFreshnessLink | null {
  var links = buildFreshnessLinksFromMatch(match);
  if (!links.length) {
    return null;
  }

  var preferredType = getPrimaryFreshnessType(match && match.status);
  for (var index = 0; index < links.length; index++) {
    if (links[index].type === preferredType) {
      return links[index];
    }
  }

  return links[0] || null;
}

export function buildFreshnessDiscoveryLinksForMatches(
  matches: MatchCardViewModel[],
  limit: number
): MatchFreshnessLink[] {
  var links: MatchFreshnessLink[] = [];
  var seen: { [key: string]: boolean } = {};
  var cappedLimit = Math.max(0, limit || 0);

  (matches || []).forEach(function(match) {
    if (cappedLimit > 0 && links.length >= cappedLimit) {
      return;
    }

    var link = getPrimaryFreshnessLinkForMatch(match);
    if (!link || !link.href || seen[link.href]) {
      return;
    }

    seen[link.href] = true;
    links.push(link);
  });

  return links;
}

export function buildFreshnessPathFromSlug(slug: string, type: MatchFreshnessPageType): string {
  var cleanSlug = String(slug || '').trim().replace(/^\/+|\/+$/g, '');
  if (!cleanSlug) {
    return '/matches';
  }

  switch (type) {
    case 'preview':
      return '/cricket-match-preview/' + cleanSlug;
    case 'live-updates':
      return '/cricket-live-updates/' + cleanSlug;
    default:
      return '/cricket-match-report/' + cleanSlug;
  }
}

export function getPrimaryFreshnessType(status: MatchStatus | string | null | undefined): MatchFreshnessPageType {
  if (status === MatchStatus.COMPLETED || String(status || '').toUpperCase() === 'COMPLETED') {
    return 'result';
  }

  if (status === MatchStatus.UPCOMING || String(status || '').toUpperCase() === 'UPCOMING') {
    return 'preview';
  }

  return 'live-updates';
}

export function buildPrimaryFreshnessPath(match: MatchCardViewModel): string | null {
  var canonicalPath = buildCanonicalMatchPath(match);
  if (!canonicalPath) {
    return null;
  }

  var slug = canonicalPath.replace(/^\/cric-live\//, '');
  return buildFreshnessPathFromSlug(slug, getPrimaryFreshnessType(match && match.status));
}

export function buildFreshnessLinksFromSlug(
  slug: string,
  status: MatchStatus | string | null | undefined,
  team1Label?: string | null,
  team2Label?: string | null
): MatchFreshnessLink[] {
  var cleanSlug = String(slug || '').trim().replace(/^\/cric-live\//, '').replace(/^\/+|\/+$/g, '');
  if (!cleanSlug) {
    return [];
  }

  var shortTeams = buildShortTeamsFromInputs(cleanSlug, team1Label, team2Label);
  var primaryType = getPrimaryFreshnessType(status);
  var orderedTypes: MatchFreshnessPageType[] = [primaryType, 'preview', 'live-updates', 'result']
    .filter(function(type, index, source) {
      return source.indexOf(type) === index;
    }) as MatchFreshnessPageType[];

  return orderedTypes.map(function(type) {
    if (type === 'preview') {
      return {
        href: buildFreshnessPathFromSlug(cleanSlug, 'preview'),
        label: shortTeams + ' preview',
        summary: 'Pitch, venue, toss timing, likely playing XI, and prematch setup.',
        type: 'preview' as MatchFreshnessPageType
      };
    }

    if (type === 'result') {
      return {
        href: buildFreshnessPathFromSlug(cleanSlug, 'result'),
        label: shortTeams + ' result and highlights',
        summary: 'Result summary, full scorecard follow-up, and match recap.',
        type: 'result' as MatchFreshnessPageType
      };
    }

    return {
      href: buildFreshnessPathFromSlug(cleanSlug, 'live-updates'),
      label: shortTeams + ' live updates',
      summary: 'Fresh match-day updates, today-match phrasing, and key live moments.',
      type: 'live-updates' as MatchFreshnessPageType
    };
  });
}

export function buildFreshnessLinksFromMatch(match: MatchCardViewModel): MatchFreshnessLink[] {
  var canonicalPath = buildCanonicalMatchPath(match);
  if (!canonicalPath) {
    return [];
  }

  var slug = canonicalPath.replace(/^\/cric-live\//, '');
  return buildFreshnessLinksFromSlug(slug, match && match.status, getPreferredTeamLabel(match && match.team1), getPreferredTeamLabel(match && match.team2));
}

function buildShortTeams(match: MatchCardViewModel): string {
  var team1 = getPreferredTeamLabel(match && match.team1);
  var team2 = getPreferredTeamLabel(match && match.team2);
  if (team1 && team2) {
    return team1 + ' vs ' + team2;
  }

  var canonicalPath = buildCanonicalMatchPath(match);
  var slug = canonicalPath ? canonicalPath.replace(/^\/cric-live\//, '') : '';
  var parsedFromSlug = parseTeamsFromSlug(slug);
  if (parsedFromSlug) {
    return parsedFromSlug.team1 + ' vs ' + parsedFromSlug.team2;
  }

  team1 = team1 || 'Team 1';
  team2 = team2 || 'Team 2';
  return team1 + ' vs ' + team2;
}

function buildShortTeamsFromInputs(slug: string, team1Label?: string | null, team2Label?: string | null): string {
  var team1 = normalizeTeamLabel(team1Label);
  var team2 = normalizeTeamLabel(team2Label);
  if (team1 && team2 && !isPlaceholderTeamLabel(team1) && !isPlaceholderTeamLabel(team2)) {
    return team1 + ' vs ' + team2;
  }

  var parsedFromSlug = parseTeamsFromSlug(slug);
  if (parsedFromSlug) {
    return parsedFromSlug.team1 + ' vs ' + parsedFromSlug.team2;
  }

  team1 = team1 && !isPlaceholderTeamLabel(team1) ? team1 : 'Team 1';
  team2 = team2 && !isPlaceholderTeamLabel(team2) ? team2 : 'Team 2';
  return team1 + ' vs ' + team2;
}

function getPreferredTeamLabel(team: MatchCardViewModel['team1'] | null | undefined): string {
  if (!team) {
    return '';
  }

  var name = normalizeTeamLabel(team.name);
  if (name && !isPlaceholderTeamLabel(name)) {
    return name;
  }

  var shortName = normalizeTeamLabel(team.shortName);
  if (shortName && !isPlaceholderTeamLabel(shortName)) {
    return shortName;
  }

  return '';
}

function normalizeTeamLabel(value: string | null | undefined): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function isPlaceholderTeamLabel(value: string): boolean {
  return /^(team\s*[12ab]|unknown)$/i.test(value);
}

function parseTeamsFromSlug(slug: string): { team1: string; team2: string } | null {
  if (!slug || slug.indexOf('-vs-') === -1) {
    return null;
  }

  var parts = slug.split('-').filter(Boolean);
  var vsIndex = parts.indexOf('vs');
  if (vsIndex <= 0 || vsIndex >= parts.length - 1) {
    return null;
  }

  var ordinalIndex = parts.findIndex(function(part, index) {
    return index > vsIndex && /^\d+(st|nd|rd|th)$/i.test(part);
  });
  var team2End = ordinalIndex > vsIndex ? ordinalIndex : findFallbackTeam2End(parts, vsIndex);
  var team1 = formatTeamTokens(parts.slice(0, vsIndex));
  var team2 = formatTeamTokens(parts.slice(vsIndex + 1, team2End));

  if (!team1 || !team2) {
    return null;
  }

  return { team1: team1, team2: team2 };
}

function findFallbackTeam2End(parts: string[], vsIndex: number): number {
  var stopTokens: { [key: string]: boolean } = {
    match: true,
    test: true,
    odi: true,
    t20: true,
    t20i: true,
    final: true,
    qualifier: true,
    semi: true,
    semifinal: true
  };

  for (var index = vsIndex + 1; index < parts.length; index++) {
    var token = parts[index].toLowerCase();
    if (/^\d{4}$/.test(token) || stopTokens[token]) {
      return index;
    }
  }

  return Math.min(parts.length, vsIndex + 4);
}

function formatTeamTokens(tokens: string[]): string {
  return tokens
    .filter(Boolean)
    .map(function(token) {
      return token.length <= 3 ? token.toUpperCase() : token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join(' ')
    .trim();
}
